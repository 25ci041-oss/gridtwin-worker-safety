# 📞 GRIDTWIN Automated Toll-Free Helpline (IVR) Setup Guide

This guide explains how the Toll-Free IVR system works and **everything you need to do** to test it locally and connect it to a real mobile phone carrier.

---

## 🏗️ 1. How the System Works

```
                     ┌────────────────────────────────────────┐
                     │          CALLER (Mobile/Phone)         │
                     └───────────────────┬────────────────────┘
                                         │ Dials 1800-419-GRID
                                         ▼
                     ┌────────────────────────────────────────┐
                     │     Telecom / Twilio Carrier / IVR     │
                     └───────────────────┬────────────────────┘
                                         │ Webhook HTTP POST
                                         ▼
                     ┌────────────────────────────────────────┐
                     │     GRIDTWIN Toll-Free Webhook Server  │
                     │             (Port 5001)                │
                     └───────────────────┬────────────────────┘
                                         │ Queries live state
                                         ▼
         ┌───────────────────────────────────────────────────────────────┐
         │                    GRIDTWIN DIGITAL TWIN                      │
         │  • ESP32 Hardware Outputs (T1=GPIO13, T2=GPIO14, T3=GPIO25...)│
         │  • INA219 Current & Voltage Sensor (e.g. 145 mA @ 5.0V)      │
         │  • Electrical Connectivity Simulation Engine                  │
         └───────────────────────────────────────────────────────────────┘
```

### Call Flow & DTMF Key Sequence:
1. **Inbound Call Answered**:
   - Spoken prompt in all 3 languages:
     - 🔊 **Tamil**: *"கிரிட்த்வின் ஸ்மார்ட் மின் பகிர்மான சேவைக்கு நல்வரவு. தமிழுக்கு ஒன்று அழுத்தவும்."*
     - 🔊 **English**: *"Welcome to GridTwin Power Distribution Monitoring System. For English, press 2."*
     - 🔊 **Hindi**: *"ग्रिडट्विन विद्युत वितरण निगरानी सेवा में आपका स्वागत है। हिंदी के लिए तीन दबाएं।"*
2. **Language Selection**:
   - Caller presses **1** ➡️ Tamil (தமிழ்)
   - Caller presses **2** ➡️ English
   - Caller presses **3** ➡️ Hindi (हिंदी)
3. **Tower ID Prompt**:
   - In selected language:
     - Tamil: *"மின் கோபுரத்தின் நேரடி நிலையை அறிய 1 முதல் 5 வரை உள்ள கோபுர எண்ணை அழுத்தவும்."*
     - English: *"Please enter the Tower ID from 1 to 5 to check its current status."*
     - Hindi: *"टावर की लाइव स्थिति जानने के लिए कृपया 1 से 5 तक टावर नंबर दर्ज करें।"*
4. **Tower Status & Current Flow Evaluation**:
   - Caller presses a number from **1 to 5**.
   - The IVR queries the live GridTwin backend:
     - **If Active / Energized (Current Passing)**:
       - 🇬🇧 **English**: *"Tower 1 is NOT isolated. The tower is active and energized. Current is passing normally through the line at 145 milliAmperes."*
       - 🇮🇳 **Tamil**: *"கோபுரம் 1 தனிமைப்படுத்தப்படவில்லை. மின் இணைப்பு சீராக இயங்குகிறது மற்றும் மின்சாரம் பாய்கிறது. தற்போதைய மின்னோட்டம் 145 மில்லி ஆம்பியர்."*
       - 🇮🇳 **Hindi**: *"टावर 1 आइसोलेटेड नहीं है। टावर सक्रिय है और इसमें सामान्य रूप से करंट पास हो रहा है। वर्तमान करंट 145 मिलीएम्पीयर है।"*
     - **If Isolated (Cut Off / Maintenance / Fault)**:
       - 🇬🇧 **English**: *"Alert: Tower 3 is currently ISOLATED. Power supply is cut off. There is NO current passing through this tower."*
       - 🇮🇳 **Tamil**: *"எச்சரிக்கை அறிக்கை: கோபுரம் 3 தற்போது தனிமைப்படுத்தப்பட்டுள்ளது. மின் இணைப்பு துண்டிக்கப்பட்டுள்ளது மற்றும் மின்சாரம் பாயவில்லை."*
       - 🇮🇳 **Hindi**: *"चेतावनी रिपोर्ट: टावर 3 वर्तमान में आइसोलेटेड यानी अलग कर दिया गया है। विद्युत आपूर्ति काट दी गई है और कोई करंट प्रवाहित नहीं हो रहा है।"*
5. **Follow-Up Menu**:
   - Caller can press **1** to check another tower.
   - Caller can press **9** to change language.
   - Or hang up to end the call.

---

## 🛠️ 2. What Are the Things You Need to Do?

You can test and run this in **two ways**:
- **Option A (Zero Cost / Instant)**: Run with the included **Webphone Simulator** and **Terminal CLI**. No telecom account needed!
- **Option B (Real Phone Call)**: Connect to a **Twilio Toll-Free or Virtual Phone Number** so anyone can call from an actual mobile phone or landline.

---

### 👉 OPTION A: Instant Local Testing (Web Simulator & CLI)

#### Step 1: Install Requirements
Open PowerShell in the `gridtwin toll free` directory:
```powershell
cd "c:\Users\HP\Desktop\Digital twin 1\gridtwin toll free"
pip install -r requirements.txt
```

#### Step 2: Start the IVR Server
Run:
```powershell
python app.py
```
*(Or simply double-click `run_tollfree.bat`)*

You will see:
```
🚀 GRIDTWIN TOLL-FREE IVR SERVICE STARTING ON http://localhost:5001
📞 Toll-Free Number: 1800-419-GRID
🌐 Webphone & Simulator: http://localhost:5001/
⚡ Twilio Webhook URL: http://localhost:5001/ivr/welcome
```

#### Step 3: Open the Webphone Simulator
1. Open your browser and go to:
   ```
   http://localhost:5001/
   ```
2. Click the green **"Call Toll-Free"** button.
3. You will hear and see the welcome greeting in Tamil, English, and Hindi!
4. Click **1** for Tamil, **2** for English, or **3** for Hindi.
5. Click **1 to 5** to check any tower.
6. The system speaks the real-time isolation & current status aloud through your computer speakers!

#### Step 4: Test in Terminal CLI (Optional)
In another terminal window:
```powershell
python simulate_call.py
```
Follow the prompts in your terminal.

---

### 👉 OPTION B: Connecting a Real Toll-Free Number (Real Mobile Calls)

If you want people to call a real toll-free number (e.g. `1-800-xxx-xxxx`) from their mobile phones:

#### Step 1: Get a Twilio Account
1. Go to [twilio.com](https://www.twilio.com) and create a free trial account.
2. Go to **Phone Numbers ➡️ Manage ➡️ Buy a number**.
3. Select **Toll-Free** (e.g., `+1 800`, `+1 888`) or an Indian virtual mobile number (+91).
4. Purchase the number (free with trial balance).

#### Step 2: Expose Your Local Server to the Internet
Since your server runs on `localhost:5001`, Twilio needs a public URL to send the call webhook to. Use **ngrok**:
1. Download ngrok from [ngrok.com](https://ngrok.com) (or `winget install ngrok`).
2. Run:
   ```bash
   ngrok http 5001
   ```
3. Copy the Forwarding URL, for example:
   `https://a1b2-your-domain.ngrok-free.app`

#### Step 3: Configure Twilio Webhook
1. Go to the **Twilio Console ➡️ Active Numbers**.
2. Click on your Toll-Free Phone Number.
3. Scroll down to the **Voice Configuration** section:
   - Under **"A CALL COMES IN"**:
     - Select: **Webhook**
     - URL: `https://a1b2-your-domain.ngrok-free.app/ivr/welcome`
     - Method: **HTTP POST**
4. Click **Save Configuration**.

#### Step 4: Make a Call!
1. Pick up your mobile phone and dial the number!
2. You will hear the IVR greeting asking you to press 1 for Tamil, 2 for English, or 3 for Hindi.
3. Press a digit on your phone keypad.
4. Press 1 to 5 for any tower.
5. You will hear the status spoken directly to you on your phone!

---

## ⚡ 3. Testing Tower Isolation with Your Hardware/Backend

To test how the voice changes when a tower is isolated:

1. **Start the GridTwin Backend** (if not already running):
   ```powershell
   cd "c:\Users\HP\Desktop\Digital twin 1\gridtwin\backend"
   python -m uvicorn app.main:app --reload --port 8000
   ```
2. **Isolate Tower 3** using curl or the GridTwin dashboard:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8000/api/v1/hardware/isolate/T3" -Method POST
   ```
   *(This opens relay 3 on GPIO 25 on your ESP32)*
3. **Call the Toll-Free number** (or web simulator):
   - Choose your language (1, 2, or 3).
   - Press **3** for Tower 3.
   - The IVR will announce that **Tower 3 is ISOLATED and NO current is passing**!
4. **Restore Tower 3**:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8000/api/v1/hardware/restore/T3" -Method POST
   ```
5. Call again and press **3** ➡️ The IVR announces **Tower 3 is NOT isolated and current is passing normally**!

---

## 📁 4. Files Overview in `gridtwin toll free/`

- `app.py`: FastAPI server handling Twilio TwiML webhooks and simulator REST APIs.
- `gridtwin_client.py`: Connects to GridTwin backend hardware and simulation endpoints.
- `audio_messages.py`: Voice prompt dictionary for Tamil, English, and Hindi.
- `simulate_call.py`: Interactive CLI phone simulator.
- `static/index.html`: Webphone & dialpad interface.
- `static/style.css`: Glassmorphism responsive styling.
- `static/app.js`: Dialpad DTMF & Web Speech synthesis engine.
- `config.py`: Environment configuration and port settings.
- `run_tollfree.bat`: One-click startup script.

