"""GRIDTWIN Toll-Free IVR Service - Configuration Settings"""
import os
from dotenv import load_dotenv

# Load local .env if present
load_dotenv()

# IVR Server Settings
PORT = int(os.getenv("TOLLFREE_PORT", "5001"))
HOST = os.getenv("TOLLFREE_HOST", "0.0.0.0")

# Toll-Free Phone Number Display (Real Twilio Assigned Number)
TOLL_FREE_NUMBER = os.getenv("TOLL_FREE_NUMBER", "+1 573 859 5176")
TOLL_FREE_E164 = os.getenv("TOLL_FREE_E164", "+15738595176")

# GridTwin Backend Connection
GRIDTWIN_BACKEND_URL = os.getenv("GRIDTWIN_BACKEND_URL")
if not GRIDTWIN_BACKEND_URL:
    # If running on Render, automatically route to the live Render backend service
    if os.getenv("RENDER"):
        GRIDTWIN_BACKEND_URL = "https://gridtwin-backend.onrender.com"
    else:
        GRIDTWIN_BACKEND_URL = "http://localhost:8000"

BACKEND_TIMEOUT_SECONDS = float(os.getenv("BACKEND_TIMEOUT_SECONDS", "3.0"))

# Twilio Credentials (Optional for local testing, required for real phone carrier hookup)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Language codes
LANGUAGES = {
    "1": {"code": "ta", "name": "Tamil", "locale": "ta-IN", "label": "தமிழ்"},
    "2": {"code": "en", "name": "English", "locale": "en-IN", "label": "English"},
    "3": {"code": "hi", "name": "Hindi", "locale": "hi-IN", "label": "हिंदी"},
}

# Tower definitions
TOWERS = {
    "1": {"id": "T1", "name": "Tower 1", "pin": 13, "section": "Section 1", "edge": "E2"},
    "2": {"id": "T2", "name": "Tower 2", "pin": 14, "section": "Section 2", "edge": "E3"},
    "3": {"id": "T3", "name": "Tower 3", "pin": 25, "section": "Section 3", "edge": "E4"},
    "4": {"id": "T4", "name": "Tower 4", "pin": 26, "section": "Section 4", "edge": "E5"},
    "5": {"id": "T5", "name": "Tower 5", "pin": 27, "section": "Section 5", "edge": "E6"},
}

