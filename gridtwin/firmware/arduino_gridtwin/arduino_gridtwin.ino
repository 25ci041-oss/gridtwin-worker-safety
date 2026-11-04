/**
 * GRIDTWIN — ESP32 Physical Prototype Firmware (Arduino IDE Ready)
 * 
 * Hardware:
 * - ESP32 DevKit Board
 * - 8-Channel Optoisolated Relay Board (Channels 1-5 for T1-T5, Ch 6 reserved)
 * - 5x Tower LEDs with 220Ω series resistors on 5V supply
 * - INA219 High-Side I2C Current & Voltage Sensor
 * 
 * GPIO Mapping:
 * - Tower 1: GPIO 13 -> Relay IN1
 * - Tower 2: GPIO 14 -> Relay IN2
 * - Tower 3: GPIO 25 -> Relay IN3 (Physical Isolation Target)
 * - Tower 4: GPIO 26 -> Relay IN4
 * - Tower 5: GPIO 27 -> Relay IN5
 * - Relay 6: GPIO 32 -> Relay IN6 (Reserved)
 * - INA219 SDA: GPIO 21
 * - INA219 SCL: GPIO 22
 * 
 * Required Libraries (Install via Arduino Library Manager):
 * 1. "PubSubClient" by Nick O'Leary
 * 2. "ArduinoJson" by Benoit Blanchon (v6 or v7)
 * 3. "Adafruit INA219" by Adafruit
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// ══════════════════════════════════════════════════════
// 1. CONFIGURATION — UPDATE YOUR WI-FI & MQTT DETAILS
// ══════════════════════════════════════════════════════

const char* WIFI_SSID       = "YOUR_WIFI_SSID";       // Put your 2.4GHz Wi-Fi name
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";   // Put your Wi-Fi password

// MQTT Broker:
// Option A: If running Mosquitto locally, use your laptop's IP address (e.g. "10.114.239.182")
// Option B: Or use free public broker "broker.hivemq.com" (port 1883)
const char* MQTT_BROKER     = "broker.hivemq.com";    
const int   MQTT_PORT       = 1883;
const char* MQTT_USER       = "";                     // Leave blank if no auth
const char* MQTT_PASS       = "";                     // Leave blank if no auth

const char* DEVICE_ID       = "esp32-gridtwin-001";
const char* FIRMWARE_VER    = "2.3.0-live";

// ══════════════════════════════════════════════════════
// RELAY / LED LOGIC CONFIGURATION
// ══════════════════════════════════════════════════════
// Set this to FALSE (DEFAULT for breadboard prototypes):
//   - Direct LEDs wired to Ground: ESP32 GPIO -> 220Ω Resistor -> LED Anode (+) -> Cathode to GND (HIGH = ON, LOW = OFF)
//   - Active-HIGH Relay Modules (HIGH = Relay Closed, LOW = Relay Open)
//
// Set this to TRUE if your prototype uses:
//   - Optoisolated Relay Module (Active-LOW: LOW = Relay Closed / LED ON, HIGH = Relay Open / LED OFF)
//   - LEDs wired with Anode (+) to 3.3V/5V and Cathode (-) to ESP32 GPIO
//
// Note: You can also toggle this at runtime by sending command "INVERT", "ACTIVE_HIGH", or "ACTIVE_LOW", or typing 'i' in Serial Monitor!
bool RELAY_ACTIVE_LOW = false;

// Pin Definitions
const int PIN_T1            = 13;
const int PIN_T2            = 14;
const int PIN_T3            = 25; // Tower 3 (Physical Isolation Target)
const int PIN_T4            = 26;
const int PIN_T5            = 27;
const int PIN_RELAY6        = 32; // Reserved
const int PIN_I2C_SDA       = 21;
const int PIN_I2C_SCL       = 22;

// ══════════════════════════════════════════════════════
// 2. STATE & OBJECTS
// ══════════════════════════════════════════════════════

struct TowerChannel {
  const char* id;
  int pin;
  bool isEnergized;
  bool isIsolated;
};

TowerChannel towers[5] = {
  {"T1", PIN_T1, true, false},
  {"T2", PIN_T2, true, false},
  {"T3", PIN_T3, true, false},
  {"T4", PIN_T4, true, false},
  {"T5", PIN_T5, true, false}
};

WiFiClient espClient;
PubSubClient mqtt(espClient);
Adafruit_INA219 ina219;
bool hasIna219 = false;

// MQTT Topics
String topicCommands;
String topicAck;
String topicTelemetry;
String topicStatus;

unsigned long lastTelemetryMs = 0;
unsigned long lastHeartbeatMs = 0;
String lastProcessedCommandId = "";

// ══════════════════════════════════════════════════════
// 3. HARDWARE CONTROL FUNCTIONS
// ══════════════════════════════════════════════════════

String normalizeTowerTarget(String tgt) {
  tgt.trim();
  tgt.toUpperCase();
  if (tgt == "ALL" || tgt == "ALL_ON" || tgt == "ALL_OFF") return "ALL";
  if (tgt == "1" || tgt == "T1" || tgt == "SW1" || tgt == "SW-T1" || tgt == "TOWER1" || tgt == "TOWER 1") return "T1";
  if (tgt == "2" || tgt == "T2" || tgt == "SW2" || tgt == "SW-T2" || tgt == "TOWER2" || tgt == "TOWER 2") return "T2";
  if (tgt == "3" || tgt == "T3" || tgt == "SW3" || tgt == "SW-T3" || tgt == "TOWER3" || tgt == "TOWER 3") return "T3";
  if (tgt == "4" || tgt == "T4" || tgt == "SW4" || tgt == "SW-T4" || tgt == "TOWER4" || tgt == "TOWER 4") return "T4";
  if (tgt == "5" || tgt == "T5" || tgt == "SW5" || tgt == "SW-T5" || tgt == "TOWER5" || tgt == "TOWER 5") return "T5";
  return tgt;
}

int findTowerIndex(const char* id) {
  String norm = normalizeTowerTarget(String(id));
  for (int i = 0; i < 5; i++) {
    if (strcmp(towers[i].id, norm.c_str()) == 0) return i;
  }
  return -1;
}

void applyRelayState(int index, bool energize) {
  towers[index].isEnergized = energize;
  int pin = towers[index].pin;

  pinMode(pin, OUTPUT);

  if (RELAY_ACTIVE_LOW) {
    // Active-LOW Relay Board: LOW = ON (Relay energized / LED lit), HIGH = OFF (Relay de-energized / LED dark)
    digitalWrite(pin, energize ? LOW : HIGH);
  } else {
    // Direct LEDs to GND or Active-HIGH Relay: HIGH = ON (3.3V), LOW = OFF (0V)
    digitalWrite(pin, energize ? HIGH : LOW);
  }

  Serial.printf("[RELAY] Tower %s (GPIO %d) -> %s [Pin level: %s]\n", 
    towers[index].id, 
    pin, 
    energize ? "ENERGIZED (ON)" : "DE-ENERGIZED (OFF)",
    (digitalRead(pin) == HIGH) ? "HIGH" : "LOW");
}

void isolateTower(int index) {
  towers[index].isIsolated = true;
  applyRelayState(index, false); // Turn OFF physical relay / LED
  Serial.printf("[ISOLATION] *** TOWER %s ISOLATED! Relay open, LED OFF ***\n", towers[index].id);
}

void restoreTower(int index) {
  towers[index].isIsolated = false;
  applyRelayState(index, true); // Turn ON physical relay / LED
  Serial.printf("[RESTORE] *** TOWER %s RESTORED! Relay closed, LED ON ***\n", towers[index].id);
}

// ══════════════════════════════════════════════════════
// 4. MQTT PUBLISHING HELPERS
// ══════════════════════════════════════════════════════

void publishAck(const char* cmdId, const char* target, const char* action, bool success, const char* state) {
  StaticJsonDocument<512> doc;
  doc["command_id"] = cmdId;
  doc["device_id"] = DEVICE_ID;
  doc["target"] = target;
  doc["action"] = action;
  doc["status"] = success ? "SUCCESS" : "ERROR";
  doc["reported_state"] = state;
  doc["relay_active_low"] = RELAY_ACTIVE_LOW;
  doc["logic_mode"] = RELAY_ACTIVE_LOW ? "ACTIVE_LOW" : "ACTIVE_HIGH";
  doc["timestamp"] = millis();

  JsonObject states = doc.createNestedObject("output_states");
  for (int i = 0; i < 5; i++) {
    if (towers[i].isIsolated) {
      states[towers[i].id] = "ISOLATED";
    } else {
      states[towers[i].id] = towers[i].isEnergized ? "ON" : "OFF";
    }
  }

  char buf[512];
  serializeJson(doc, buf);
  mqtt.publish(topicAck.c_str(), buf, false);
  Serial.printf("[MQTT OUT] ACK published for %s (%s -> %s)\n", cmdId, target, state);
}

void publishTelemetry() {
  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = millis();

  if (hasIna219) {
    float busV = ina219.getBusVoltage_V();
    float shuntMv = ina219.getShuntVoltage_mV();
    float currentMa = ina219.getCurrent_mA();
    float powerMw = ina219.getPower_mW();

    // Prevent negative noise when quiescent
    if (currentMa < 0) currentMa = 0.0;
    if (powerMw < 0) powerMw = 0.0;

    doc["bus_voltage_v"] = round(busV * 100.0) / 100.0;
    doc["shunt_voltage_mv"] = round(shuntMv * 10.0) / 10.0;
    doc["current_ma"] = round(currentMa * 10.0) / 10.0;
    doc["power_mw"] = round(powerMw * 10.0) / 10.0;
    doc["sensor_status"] = "OK";
  } else {
    doc["bus_voltage_v"] = 5.0; // Nominal 5V fallback
    doc["shunt_voltage_mv"] = 0.0;
    doc["current_ma"] = 0.0;
    doc["power_mw"] = 0.0;
    doc["sensor_status"] = "DISCONNECTED";
  }

  char buf[384];
  serializeJson(doc, buf);
  mqtt.publish(topicTelemetry.c_str(), buf, false);
}

void publishStatus() {
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["status"] = "ONLINE";
  doc["firmware_version"] = FIRMWARE_VER;
  doc["ip_address"] = WiFi.localIP().toString();
  doc["uptime_ms"] = millis();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["sensor_connected"] = hasIna219;
  doc["relay_active_low"] = RELAY_ACTIVE_LOW;
  doc["logic_mode"] = RELAY_ACTIVE_LOW ? "ACTIVE_LOW" : "ACTIVE_HIGH";

  JsonObject states = doc.createNestedObject("output_states");
  for (int i = 0; i < 5; i++) {
    states[towers[i].id] = towers[i].isIsolated ? "ISOLATED" : (towers[i].isEnergized ? "ON" : "OFF");
  }

  char buf[512];
  serializeJson(doc, buf);
  mqtt.publish(topicStatus.c_str(), buf, false);
}

// ══════════════════════════════════════════════════════
// 5. MQTT INCOMING COMMAND HANDLER
// ══════════════════════════════════════════════════════

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("[MQTT ERR] Bad JSON payload: %s\n", err.c_str());
    return;
  }

  const char* cmdId = doc["command_id"] | "cmd-live";
  const char* target = "";
  if (doc.containsKey("output_id") && !doc["output_id"].isNull()) {
    target = doc["output_id"];
  } else if (doc.containsKey("target") && !doc["target"].isNull()) {
    target = doc["target"];
  }
  const char* action = doc["action"] | "";
  const char* reqState = doc["requested_state"] | "";

  Serial.printf("\n[MQTT IN] Command: %s | Target: '%s' | Action: '%s' | Req: '%s'\n",
    cmdId, target, action, reqState);

  String actStr = String(action);
  actStr.toUpperCase();
  String reqStr = String(reqState);
  reqStr.toUpperCase();
  String tgtStr = normalizeTowerTarget(String(target));

  // Support runtime logic configuration via MQTT
  if (actStr == "INVERT" || actStr == "TOGGLE_LOGIC" || actStr == "ACTIVE_HIGH" || actStr == "LED_MODE" || actStr == "ACTIVE_LOW" || actStr == "RELAY_MODE") {
    if (actStr == "ACTIVE_HIGH" || actStr == "LED_MODE") {
      RELAY_ACTIVE_LOW = false;
    } else if (actStr == "ACTIVE_LOW" || actStr == "RELAY_MODE") {
      RELAY_ACTIVE_LOW = true;
    } else {
      RELAY_ACTIVE_LOW = !RELAY_ACTIVE_LOW;
    }
    Serial.printf("[CONFIG] Relay/LED logic changed. RELAY_ACTIVE_LOW = %s (%s)\n",
      RELAY_ACTIVE_LOW ? "true" : "false",
      RELAY_ACTIVE_LOW ? "Active-LOW Optocoupled Relay" : "Active-HIGH Direct LEDs (HIGH=ON, LOW=OFF)");
    for (int i = 0; i < 5; i++) {
      applyRelayState(i, !towers[i].isIsolated && towers[i].isEnergized);
    }
    publishAck(cmdId, "ALL", "CONFIG", true, RELAY_ACTIVE_LOW ? "ACTIVE_LOW" : "ACTIVE_HIGH");
    publishStatus();
    return;
  }

  bool isTurnOff = (actStr == "ISOLATE" || actStr == "ALL_OFF" || actStr == "OFF" || actStr == "TRIP" || actStr == "OPEN" ||
                    reqStr == "OFF" || reqStr == "ISOLATED" || reqStr == "OPEN");
  bool isTurnOn  = (actStr == "RESTORE" || actStr == "ALL_ON" || actStr == "ON" || actStr == "CLOSE" || actStr == "CLOSED" ||
                    reqStr == "ON" || reqStr == "RESTORED" || reqStr == "CLOSED");

  // 1. ALL TOWERS BATCH COMMAND
  if (tgtStr == "ALL" || actStr == "ALL_ON" || actStr == "ALL_OFF") {
    if (isTurnOff) {
      Serial.println("[COMMAND] De-energizing (ISOLATING) ALL 5 towers...");
      for (int i = 0; i < 5; i++) {
        isolateTower(i);
      }
      publishAck(cmdId, "ALL", "ALL_OFF", true, "ISOLATED");
    } else {
      Serial.println("[COMMAND] Energizing (NORMALIZING) ALL 5 towers...");
      for (int i = 0; i < 5; i++) {
        restoreTower(i);
      }
      publishAck(cmdId, "ALL", "ALL_ON", true, "ON");
    }
    return;
  }

  // 2. INDIVIDUAL TOWER COMMAND
  int idx = findTowerIndex(tgtStr.c_str());
  if (idx >= 0) {
    if (isTurnOff) {
      isolateTower(idx);
      publishAck(cmdId, towers[idx].id, "ISOLATE", true, "ISOLATED");
    } else {
      restoreTower(idx);
      publishAck(cmdId, towers[idx].id, "RESTORE", true, "ON");
    }
  } else {
    publishAck(cmdId, tgtStr.c_str(), action, false, "INVALID_TOWER");
  }
}

// ══════════════════════════════════════════════════════
// 6. SETUP & LOOP
// ══════════════════════════════════════════════════════

void connectWifi() {
  Serial.printf("[WIFI] Connecting to '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected!");
    Serial.printf("[WIFI] IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Could not connect. Will retry in loop.");
  }
}

void connectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.printf("[MQTT] Connecting to broker %s:%d...\n", MQTT_BROKER, MQTT_PORT);
  String clientId = String(DEVICE_ID) + "-" + String(random(0xffff), HEX);

  // Set LWT (Last Will and Testament) so backend knows if ESP32 disconnects
  String lwtTopic = "gridtwin/devices/" + String(DEVICE_ID) + "/availability";

  if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS, lwtTopic.c_str(), 1, true, "{\"status\":\"offline\"}")) {
    Serial.println("[MQTT] Connected to broker successfully!");
    mqtt.subscribe(topicCommands.c_str(), 1);
    Serial.printf("[MQTT] Subscribed to %s\n", topicCommands.c_str());

    // Publish online availability
    mqtt.publish(lwtTopic.c_str(), "{\"status\":\"online\"}", true);
    publishStatus();
  } else {
    Serial.printf("[MQTT] Connection failed, rc=%d. Will retry.\n", mqtt.state());
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==========================================");
  Serial.println("  GRIDTWIN — ESP32 BENCH HARDWARE CONTROLLER");
  Serial.println("==========================================");

  // STARTUP: Configure relay pins and ENERGIZE all 5 towers so LEDs glow immediately!
  for (int i = 0; i < 5; i++) {
    applyRelayState(i, true);
    towers[i].isIsolated = false;
  }
  pinMode(PIN_RELAY6, OUTPUT);
  digitalWrite(PIN_RELAY6, RELAY_ACTIVE_LOW ? HIGH : LOW);
  Serial.println("[INIT] All 5 tower relays ENERGIZED (LEDs glowing) on startup.");

  // INA219 I2C Init
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  if (ina219.begin(&Wire)) {
    hasIna219 = true;
    Serial.println("[INIT] INA219 Current & Voltage Sensor initialized OK!");
  } else {
    hasIna219 = false;
    Serial.println("[WARN] INA219 Sensor not detected on I2C pins 21/22.");
  }

  // Setup Topics
  topicCommands   = "gridtwin/devices/" + String(DEVICE_ID) + "/commands";
  topicAck        = "gridtwin/devices/" + String(DEVICE_ID) + "/ack";
  topicTelemetry  = "gridtwin/devices/" + String(DEVICE_ID) + "/telemetry";
  topicStatus     = "gridtwin/devices/" + String(DEVICE_ID) + "/status";

  // MQTT Client
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512); // Buffer size for JSON messages

  // Connect
  connectWifi();
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  } else if (!mqtt.connected()) {
    connectMqtt();
  } else {
    mqtt.loop();
  }

  // Serial Monitor Keyboard Commands for Instant Hardware Testing:
  // Type '1'..'5' to toggle tower, 'i' to invert logic, 't' to test cycle all
  if (Serial.available()) {
    char ch = Serial.read();
    if (ch >= '1' && ch <= '5') {
      int idx = ch - '1';
      if (towers[idx].isIsolated) {
        restoreTower(idx);
        publishAck("serial-cmd", towers[idx].id, "RESTORE", true, "ON");
      } else {
        isolateTower(idx);
        publishAck("serial-cmd", towers[idx].id, "ISOLATE", true, "ISOLATED");
      }
      publishStatus();
    } else if (ch == 'i' || ch == 'I') {
      RELAY_ACTIVE_LOW = !RELAY_ACTIVE_LOW;
      Serial.printf("[MANUAL] Toggled RELAY_ACTIVE_LOW = %s\n", RELAY_ACTIVE_LOW ? "TRUE (Active-LOW)" : "FALSE (Active-HIGH)");
      for (int i = 0; i < 5; i++) {
        applyRelayState(i, !towers[i].isIsolated && towers[i].isEnergized);
      }
      publishAck("serial-cmd", "ALL", "CONFIG", true, RELAY_ACTIVE_LOW ? "ACTIVE_LOW" : "ACTIVE_HIGH");
      publishStatus();
    }
    } else if (ch == 't' || ch == 'T') {
      Serial.println("[TEST] Running 5-Tower Sequential Self-Test...");
      for (int i = 0; i < 5; i++) {
        isolateTower(i);
        delay(400);
      }
      for (int i = 0; i < 5; i++) {
        restoreTower(i);
        delay(400);
      }
      Serial.println("[TEST] Self-test complete.");
    }
  }

  unsigned long now = millis();

  // 1. Publish INA219 live telemetry every 1 second
  if (now - lastTelemetryMs >= 1000) {
    lastTelemetryMs = now;
    if (mqtt.connected()) {
      publishTelemetry();
    }
  }

  // 2. Publish device heartbeat every 5 seconds
  if (now - lastHeartbeatMs >= 5000) {
    lastHeartbeatMs = now;
    if (mqtt.connected()) {
      publishStatus();
    }
  }

  delay(10);
}
