"""Pre-generate all IVR audio files using Microsoft Azure Neural Voices (edge-tts).

Produces clean, static MP3 files for:
- Combined welcome & per-language welcome
- Tower selection prompts
- Tower status reports (active & isolated for towers 1-5 in Ta, En, Hi)
- Follow-up menus & goodbye prompts
"""

import os
import asyncio
import edge_tts

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "static", "audio")
os.makedirs(OUTPUT_DIR, exist_ok=True)

VOICES = {
    "ta": "ta-IN-PallaviNeural",
    "en": "en-IN-NeerjaNeural",
    "hi": "hi-IN-SwaraNeural",
}

PROMPTS = {
    # 1. Welcome Prompts
    "welcome_all.mp3": (
        "ta",
        "கிரிட்த்வின் ஸ்மார்ட் மின் பகிர்மான சேவைக்கு நல்வரவு. தமிழுக்கு ஒன்று அழுத்தவும். "
        "Welcome to GridTwin Power Distribution Monitoring System. For English, press 2. "
        "ग्रिडट्विन विद्युत वितरण निगरानी सेवा में आपका स्वागत है। हिंदी के लिए तीन दबाएं।"
    ),
    "welcome_ta.mp3": ("ta", "கிரிட்த்வின் ஸ்மார்ட் மின் பகிர்மான சேவைக்கு நல்வரவு. தமிழுக்கு ஒன்று அழுத்தவும்."),
    "welcome_en.mp3": ("en", "Welcome to GridTwin Power Distribution Monitoring System. For English, press 2."),
    "welcome_hi.mp3": ("hi", "ग्रिडट्विन विद्युत वितरण निगरानी सेवा में आपका स्वागत है। हिंदी के लिए तीन दबाएं।"),
    "welcome_timeout.mp3": ("en", "We did not receive any input. Let us try once more."),

    # 2. Tower Selection Prompts
    "prompt_tower_ta.mp3": ("ta", "மின் கோபுரத்தின் நேரடி நிலையை அறிய, ஒன்று முதல் ஐந்து வரை உள்ள கோபுர எண்ணை அழுத்தவும்."),
    "prompt_tower_en.mp3": ("en", "Please enter the Tower ID from 1 to 5 to check its current status."),
    "prompt_tower_hi.mp3": ("hi", "टावर की लाइव स्थिति जानने के लिए, कृपया एक से पांच तक टावर नंबर दर्ज करें."),

    # 3. Invalid Tower Prompts
    "invalid_tower_ta.mp3": ("ta", "தவறான கோபுர எண். தயவுசெய்து ஒன்று முதல் ஐந்து வரை உள்ள எண்ணை மட்டும் அழுத்தவும்."),
    "invalid_tower_en.mp3": ("en", "Invalid Tower ID. Please enter a valid number from 1 to 5."),
    "invalid_tower_hi.mp3": ("hi", "अमान्य टावर नंबर। कृपया एक से पांच के बीच का नंबर ही दर्ज करें।"),

    # 4. Timeout Prompts
    "timeout_ta.mp3": ("ta", "எந்த எண்ணும் தேர்ந்தெடுக்கப்படவில்லை. மீண்டும் முயற்சிக்கவும்."),
    "timeout_en.mp3": ("en", "No input received. Please try again."),
    "timeout_hi.mp3": ("hi", "कोई इनपुट प्राप्त नहीं हुआ। कृपया पुनः प्रयास करें।"),

    # 5. Menu Options
    "menu_ta.mp3": ("ta", "மற்றொரு கோபுரத்தின் நிலையை அறிய, 1-ஐ அழுத்தவும். மொழியை மாற்ற, 9-ஐ அழுத்தவும். அழைப்பை முடிக்க விரும்பினால், தயவுசெய்து தொடர்பை துண்டிக்கவும்."),
    "menu_en.mp3": ("en", "To check another tower, press 1. To change your language, press 9. To end this call, please hang up."),
    "menu_hi.mp3": ("hi", "किसी अन्य टावर की स्थिति जानने के लिए 1 दबाएं। भाषा बदलने के लिए 9 दबाएं। कॉल समाप्त करने के लिए कृपया फोन काट दें।"),

    # 6. Goodbye Prompts
    "goodbye_ta.mp3": ("ta", "கிரிட்த்வின் மின் பகிர்மான கண்காணிப்பு சேவையை அழைத்ததற்கு நன்றி. வணக்கம்."),
    "goodbye_en.mp3": ("en", "Thank you for calling GridTwin Distribution Monitoring Service. Goodbye."),
    "goodbye_hi.mp3": ("hi", "ग्रिडट्विन विद्युत वितरण सेवा में कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो।"),
}

# Add Tower Status Prompts for Towers 1 to 5
for t in range(1, 6):
    # Isolated
    PROMPTS[f"tower_{t}_isolated_ta.mp3"] = (
        "ta",
        f"எச்சரிக்கை அறிக்கை: கோபுரம் {t} தற்போது தனிமைப்படுத்தப்பட்டுள்ளது. "
        f"இந்த கோபுரத்திற்கான மின் இணைப்பு துண்டிக்கப்பட்டுள்ளது மற்றும் மின்சாரம் பாயவில்லை. "
        f"பாதுகாப்பு அல்லது பராமரிப்பு பணிகளுக்காக மின் இணைப்பு நிறுத்தப்பட்டுள்ளது."
    )
    PROMPTS[f"tower_{t}_isolated_en.mp3"] = (
        "en",
        f"Status Alert for Tower {t}: Tower {t} is currently ISOLATED. "
        f"Power supply is cut off. There is NO current passing through this tower. "
        f"The relay switch is open for fault protection or safety maintenance."
    )
    PROMPTS[f"tower_{t}_isolated_hi.mp3"] = (
        "hi",
        f"चेतावनी रिपोर्ट: टावर {t} वर्तमान में आइसोलेटेड यानी अलग कर दिया गया है। "
        f"विद्युत आपूर्ति काट दी गई है और कोई करंट प्रवाहित नहीं हो रहा है। "
        f"रखरखाव या सुरक्षा के लिए लाइन बंद है।"
    )

    # Active / Energized
    PROMPTS[f"tower_{t}_active_ta.mp3"] = (
        "ta",
        f"கோபுரம் {t} நேரடி நிலை அறிக்கை: "
        f"கோபுரம் {t} தனிமைப்படுத்தப்படவில்லை. "
        f"மின் இணைப்பு சீராக இயங்குகிறது மற்றும் மின்சாரம் பாய்கிறது. "
        f"தற்போதைய மின்னோட்டம் 145 மில்லி ஆம்பியர்."
    )
    PROMPTS[f"tower_{t}_active_en.mp3"] = (
        "en",
        f"Status Report for Tower {t}: Tower {t} is NOT isolated. "
        f"The tower is active and energized. Current is passing normally through the line. "
        f"Operating current is 145.0 milliAmperes at 5.0 Volts."
    )
    PROMPTS[f"tower_{t}_active_hi.mp3"] = (
        "hi",
        f"टावर {t} लाइव स्थिति रिपोर्ट: "
        f"टावर {t} आइसोलेटेड नहीं है। "
        f"टावर सक्रिय है और इसमें सामान्य रूप से करंट पास हो रहा है। "
        f"वर्तमान करंट 145 मिलीएम्पीयर है।"
    )


async def generate_file(filename: str, lang: str, text: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return
    voice = VOICES[lang]
    comm = edge_tts.Communicate(text=text, voice=voice, rate="+0%", pitch="+0Hz")
    await comm.save(path)
    print(f"Generated: {filename} ({lang}) - {os.path.getsize(path)} bytes")


async def main():
    print(f"Generating {len(PROMPTS)} IVR audio files in {OUTPUT_DIR}...")
    tasks = []
    for filename, (lang, text) in PROMPTS.items():
        tasks.append(generate_file(filename, lang, text))
    await asyncio.gather(*tasks)
    print("All audio files generated successfully!")


if __name__ == "__main__":
    asyncio.run(main())
