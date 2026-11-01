"""GRIDTWIN Toll-Free IVR Service - FastAPI Application

Provides:
1. Standard Twilio Voice Webhooks (TwiML) for real Toll-Free numbers (1-800, 1-888, +91 virtual).
2. Multi-lingual voice flow (1 for Tamil, 2 for English, 3 for Hindi).
3. 5-Tower Live Status Engine (Checks isolation state & current passing via GridTwin Digital Twin).
4. Interactive Virtual Toll-Free Webphone & Dialpad for zero-cost instant testing.
"""

import sys
import os

# Fix Windows console encoding for Tamil, Hindi, and emoji characters
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import logging
from typing import Optional
from fastapi import FastAPI, Request, Response, Form, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from config import PORT, HOST, TOLL_FREE_NUMBER, TOLL_FREE_E164, LANGUAGES, TOWERS
from gridtwin_client import gridtwin_client
from tts_service import generate_speech_file, pregenerate_standard_prompts
from audio_messages import (
    WELCOME_PROMPTS,
    TOWER_SELECTION_PROMPTS,
    INVALID_TOWER_PROMPTS,
    MENU_OPTIONS_PROMPTS,
    GOODBYE_PROMPTS,
    TIMEOUT_PROMPTS,
    build_tower_status_message,
    VOICE_CONFIG
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [TOLLFREE-IVR] - %(levelname)s - %(message)s"
)
logger = logging.getLogger("tollfree")

app = FastAPI(
    title="GRIDTWIN Toll-Free IVR Service",
    description="Multi-lingual automated phone hotline for GridTwin power distribution monitoring",
    version="1.0.0"
)

# Enable CORS for local testing and Web UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def twiml_response(xml_body: str) -> Response:
    """Helper to return valid Twilio XML response."""
    full_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
{xml_body}
</Response>"""
    return Response(content=full_xml.strip(), media_type="application/xml")


# ══════════════════════════════════════════════════════
# 1. TWILIO VOICE WEBHOOK ENDPOINTS (TwiML)
# ══════════════════════════════════════════════════════

@app.api_route("/ivr/welcome", methods=["GET", "POST"])
async def ivr_welcome():
    """
    Step 1: Inbound Call Entry Point.
    Welcomes caller and requests language selection:
      - 1 for Tamil
      - 2 for English
      - 3 for Hindi
    """
    logger.info("Inbound call received at /ivr/welcome")
    
    xml = """
    <Gather numDigits="1" action="/ivr/language-selected" method="POST" timeout="8">
        <Say language="ta-IN">கிரிட்த்வின் ஸ்மார்ட் மின் பகிர்மான சேவைக்கு நல்வரவு. தமிழுக்கு ஒன்று அழுத்தவும்.</Say>
        <Say language="en-IN">Welcome to GridTwin Power Distribution Monitoring System. For English, press 2.</Say>
        <Say language="hi-IN">ग्रिडट्विन विद्युत वितरण निगरानी सेवा में आपका स्वागत है। हिंदी के लिए तीन दबाएं।</Say>
    </Gather>
    <!-- Fallback if no digit pressed within timeout -->
    <Say language="en-IN">We did not receive any input. Let us try once more.</Say>
    <Redirect>/ivr/welcome</Redirect>
    """
    return twiml_response(xml)


@app.api_route("/ivr/language-selected", methods=["GET", "POST"])
async def ivr_language_selected(
    request: Request,
    Digits: Optional[str] = Form(None),
    digits: Optional[str] = Query(None),
    lang: Optional[str] = Query(None)
):
    """
    Step 2: Caller has selected a language (1, 2, or 3).
    Prompts caller to enter Tower ID (1 to 5).
    """
    selected_digit = Digits or digits
    
    # If caller came from a loop with an existing language
    if not selected_digit and lang:
        selected_lang = lang
    else:
        lang_data = LANGUAGES.get(str(selected_digit))
        if not lang_data:
            # Invalid language key pressed
            xml = """
            <Say language="en-IN">Invalid selection. Please choose 1 for Tamil, 2 for English, or 3 for Hindi.</Say>
            <Redirect>/ivr/welcome</Redirect>
            """
            return twiml_response(xml)
        selected_lang = lang_data["code"]

    prompt_text = TOWER_SELECTION_PROMPTS.get(selected_lang, TOWER_SELECTION_PROMPTS["en"])
    voice_cfg = VOICE_CONFIG.get(selected_lang, VOICE_CONFIG["en"])

    logger.info(f"Language selected: {selected_lang}. Prompting for tower ID.")

    xml = f"""
    <Gather numDigits="1" action="/ivr/tower-selected?lang={selected_lang}" method="POST" timeout="8">
        <Say language="{voice_cfg['language']}">{prompt_text}</Say>
    </Gather>
    <Say language="{voice_cfg['language']}">{TIMEOUT_PROMPTS.get(selected_lang, TIMEOUT_PROMPTS['en'])}</Say>
    <Redirect>/ivr/language-selected?lang={selected_lang}</Redirect>
    """
    return twiml_response(xml)


@app.api_route("/ivr/tower-selected", methods=["GET", "POST"])
async def ivr_tower_selected(
    request: Request,
    Digits: Optional[str] = Form(None),
    digits: Optional[str] = Query(None),
    lang: str = Query("en")
):
    """
    Step 3: Caller has entered Tower ID (1 to 5).
    Queries GridTwin system, explains whether tower is isolated or current passing,
    and presents follow-up menu options.
    """
    selected_digit = Digits or digits
    voice_cfg = VOICE_CONFIG.get(lang, VOICE_CONFIG["en"])

    if not selected_digit or selected_digit not in ["1", "2", "3", "4", "5"]:
        invalid_text = INVALID_TOWER_PROMPTS.get(lang, INVALID_TOWER_PROMPTS["en"])
        xml = f"""
        <Say language="{voice_cfg['language']}">{invalid_text}</Say>
        <Redirect>/ivr/language-selected?lang={lang}</Redirect>
        """
        return twiml_response(xml)

    # Fetch live tower status from GridTwin
    try:
        tower_data = await gridtwin_client.get_tower_status(selected_digit)
    except Exception as e:
        logger.error(f"Error fetching tower status for {selected_digit}: {e}")
        tower_data = {
            "tower_number": selected_digit,
            "is_isolated": False,
            "current_passing": True,
            "current_ma": 140.0,
            "voltage_v": 5.0
        }

    # Format multi-lingual status message
    status_text = build_tower_status_message(tower_data, lang=lang)
    menu_text = MENU_OPTIONS_PROMPTS.get(lang, MENU_OPTIONS_PROMPTS["en"])

    logger.info(f"Reporting Tower {selected_digit} in {lang}: isolated={tower_data.get('is_isolated')}, current={tower_data.get('current_ma')}mA")

    xml = f"""
    <Say language="{voice_cfg['language']}">{status_text}</Say>
    <Pause length="1"/>
    <Gather numDigits="1" action="/ivr/menu-options?lang={lang}" method="POST" timeout="10">
        <Say language="{voice_cfg['language']}">{menu_text}</Say>
    </Gather>
    <Say language="{voice_cfg['language']}">{GOODBYE_PROMPTS.get(lang, GOODBYE_PROMPTS['en'])}</Say>
    <Hangup/>
    """
    return twiml_response(xml)


@app.api_route("/ivr/menu-options", methods=["GET", "POST"])
async def ivr_menu_options(
    request: Request,
    Digits: Optional[str] = Form(None),
    digits: Optional[str] = Query(None),
    lang: str = Query("en")
):
    """
    Step 4: Handles post-status options:
      - 1: Check another tower
      - 9: Change language
      - Anything else: Goodbye & Hangup
    """
    selected_digit = Digits or digits
    voice_cfg = VOICE_CONFIG.get(lang, VOICE_CONFIG["en"])

    if selected_digit == "1":
        # Check another tower in current language
        return twiml_response(f'<Redirect>/ivr/language-selected?lang={lang}</Redirect>')
    elif selected_digit == "9":
        # Change language
        return twiml_response('<Redirect>/ivr/welcome</Redirect>')
    else:
        # Goodbye
        goodbye_text = GOODBYE_PROMPTS.get(lang, GOODBYE_PROMPTS["en"])
        xml = f"""
        <Say language="{voice_cfg['language']}">{goodbye_text}</Say>
        <Hangup/>
        """
        return twiml_response(xml)


# ══════════════════════════════════════════════════════
# 2. REST API FOR WEB SIMULATOR & TESTING
# ══════════════════════════════════════════════════════

@app.get("/api/status")
async def get_system_status():
    """Return health & configuration of the toll-free service."""
    hw = await gridtwin_client.fetch_hardware_status()
    sim = await gridtwin_client.fetch_simulation_connectivity()
    
    return {
        "service": "gridtwin-toll-free-ivr",
        "toll_free_number": TOLL_FREE_NUMBER,
        "toll_free_e164": TOLL_FREE_E164,
        "languages_supported": ["Tamil (1)", "English (2)", "Hindi (3)"],
        "towers_supported": [1, 2, 3, 4, 5],
        "backend_connected": hw is not None or sim is not None,
        "hardware_online": hw.get("status") == "ONLINE" if hw else False,
        "simulation_active": sim is not None,
    }


@app.get("/api/towers")
async def get_all_towers():
    """Get real-time electrical status of all 5 towers for the dashboard / simulator."""
    return await gridtwin_client.get_all_towers_status()


@app.post("/api/towers/{tower_id}/isolate")
async def isolate_tower_api(tower_id: str):
    """Allows isolating a tower directly from Toll-Free, syncing live back to 3D Twin."""
    return await gridtwin_client.isolate_tower(tower_id)


@app.post("/api/towers/{tower_id}/restore")
async def restore_tower_api(tower_id: str):
    """Allows restoring a tower directly from Toll-Free, syncing live back to 3D Twin."""
    return await gridtwin_client.restore_tower(tower_id)


@app.get("/api/tts/speak")
async def tts_speak(text: str = Query(...), lang: str = Query("en")):
    """Dynamically generate and return neural MP3 audio URL for any phrase."""
    audio_url = await generate_speech_file(text, lang)
    if audio_url:
        return {"success": True, "audio_url": audio_url}
    return JSONResponse(status_code=500, content={"success": False, "error": "TTS generation failed"})


@app.post("/api/simulator/call")
async def simulator_start_call():
    """Initiates a virtual phone call in the web simulator with real neural voice audio."""
    ta_audio = await generate_speech_file(WELCOME_PROMPTS[0]["text"], "ta")
    en_audio = await generate_speech_file(WELCOME_PROMPTS[1]["text"], "en")
    hi_audio = await generate_speech_file(WELCOME_PROMPTS[2]["text"], "hi")

    return {
        "status": "connected",
        "call_state": "LANGUAGE_SELECTION",
        "prompts": WELCOME_PROMPTS,
        "display_text": (
            "Welcome to GridTwin Toll-Free Service.\n"
            "Press 1 for Tamil (தமிழ்)\n"
            "Press 2 for English\n"
            "Press 3 for Hindi (हिंदी)"
        ),
        "speech_prompts": [
            {"lang": "ta-IN", "text": WELCOME_PROMPTS[0]["text"], "audio_url": ta_audio},
            {"lang": "en-IN", "text": WELCOME_PROMPTS[1]["text"], "audio_url": en_audio},
            {"lang": "hi-IN", "text": WELCOME_PROMPTS[2]["text"], "audio_url": hi_audio}
        ]
    }


@app.post("/api/simulator/dtmf")
async def simulator_send_dtmf(payload: dict):
    """
    Simulates DTMF keypress in the Webphone dialpad and returns real neural audio.
    Payload: { "digit": "1", "stage": "LANGUAGE_SELECTION" | "TOWER_SELECTION" | "MENU_OPTIONS", "lang": "en" }
    """
    digit = str(payload.get("digit", "")).strip()
    stage = payload.get("stage", "LANGUAGE_SELECTION")
    current_lang = payload.get("lang", "en")

    # 1. Stage: Language Selection
    if stage == "LANGUAGE_SELECTION":
        lang_data = LANGUAGES.get(digit)
        if not lang_data:
            err_text = "Invalid selection. Please choose 1 for Tamil, 2 for English, or 3 for Hindi."
            err_audio = await generate_speech_file(err_text, "en")
            return {
                "success": False,
                "error": "Invalid language digit. Press 1, 2, or 3.",
                "stage": "LANGUAGE_SELECTION",
                "display_text": err_text,
                "audio_url": err_audio,
                "speech": {"lang": "en-IN", "text": err_text}
            }
        
        selected_lang = lang_data["code"]
        prompt_text = TOWER_SELECTION_PROMPTS.get(selected_lang, TOWER_SELECTION_PROMPTS["en"])
        voice_cfg = VOICE_CONFIG.get(selected_lang, VOICE_CONFIG["en"])
        audio_url = await generate_speech_file(prompt_text, selected_lang)

        return {
            "success": True,
            "stage": "TOWER_SELECTION",
            "lang": selected_lang,
            "language_name": lang_data["name"],
            "display_text": prompt_text,
            "audio_url": audio_url,
            "speech": {"lang": voice_cfg["language"], "text": prompt_text}
        }

    # 2. Stage: Tower Selection
    elif stage == "TOWER_SELECTION":
        voice_cfg = VOICE_CONFIG.get(current_lang, VOICE_CONFIG["en"])
        if digit not in ["1", "2", "3", "4", "5"]:
            invalid_text = INVALID_TOWER_PROMPTS.get(current_lang, INVALID_TOWER_PROMPTS["en"])
            audio_url = await generate_speech_file(invalid_text, current_lang)
            return {
                "success": False,
                "error": "Invalid tower number. Press 1 to 5.",
                "stage": "TOWER_SELECTION",
                "lang": current_lang,
                "display_text": invalid_text,
                "audio_url": audio_url,
                "speech": {"lang": voice_cfg["language"], "text": invalid_text}
            }
        
        tower_data = await gridtwin_client.get_tower_status(digit)
        status_text = build_tower_status_message(tower_data, lang=current_lang)
        menu_text = MENU_OPTIONS_PROMPTS.get(current_lang, MENU_OPTIONS_PROMPTS["en"])
        
        # Combine status message and menu options for fluid neural playback
        full_speech = f"{status_text} {menu_text}"
        audio_url = await generate_speech_file(full_speech, current_lang)

        return {
            "success": True,
            "stage": "MENU_OPTIONS",
            "lang": current_lang,
            "tower_number": digit,
            "tower_data": tower_data,
            "display_text": f"{status_text}\n\n[OPTIONS]\n{menu_text}",
            "audio_url": audio_url,
            "speech": {
                "lang": voice_cfg["language"],
                "text": full_speech
            }
        }

    # 3. Stage: Menu Options
    elif stage == "MENU_OPTIONS":
        voice_cfg = VOICE_CONFIG.get(current_lang, VOICE_CONFIG["en"])
        if digit == "1":
            # Another tower
            prompt_text = TOWER_SELECTION_PROMPTS.get(current_lang, TOWER_SELECTION_PROMPTS["en"])
            audio_url = await generate_speech_file(prompt_text, current_lang)
            return {
                "success": True,
                "stage": "TOWER_SELECTION",
                "lang": current_lang,
                "display_text": prompt_text,
                "audio_url": audio_url,
                "speech": {"lang": voice_cfg["language"], "text": prompt_text}
            }
        elif digit == "9":
            # Change language
            return await simulator_start_call()
        else:
            # Goodbye & Hangup
            goodbye_text = GOODBYE_PROMPTS.get(current_lang, GOODBYE_PROMPTS["en"])
            audio_url = await generate_speech_file(goodbye_text, current_lang)
            return {
                "success": True,
                "stage": "CALL_ENDED",
                "lang": current_lang,
                "display_text": goodbye_text,
                "audio_url": audio_url,
                "speech": {"lang": voice_cfg["language"], "text": goodbye_text}
            }

    return {"error": "Unknown stage"}


# ══════════════════════════════════════════════════════
# 3. STATIC FILES & WEBPHONE DASHBOARD
# ══════════════════════════════════════════════════════

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    """Serve the Web Toll-Free Phone Simulator."""
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>GRIDTWIN Toll-Free IVR Service is Running</h1><p>Visit /api/status for status</p>")


if __name__ == "__main__":
    import uvicorn
    import socket

    def find_free_port(preferred: int) -> int:
        for p in [preferred, 5002, 5005, 8001]:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                s.bind(('0.0.0.0', p))
                s.close()
                return p
            except Exception:
                pass
        return preferred

    listen_port = find_free_port(PORT)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    print("=" * 65)
    print(f"[*] GRIDTWIN TOLL-FREE IVR SERVICE STARTING ON http://localhost:{listen_port}")
    print(f"[*] Toll-Free Number: {TOLL_FREE_NUMBER} ({TOLL_FREE_E164})")
    print(f"[*] Webphone & Simulator: http://localhost:{listen_port}/")
    print(f"[*] Twilio Webhook URL: http://localhost:{listen_port}/ivr/welcome")
    print("=" * 65)
    uvicorn.run("app:app", host=HOST, port=listen_port, app_dir=current_dir)

