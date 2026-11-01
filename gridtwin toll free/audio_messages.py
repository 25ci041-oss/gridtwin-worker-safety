"""GRIDTWIN Toll-Free IVR Service - Multi-Lingual Message Engine

Provides voice text & prompts for:
1. Tamil (தமிழ்)
2. English
3. Hindi (हिंदी)

Handles DTMF prompts, live tower status reporting (isolated/normal, current passing/cut off),
and call navigation.
"""

from typing import Dict, Any

# Multi-lingual voice configurations for Twilio TwiML <Say>
VOICE_CONFIG = {
    "ta": {
        "language": "ta-IN",
        "voice": "Polly.Valluvar", # Fallback default in Twilio will be Google ta-IN
    },
    "en": {
        "language": "en-IN",
        "voice": "Polly.Aditi",
    },
    "hi": {
        "language": "hi-IN",
        "voice": "Polly.Aditi",
    }
}

# Initial Welcome Greeting: asks caller to select language
# 1 for Tamil, 2 for English, 3 for Hindi
WELCOME_PROMPTS = [
    {
        "lang": "ta",
        "text": "கிரிட்த்வின் ஸ்மார்ட் மின் பகிர்மான சேவைக்கு நல்வரவு. தமிழுக்கு ஒன்று அழுத்தவும்.",
    },
    {
        "lang": "en",
        "text": "Welcome to GridTwin Power Distribution Monitoring System. For English, press 2.",
    },
    {
        "lang": "hi",
        "text": "ग्रिडट्विन स्मार्ट विद्युत वितरण सेवा में आपका स्वागत है। हिंदी के लिए तीन दबाएं।",
    }
]

# Prompts after language is selected: Ask for Tower ID (1 to 5)
TOWER_SELECTION_PROMPTS = {
    "ta": (
        "மின் கோபுரத்தின் நேரடி நிலையை அறிய, ஒன்று முதல் ஐந்து வரை உள்ள கோபுர எண்ணை அழுத்தவும்."
    ),
    "en": (
        "Please enter the Tower ID from 1 to 5 to check its current status."
    ),
    "hi": (
        "टावर की लाइव स्थिति जानने के लिए, कृपया एक से पांच तक टावर नंबर दर्ज करें।"
    )
}

# Invalid Tower Selection
INVALID_TOWER_PROMPTS = {
    "ta": (
        "தவறான கோபுர எண். தயவுசெய்து ஒன்று முதல் ஐந்து வரை உள்ள எண்ணை மட்டும் அழுத்தவும்."
    ),
    "en": (
        "Invalid Tower ID. Please enter a valid number from 1 to 5."
    ),
    "hi": (
        "अमान्य टावर नंबर। कृपया एक से पांच के बीच का नंबर ही दर्ज करें।"
    )
}

# Post-status menu options
MENU_OPTIONS_PROMPTS = {
    "ta": (
        "மற்றொரு கோபுரத்தின் நிலையை அறிய, 1-ஐ அழுத்தவும். "
        "மொழியை மாற்ற, 9-ஐ அழுத்தவும். "
        "அழைப்பை முடிக்க விரும்பினால், தயவுசெய்து தொடர்பை துண்டிக்கவும்."
    ),
    "en": (
        "To check another tower, press 1. "
        "To change your language, press 9. "
        "To end this call, please hang up."
    ),
    "hi": (
        "किसी अन्य टावर की स्थिति जानने के लिए 1 दबाएं। "
        "भाषा बदलने के लिए 9 दबाएं। "
        "कॉल समाप्त करने के लिए कृपया फोन काट दें।"
    )
}

# Goodbye Messages
GOODBYE_PROMPTS = {
    "ta": "கிரிட்த்வின் மின் பகிர்மான கண்காணிப்பு சேவையை அழைத்ததற்கு நன்றி. வணக்கம்.",
    "en": "Thank you for calling GridTwin Distribution Monitoring Service. Goodbye.",
    "hi": "ग्रिडट्विन विद्युत वितरण सेवा में कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो।"
}

# Timeout / No input prompts
TIMEOUT_PROMPTS = {
    "ta": "எந்த எண்ணும் தேர்ந்தெடுக்கப்படவில்லை. மீண்டும் முயற்சிக்கவும்.",
    "en": "No input received. Please try again.",
    "hi": "कोई इनपुट प्राप्त नहीं हुआ। कृपया पुनः प्रयास करें।"
}


def build_tower_status_message(tower_data: Dict[str, Any], lang: str = "en") -> str:
    """
    Generate spoken status message in the selected language.
    
    Tells:
    - Tower ID / Name
    - Isolated vs Normal
    - Current passing or power cut off
    - Telemetry current (mA) if available
    """
    tower_num = tower_data.get("tower_number", "1")
    is_isolated = tower_data.get("is_isolated", False)
    current_passing = tower_data.get("current_passing", False)
    current_ma = tower_data.get("current_ma", 0.0)
    voltage_v = tower_data.get("voltage_v", 5.0)

    if lang == "ta":
        if is_isolated or not current_passing:
            return (
                f"எச்சரிக்கை அறிக்கை: கோபுரம் {tower_num} தற்போது தனிமைப்படுத்தப்பட்டுள்ளது. "
                f"இந்த கோபுரத்திற்கான மின் இணைப்பு துண்டிக்கப்பட்டுள்ளது. "
                f"தற்போது இதில் மின்சாரம் பாயவில்லை. "
                f"பாதுகாப்பு அல்லது பராமரிப்பு பணிகளுக்காக மின் இணைப்பு நிறுத்தப்பட்டுள்ளது."
            )
        else:
            current_str = f"{int(current_ma)}" if current_ma > 0 else "இயல்பு"
            return (
                f"கோபுரம் {tower_num} நேரடி நிலை அறிக்கை: "
                f"கோபுரம் {tower_num} தனிமைப்படுத்தப்படவில்லை. "
                f"மின் இணைப்பு சீராக இயங்குகிறது மற்றும் மின்சாரம் பாய்கிறது. "
                f"மின்னோட்டம் {current_str} மில்லி ஆம்பியர்."
            )

    elif lang == "hi":
        if is_isolated or not current_passing:
            return (
                f"चेतावनी रिपोर्ट: टावर {tower_num} वर्तमान में आइसोलेटेड यानी अलग कर दिया गया है। "
                f"विद्युत आपूर्ति काट दी गई है। "
                f"इस टावर से वर्तमान में कोई करंट प्रवाहित नहीं हो रहा है। "
                f"रखरखाव या सुरक्षा के लिए लाइन बंद है।"
            )
        else:
            current_str = f"{int(current_ma)}" if current_ma > 0 else "सामान्य"
            return (
                f"टावर {tower_num} की लाइव स्थिति रिपोर्ट: "
                f"टावर {tower_num} आइसोलेटेड नहीं है। "
                f"टावर सक्रिय है और इसमें सामान्य रूप से करंट पास हो रहा है। "
                f"वर्तमान करंट {current_str} मिलीएम्पीयर है।"
            )

    else:  # Default English
        if is_isolated or not current_passing:
            return (
                f"Status Alert for Tower {tower_num}: Tower {tower_num} is currently ISOLATED. "
                f"Power supply is cut off. "
                f"There is NO current passing through this tower. "
                f"The relay switch is open for fault protection or safety maintenance."
            )
        else:
            current_str = f"{current_ma:.1f}" if current_ma > 0 else "nominal"
            return (
                f"Status Report for Tower {tower_num}: Tower {tower_num} is NOT isolated. "
                f"The tower is active and energized. "
                f"Current is passing normally through the line. "
                f"Operating current is {current_str} milliAmperes at {voltage_v} Volts."
            )

