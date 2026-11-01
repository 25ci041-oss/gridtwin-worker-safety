# 📞 GRIDTWIN 24/7 Automated Toll-Free IVR Service

A multi-lingual automated toll-free helpline for the **GRIDTWIN Digital Twin Power Distribution Monitoring System**.

---

## 🌟 Key Features

- **🌐 Multi-Lingual Support**:
  - `1`: **Tamil (தமிழ்)**
  - `2`: **English**
  - `3`: **Hindi (हिंदी)**
- **⚡ 5-Tower Live Telemetry & Isolation Status**:
  - `1`: Tower 1 (`T1`, GPIO 13)
  - `2`: Tower 2 (`T2`, GPIO 14)
  - `3`: Tower 3 (`T3`, GPIO 25 - Isolation Target)
  - `4`: Tower 4 (`T4`, GPIO 26)
  - `5`: Tower 5 (`T5`, GPIO 27)
- **📢 Real-Time Spoken Status**:
  - Tells whether the selected tower is **ISOLATED** or **NORMAL**.
  - Tells whether **CURRENT IS PASSING** or **POWER IS CUT OFF**.
  - Reads live milliAmperes from the INA219 current sensor when energized.
- **📱 Built-in Webphone Simulator & CLI**:
  - Full browser smartphone dialpad with Web Speech API audio for instant demonstration.
  - Interactive terminal CLI simulator (`simulate_call.py`).
- **🔗 Production Ready for Real Carriers**:
  - 100% compliant with Twilio, Exotel, Plivo, and telecom carriers using standard TwiML webhooks.
- **🛡️ Isolated & Zero Intrusion**:
  - Self-contained inside `gridtwin toll free/`.
  - Zero modifications to your existing `gridtwin/` backend or frontend code.

---

## 🚀 Quick Start (Local Web Simulator)

1. Navigate to the folder:
   ```bash
   cd "gridtwin toll free"
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python app.py
   ```
   *(Or double-click `run_tollfree.bat`)*
4. Open [http://localhost:5001](http://localhost:5001) in your browser and click **"Call Toll-Free"**!

---

## 📖 Complete Setup & Carrier Instructions

For full instructions on connecting a real 1-800 toll-free number via Twilio and configuring ngrok, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.

