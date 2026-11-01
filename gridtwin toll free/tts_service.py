"""GRIDTWIN Neural Text-To-Speech (TTS) Service

Generates ultra-realistic, crystal-clear human voice audio using Microsoft Azure
Neural Voices (edge-tts). Zero API key required, 100% free studio quality.

Voices used:
- Tamil:   ta-IN-PallaviNeural (Clear, natural Tamil pronunciation)
- Hindi:   hi-IN-SwaraNeural   (Clear, expressive Hindi pronunciation)
- English: en-IN-NeerjaNeural  (Professional Indian English pronunciation)
"""

import os
import hashlib
import asyncio
import logging
from typing import Optional

logger = logging.getLogger("tollfree.tts")

# Selected Neural Voices for clear, natural speech
NEURAL_VOICES = {
    "ta": "ta-IN-PallaviNeural",
    "ta-IN": "ta-IN-PallaviNeural",
    "hi": "hi-IN-SwaraNeural",
    "hi-IN": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
    "en-IN": "en-IN-NeerjaNeural",
    "en-US": "en-US-JennyNeural"
}

# Directory to cache generated mp3 files
AUDIO_CACHE_DIR = os.path.join(os.path.dirname(__file__), "static", "audio_cache")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)


def get_audio_filename(text: str, voice: str) -> str:
    """Generate deterministic filename based on content and voice."""
    key = f"{voice}::{text}".encode("utf-8")
    h = hashlib.md5(key).hexdigest()
    return f"{h}.mp3"


async def generate_speech_file(text: str, lang: str = "en", voice_override: Optional[str] = None) -> Optional[str]:
    """
    Generate or retrieve cached MP3 file for the given text and language.
    Returns the relative URL path to the static audio file e.g. '/static/audio_cache/xxxx.mp3'.
    """
    if not text or not text.strip():
        return None

    voice = voice_override or NEURAL_VOICES.get(lang, NEURAL_VOICES["en"])
    filename = get_audio_filename(text.strip(), voice)
    filepath = os.path.join(AUDIO_CACHE_DIR, filename)

    # Return cached file if already generated
    if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
        return f"/static/audio_cache/{filename}"

    # Generate new neural audio file using edge-tts
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text=text.strip(), voice=voice, rate="+0%", pitch="+0Hz")
        await communicate.save(filepath)
        logger.info(f"Generated real neural voice audio: {filename} ({voice})")
        return f"/static/audio_cache/{filename}"
    except Exception as e:
        logger.error(f"Failed to generate neural speech with edge-tts: {e}")
        return None


async def pregenerate_standard_prompts():
    """Pre-generate common greetings so call answers have zero audio latency."""
    logger.info("Pre-generating standard neural voice prompts...")
    from audio_messages import WELCOME_PROMPTS, TOWER_SELECTION_PROMPTS, MENU_OPTIONS_PROMPTS, GOODBYE_PROMPTS

    # 1. Welcome Prompts
    for p in WELCOME_PROMPTS:
        await generate_speech_file(p["text"], lang=p["lang"])

    # 2. Tower Selection Prompts
    for lang, txt in TOWER_SELECTION_PROMPTS.items():
        await generate_speech_file(txt, lang=lang)

    # 3. Menu Options
    for lang, txt in MENU_OPTIONS_PROMPTS.items():
        await generate_speech_file(txt, lang=lang)

    # 4. Goodbye
    for lang, txt in GOODBYE_PROMPTS.items():
        await generate_speech_file(txt, lang=lang)

    logger.info("Neural voice prompts pre-generated successfully.")

