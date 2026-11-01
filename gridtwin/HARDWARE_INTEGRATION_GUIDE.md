# GridTwin — Physical Hardware & Digital Twin Integration Guide

This guide documents the complete integration between the **GridTwin** digital twin web platform and your physical educational demonstration bench prototype.

---

## 1. System Architecture

The GridTwin platform implements a bidirectional, authoritative hardware-in-the-loop state model. Virtual twin states update **only upon physical acknowledgement (ACK)** from the ESP32 controller.

```mermaid
graph TD
    UI["GridTwin Web Twin (React 19 + Three.js)"]
    WS["WebSocket / REST API Bridge (/ws, /api/v1/hardware)"]
    BE["FastAPI Backend (Central Authoritative State Model)"]
    MQTT["MQTT Broker (Mosquitto / HiveMQ on Port 1883)"]
    ESP["ESP32 DevKit Controller (FreeRTOS Firmware)"]
    RELAY["8-Channel Optoisolated Relay Board"]
    INA["INA219 I2C Current/Voltage Sensor (GPIO 21 SDA, 22 SCL)"]
    LEDS["5-Tower Physical LEDs (T1, T2, T3, T4, T5)"]
    PSU1["5V Relay Coil Power Supply"]
    PSU2["12V LED Array Power Supply (Isolated Positive Rail)"]

    UI <-->|Bidirectional Live Telemetry & Control| WS
    WS <--> BE
    BE <-->|gridtwin/devices/+/commands & ack| MQTT
    MQTT <-->|Wi-Fi QoS 1 Pub/Sub| ESP
    ESP -->|Active-LOW GPIO Trigger (13,14,25,26,27)| RELAY
    ESP <-->|I2C Telemetry @ 1Hz| INA
    PSU2 -->|Positive 12V Rail in Series| INA
    INA -->|Monitored Positive Supply| RELAY
    RELAY -->|Switched NO Contacts (with 680Ω Series Resistors)| LEDS
    LEDS -->|Common Ground Return| PSU2
    PSU1 -->|Coil VCC & GND| RELAY
```

---

## 2. Verified Hardware GPIO Mapping

| Grid Entity | Tower / Function | ESP32 GPIO | Relay Board Terminal | Relay Logic | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tower 1** | Residential Sector | **GPIO 13** | IN1 (Channel 1) | Active-LOW (LOW=ON) | Controls Tower 1 LED branch |
| **Tower 2** | Commercial Sector | **GPIO 14** | IN2 (Channel 2) | Active-LOW (LOW=ON) | Controls Tower 2 LED branch |
| **Tower 3** | Metropolitan Hospital | **GPIO 25** | IN3 (Channel 3) | Active-LOW (LOW=ON) | Controls Tower 3 LED branch (Isolation target) |
| **Tower 4** | Industrial Sector | **GPIO 26** | IN4 (Channel 4) | Active-LOW (LOW=ON) | Controls Tower 4 LED branch |
| **Tower 5** | Renewable Microgrid | **GPIO 27** | IN5 (Channel 5) | Active-LOW (LOW=ON) | Controls Tower 5 LED branch |
| **Channel 6**| Reserved Bypass/Path | **GPIO 32** | IN6 (Channel 6) | Active-LOW | Reserved for normal-path / bypass lockout |
| **Channel 7**| Unused | N/A | IN7 | Disabled | Channel kept inactive |
| **Channel 8**| Unused | N/A | IN8 | Disabled | Channel kept inactive |
| **INA219** | I2C Data Line (SDA)| **GPIO 21** | INA219 SDA | Open-drain (Pullup)| Shared bus current/voltage sensing |
| **INA219** | I2C Clock Line (SCL)| **GPIO 22** | INA219 SCL | Open-drain (Pullup)| Shared bus current/voltage sensing |

---

## 3. Verified Wiring Diagram & Electrical Connections

> [!CAUTION]
> **Electrical Isolation Rule**: Never connect the 12V LED supply rail to ESP32 GPIOs, 3.3V, or 5V logic inputs! The relay contacts provide galvanic isolation between the low-voltage ESP32 logic and the 12V LED load.

### A. ESP32 to Relay Board Logic
* ESP32 **GND** $\rightarrow$ Relay Board **GND** (Logic Ground reference)
* ESP32 **VIN / 5V** (or 3.3V) $\rightarrow$ Relay Board **VCC** (Logic optocoupler supply)
* ESP32 **GPIO 13** $\rightarrow$ Relay Board **IN1**
* ESP32 **GPIO 14** $\rightarrow$ Relay Board **IN2**
* ESP32 **GPIO 25** $\rightarrow$ Relay Board **IN3**
* ESP32 **GPIO 26** $\rightarrow$ Relay Board **IN4**
* ESP32 **GPIO 27** $\rightarrow$ Relay Board **IN5**
* ESP32 **GPIO 32** $\rightarrow$ Relay Board **IN6** (Reserved)

### B. Relay Board Power Configuration (JD-VCC / VCC / VR Jumper)
* **Standard Optoisolated 8-Channel Relay Module**:
  * The board has a 3-pin jumper block labelled **VCC - JD-VCC (or VR) - GND**.
  * **Option 1 (Common 5V Supply)**: Leave the jumper on **VCC and JD-VCC/VR**. Connect external 5V to VCC and GND.
  * **Option 2 (Total Optoisolation - Recommended)**: Remove the jumper. Connect external 5V supply to **JD-VCC/VR** and **GND** (powers the coil electromagnets). Connect ESP32 **3.3V** to **VCC** and ESP32 **GND** to board **GND** (powers only the optocoupler LEDs). This eliminates inductive flyback transients from resetting the ESP32.

### C. INA219 I2C Current Sensor Wiring (5V Single Adapter System)
* INA219 **VCC** $\rightarrow$ ESP32 **3V3** (3.3V DC logic power)
* INA219 **GND** $\rightarrow$ ESP32 **GND**
* INA219 **SDA** $\rightarrow$ ESP32 **GPIO 21**
* INA219 **SCL** $\rightarrow$ ESP32 **GPIO 22**
* **Current Sensing on 5V Positive Rail**:
  * 5V Adapter **Positive (+) Rail** $\rightarrow$ INA219 **VIN+**
  * INA219 **VIN−** $\rightarrow$ Common **COM** bus of Relays 1 through 5
  * 5V Adapter **Negative (−) Return** $\rightarrow$ Common Ground (ESP32 GND, Relay GND, and LED Cathodes)

### D. Relays to 5-Tower Physical LEDs Circuit (5V System)
* Connect **COM** terminals of Relay Channels 1, 2, 3, 4, 5 in parallel to INA219 **VIN−**.
* Relay 1 **NO (Normally Open)** $\rightarrow$ Resistor $R_1$ ($220\,\Omega$) $\rightarrow$ Tower 1 LED Anode (+)
* Relay 2 **NO (Normally Open)** $\rightarrow$ Resistor $R_2$ ($220\,\Omega$) $\rightarrow$ Tower 2 LED Anode (+)
* Relay 3 **NO (Normally Open)** $\rightarrow$ Resistor $R_3$ ($220\,\Omega$) $\rightarrow$ Tower 3 LED Anode (+)
* Relay 4 **NO (Normally Open)** $\rightarrow$ Resistor $R_4$ ($220\,\Omega$) $\rightarrow$ Tower 4 LED Anode (+)
* Relay 5 **NO (Normally Open)** $\rightarrow$ Resistor $R_5$ ($220\,\Omega$) $\rightarrow$ Tower 5 LED Anode (+)
* Connect all 5 LED Cathodes (−) together to the **5V Adapter Negative Return (Common GND)**.

---

## 4. Electrical Calculations for 5V Single Adapter Supply

> [!TIP]
> **5V Adapter Setup — 220Ω Resistors Are Safe & Ideal!**
>
> When running the entire bench on a single 5V adapter ($V_{\text{in}} = 5.0\,\text{V}$):
> With standard LED forward voltage $V_F \approx 2.0\,\text{V}$ (Red/Yellow/Green):
> $$V_R = 5.0\,\text{V} - 2.0\,\text{V} = 3.0\,\text{V}$$
> Using standard **$220\,\Omega$ resistors**:
> $$I = \frac{3.0\,\text{V}}{220\,\Omega} \approx 13.6\,\text{mA}$$
> $$P_R = (3.0\,\text{V})(0.0136\,\text{A}) \approx 41\,\text{mW}\quad (0.041\,\text{W})$$
>
> * **13.6 mA** is well within the 20 mA continuous rating of standard LEDs.
> * **41 mW** is far below standard 0.25W resistor limits, meaning resistors remain cool.
> * **Total Current**: All 5 LEDs ON draw $\approx 5 \times 13.6\,\text{mA} = 68\,\text{mA}$, easily measured by the INA219 sensor.

---

## 5. ESP32 Firmware Configuration & Flashing

The firmware is located in `gridtwin/firmware/esp32_gridtwin`.

### Step 1: Configure Local Credentials
Copy the credentials template:
```bash
cd "gridtwin/firmware/esp32_gridtwin/include"
cp config_local.h.example config_local.h
```
Edit `config_local.h` with your Wi-Fi SSID, Password, and MQTT broker IP:
```cpp
#pragma once

#define WIFI_SSID           "YOUR_WIFI_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"

#define MQTT_BROKER_HOST    "192.168.1.100"  // IP of laptop running backend & broker
#define MQTT_BROKER_PORT    1883
#define MQTT_USERNAME       ""
#define MQTT_PASSWORD       ""
```

### Step 2: Build & Flash via PlatformIO
Connect your ESP32 to your computer via USB:
```bash
cd "gridtwin/firmware/esp32_gridtwin"
pio run --target upload
```

To monitor real-time serial logs:
```bash
pio device monitor --baud 115200
```

---

## 6. Backend & Frontend Launch Guide

### Step 1: Install Backend Dependencies & Start FastAPI
```bash
cd "gridtwin/backend"
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Start Frontend
```bash
cd "gridtwin/frontend"
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 7. Step-by-Step Hackathon Demonstration Test

### Acceptance Test: "Isolate Tower 3"
1. In the GridTwin website, click **All Towers ON**.
   * The backend dispatches `ALL_ON` over MQTT.
   * Relays 1–5 switch ON (indicator LEDs light up).
   * Physical LEDs 1–5 illuminate on the bench model.
   * INA219 current sensor reads $\approx 75\,\text{mA}$ total load.
   * The website 3D model shows all 5 towers energized in glowing cyan.
2. In the 3D twin, SLD, or Hardware Bridge Panel, click **Isolate Tower 3**.
   * Web UI marks Tower 3 as **PENDING ESP32 ACK...** (amber pulsing beacon).
   * Backend issues unique command UUID: `action: "ISOLATE", target: "T3"`.
   * ESP32 de-energizes **GPIO 25 (Relay IN3)** to `HIGH` (active-LOW OFF).
   * **Physical Result**: Relay 3 clicks open; Tower 3's LED turns OFF.
   * **Towers 1, 2, 4, 5 LEDs remain fully illuminated**.
   * INA219 current reading drops by $\approx 15\,\text{mA}$ (from $\approx 75\,\text{mA}$ to $\approx 60\,\text{mA}$).
   * ESP32 returns MQTT ACK: `status: "SUCCESS", target: "T3", action: "ISOLATE"`.
   * Web UI receives ACK: Tower 3 transitions to glowing orange **ISOLATED** status.
3. Click **Restore Tower 3**.
   * ESP32 energizes GPIO 25.
   * Relay 3 closes; Tower 3 LED illuminates.
   * 3D twin restores Tower 3 to nominal energized state.
