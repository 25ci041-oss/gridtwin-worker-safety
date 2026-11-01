/**
 * GRIDTWIN ESP32 Firmware - Main Controller
 * 
 * Digital Twin Physical Hardware Integration:
 * - 5x Feeder Tower Relay Branches (T1–T5)
 * - 1x Reserved Relay Branch (Ch 6)
 * - INA219 I2C High-Side Current & Voltage Telemetry
 * - MQTT QoS 1 Bidirectional Command & Acknowledgement Bus
 * - Authoritative Hardware State Synchronization
 * 
 * LOW-VOLTAGE EDUCATIONAL DEMONSTRATION ONLY.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// Try to include local config overrides
#if __has_include("config_local.h")
#include "config_local.h"
#endif

#include "config.h"

// ─── Global Objects ─────────────────────────────────

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Adafruit_INA219 ina219;
bool ina219Connected = false;

// ─── Output State Tracking ──────────────────────────

struct OutputChannel {
    const char* output_id;
    int gpio_pin;
    bool current_state;      // true = ON (energized), false = OFF (de-energized)
    String last_command_id;
    unsigned long last_command_time;
};

OutputChannel outputs[NUM_OUTPUTS] = {
    {"T1", OUTPUT_T1_PIN, false, "", 0},
    {"T2", OUTPUT_T2_PIN, false, "", 0},
    {"T3", OUTPUT_T3_PIN, false, "", 0},
    {"T4", OUTPUT_T4_PIN, false, "", 0},
    {"T5", OUTPUT_T5_PIN, false, "", 0},
};

// ─── Timing Variables ───────────────────────────────

unsigned long lastHeartbeat = 0;
unsigned long lastSensorRead = 0;
unsigned long lastWifiReconnect = 0;
unsigned long lastMqttReconnect = 0;

// ─── MQTT Topic Buffers ─────────────────────────────

char topicStatus[96];
char topicTelemetry[96];
char topicCommands[96];
char topicAck[96];
char topicAvailability[96];

// ─── Function Declarations ──────────────────────────

void setupOutputs();
void setupIna219();
void setupWifi();
void setupMqtt();
void buildTopics();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void reconnectMqtt();
void publishHeartbeat();
void publishTelemetry();
void publishAvailability(const char* status);
void publishAck(const char* command_id, const char* output_id, 
                bool success, const char* reported_state, const char* error_reason);
void handleCommand(JsonDocument& doc);
int findOutputIndex(const char* output_id);
void setRelayHardware(int idx, bool targetState);

// ─── Setup ──────────────────────────────────────────

void setup() {
    Serial.begin(115200);
    delay(500);
    
    Serial.println("\n╔══════════════════════════════════════════════════════╗");
    Serial.println("║         GRIDTWIN ESP32 HARDWARE INTEGRATION          ║");
    Serial.println("║          Firmware v" FIRMWARE_VERSION " (PlatformIO)          ║");
    Serial.println("║       Low-Voltage Educational Laboratory Model       ║");
    Serial.println("╚══════════════════════════════════════════════════════╝");
    Serial.printf("[INIT] Device ID: %s\n", DEVICE_ID);
    Serial.printf("[INIT] Relay Logic: %s\n", RELAY_ACTIVE_LOW ? "Active-LOW (JD-VCC standard)" : "Active-HIGH");

    buildTopics();
    setupOutputs();
    setupIna219();
    setupWifi();
    setupMqtt();
}

// ─── Main Loop ──────────────────────────────────────

void loop() {
    // 1. Maintain WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        if (millis() - lastWifiReconnect > WIFI_RECONNECT_INTERVAL_MS) {
            lastWifiReconnect = millis();
            Serial.println("[WiFi] Lost connection. Reconnecting...");
            WiFi.reconnect();
        }
        return;
    }
    
    // 2. Maintain MQTT connection
    if (!mqttClient.connected()) {
        if (millis() - lastMqttReconnect > MQTT_RECONNECT_INTERVAL_MS) {
            lastMqttReconnect = millis();
            reconnectMqtt();
        }
    } else {
        mqttClient.loop();
    }
    
    // 3. Periodic INA219 Current & Voltage Telemetry (Every 1s)
    if (millis() - lastSensorRead > SENSOR_READ_INTERVAL_MS) {
        lastSensorRead = millis();
        publishTelemetry();
    }

    // 4. Periodic Heartbeat / State Report (Every 10s)
    if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat = millis();
        publishHeartbeat();
    }
    
    // 5. Check Command Timeouts
    unsigned long now = millis();
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        if (outputs[i].last_command_time > 0 && 
            (now - outputs[i].last_command_time) > COMMAND_TIMEOUT_MS) {
            outputs[i].last_command_time = 0;
            outputs[i].last_command_id = "";
        }
    }
}

// ─── Output Setup (Safe Inactive State on Boot) ──────

void setupOutputs() {
    Serial.println("[GPIO] Initializing Relay Control Pins to SAFE OFF state...");
    
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        pinMode(outputs[i].gpio_pin, OUTPUT);
        // Force safe inactive state BEFORE output driver is active
        digitalWrite(outputs[i].gpio_pin, RELAY_STATE_OFF);
        outputs[i].current_state = false;
        Serial.printf("[GPIO] Tower %s -> GPIO %d [OFF / DE-ENERGIZED]\n", 
            outputs[i].output_id, outputs[i].gpio_pin);
    }
    
    // Channel 6: Reserved for Normal-Path / Isolation feature
    pinMode(RELAY_6_PIN, OUTPUT);
    digitalWrite(RELAY_6_PIN, RELAY_STATE_OFF);
    Serial.printf("[GPIO] Relay Ch 6 (Reserved) -> GPIO %d [OFF / DE-ENERGIZED]\n", RELAY_6_PIN);
}

// ─── INA219 Current Sensor Setup ────────────────────

void setupIna219() {
    Serial.printf("[INA219] Initializing I2C bus on SDA=%d, SCL=%d...\n", 
        INA219_SDA_PIN, INA219_SCL_PIN);
    Wire.begin(INA219_SDA_PIN, INA219_SCL_PIN);
    
    if (ina219.begin(&Wire)) {
        ina219Connected = true;
        Serial.println("[INA219] Sensor detected and calibrated (32V, 2A max range)!");
    } else {
        ina219Connected = false;
        Serial.println("[INA219] WARNING: Sensor not detected on I2C address 0x40.");
        Serial.println("[INA219] System will continue; telemetry will flag DISCONNECTED.");
    }
}

// ─── Topic Builder ──────────────────────────────────

void buildTopics() {
    snprintf(topicStatus, sizeof(topicStatus), 
        "gridtwin/devices/%s/status", DEVICE_ID);
    snprintf(topicTelemetry, sizeof(topicTelemetry), 
        "gridtwin/devices/%s/telemetry", DEVICE_ID);
    snprintf(topicCommands, sizeof(topicCommands), 
        "gridtwin/devices/%s/commands", DEVICE_ID);
    snprintf(topicAck, sizeof(topicAck), 
        "gridtwin/devices/%s/ack", DEVICE_ID);
    snprintf(topicAvailability, sizeof(topicAvailability), 
        "gridtwin/devices/%s/availability", DEVICE_ID);
}

// ─── WiFi Setup ─────────────────────────────────────

void setupWifi() {
    Serial.printf("[WiFi] Connecting to SSID: '%s'...", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 25) {
        delay(400);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected! IP: %s, RSSI: %d dBm\n", 
            WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        Serial.println("\n[WiFi] Initial connection failed. Will retry periodically in loop.");
    }
}

// ─── MQTT Setup ─────────────────────────────────────

void setupMqtt() {
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(1536);
    mqttClient.setKeepAlive(30);
}

void reconnectMqtt() {
    Serial.printf("[MQTT] Connecting to broker %s:%d as '%s'...\n", 
        MQTT_BROKER, MQTT_PORT, DEVICE_ID);
    
    // Last Will and Testament: if ESP32 loses power or connection, broker publishes offline
    char lwtPayload[160];
    snprintf(lwtPayload, sizeof(lwtPayload),
        "{\"status\":\"offline\",\"device_id\":\"%s\",\"reason\":\"connection_lost\"}", DEVICE_ID);
    
    bool connected = mqttClient.connect(
        DEVICE_ID,
        MQTT_USERNAME,
        MQTT_PASSWORD_STR,
        topicAvailability,
        1,    // QoS
        true, // retain
        lwtPayload
    );
    
    if (connected) {
        Serial.println("[MQTT] Connected to broker!");
        
        // Subscribe to commands topic with QoS 1
        mqttClient.subscribe(topicCommands, 1);
        Serial.printf("[MQTT] Subscribed to commands: %s\n", topicCommands);
        
        // Publish online availability (retained)
        publishAvailability("online");
        // Immediately publish initial hardware state and telemetry
        publishHeartbeat();
        publishTelemetry();
    } else {
        Serial.printf("[MQTT] Connection failed, state code: %d. Will retry.\n", mqttClient.state());
    }
}

// ─── MQTT Message Dispatcher ────────────────────────

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    
    if (error) {
        Serial.printf("[MQTT] JSON parse error: %s\n", error.c_str());
        return;
    }
    
    Serial.printf("[MQTT] Message arrived on: %s\n", topic);
    
    if (String(topic) == String(topicCommands)) {
        handleCommand(doc);
    }
}

// ─── Command Execution Logic ────────────────────────

void setRelayHardware(int idx, bool targetState) {
    if (idx < 0 || idx >= NUM_OUTPUTS) return;
    
    int pin = outputs[idx].gpio_pin;
    int pinValue = targetState ? RELAY_STATE_ON : RELAY_STATE_OFF;
    digitalWrite(pin, pinValue);
    outputs[idx].current_state = targetState;
    
    Serial.printf("[HARDWARE] %s (GPIO %d) -> %s [Pin Level: %s]\n",
        outputs[idx].output_id,
        pin,
        targetState ? "ON (Energized)" : "OFF (De-energized)",
        pinValue == LOW ? "LOW" : "HIGH");
}

void handleCommand(JsonDocument& doc) {
    const char* command_id = doc["command_id"];
    const char* device_id = doc["device_id"];
    const char* output_id = doc["output_id"];
    const char* requested_state = doc["requested_state"];
    const char* action = doc["action"]; // optional: "ISOLATE", "RESTORE", "ALL_ON", "ALL_OFF"
    
    if (!command_id) {
        Serial.println("[CMD] REJECTED: missing command_id");
        return;
    }
    
    // Verify target device ID (allow empty device_id or matching DEVICE_ID)
    if (device_id && strlen(device_id) > 0 && String(device_id) != String(DEVICE_ID)) {
        Serial.printf("[CMD] Ignored: addressed to '%s', this is '%s'\n", device_id, DEVICE_ID);
        return;
    }

    Serial.printf("[CMD] Processing ID: %s, Action: %s, Target: %s, State: %s\n",
        command_id, action ? action : "SET_STATE", 
        output_id ? output_id : "ALL", 
        requested_state ? requested_state : "N/A");

    // ─── Case 1: ALL-Towers Command (e.g. ALL_ON / ALL_OFF) ───
    if ((output_id && String(output_id) == "ALL") || (action && (String(action) == "ALL_ON" || String(action) == "ALL_OFF"))) {
        bool allTarget = true;
        if (requested_state && String(requested_state) == "OFF") allTarget = false;
        if (action && String(action) == "ALL_OFF") allTarget = false;

        for (int i = 0; i < NUM_OUTPUTS; i++) {
            setRelayHardware(i, allTarget);
            outputs[i].last_command_id = String(command_id);
            outputs[i].last_command_time = millis();
        }

        publishAck(command_id, "ALL", true, allTarget ? "ON" : "OFF", NULL);
        publishHeartbeat();
        return;
    }

    // ─── Case 2: Tower Isolation Command (e.g. "ISOLATE Tower 3") ───
    if (action && String(action) == "ISOLATE") {
        if (!output_id) {
            publishAck(command_id, "UNKNOWN", false, "UNKNOWN", "Missing output_id for ISOLATE");
            return;
        }

        int idx = findOutputIndex(output_id);
        if (idx < 0) {
            publishAck(command_id, output_id, false, "UNKNOWN", "Invalid tower output_id");
            return;
        }

        // Isolate selected tower: turn its relay OFF
        setRelayHardware(idx, false);
        outputs[idx].last_command_id = String(command_id);
        outputs[idx].last_command_time = millis();

        // Other towers maintain their requested states (or stay ON if already ON)
        Serial.printf("[CMD] Tower %s successfully ISOLATED (Relay de-energized).\n", output_id);
        publishAck(command_id, output_id, true, "ISOLATED", NULL);
        publishHeartbeat();
        return;
    }

    // ─── Case 3: Tower Restoration Command ───
    if (action && String(action) == "RESTORE") {
        if (!output_id) {
            publishAck(command_id, "UNKNOWN", false, "UNKNOWN", "Missing output_id for RESTORE");
            return;
        }

        int idx = findOutputIndex(output_id);
        if (idx < 0) {
            publishAck(command_id, output_id, false, "UNKNOWN", "Invalid tower output_id");
            return;
        }

        // Restore tower: turn its relay ON
        setRelayHardware(idx, true);
        outputs[idx].last_command_id = String(command_id);
        outputs[idx].last_command_time = millis();

        Serial.printf("[CMD] Tower %s successfully RESTORED (Relay energized).\n", output_id);
        publishAck(command_id, output_id, true, "ON", NULL);
        publishHeartbeat();
        return;
    }

    // ─── Case 4: Standard Individual Tower ON / OFF ───
    if (!output_id || !requested_state) {
        publishAck(command_id, output_id ? output_id : "UNKNOWN", false, "UNKNOWN", "Missing output_id or requested_state");
        return;
    }

    int idx = findOutputIndex(output_id);
    if (idx < 0) {
        publishAck(command_id, output_id, false, "UNKNOWN", "Output not recognized");
        return;
    }

    // Duplicate command filtering
    if (outputs[idx].last_command_id == String(command_id)) {
        Serial.printf("[CMD] Duplicate command %s ignored; re-acknowledging current state.\n", command_id);
        publishAck(command_id, output_id, true, outputs[idx].current_state ? "ON" : "OFF", NULL);
        return;
    }

    bool target_state;
    if (String(requested_state) == "ON") {
        target_state = true;
    } else if (String(requested_state) == "OFF") {
        target_state = false;
    } else {
        publishAck(command_id, output_id, false, "UNKNOWN", "Invalid requested_state (must be ON or OFF)");
        return;
    }

    // Apply hardware switching
    setRelayHardware(idx, target_state);
    outputs[idx].last_command_id = String(command_id);
    outputs[idx].last_command_time = millis();

    const char* reported = target_state ? "ON" : "OFF";
    publishAck(command_id, output_id, true, reported, NULL);
    publishHeartbeat();
}

// ─── Helper: Find Output by ID ──────────────────────

int findOutputIndex(const char* output_id) {
    if (!output_id) return -1;
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        if (String(outputs[i].output_id) == String(output_id)) {
            return i;
        }
    }
    return -1;
}

// ─── Publish Command Acknowledgement ────────────────

void publishAck(const char* command_id, const char* output_id, 
                bool success, const char* reported_state, const char* error_reason) {
    StaticJsonDocument<512> doc;
    
    doc["schema_version"] = SCHEMA_VERSION;
    doc["command_id"] = command_id;
    doc["device_id"] = DEVICE_ID;
    doc["output_id"] = output_id;
    doc["success"] = success;
    doc["reported_state"] = reported_state;
    doc["timestamp"] = millis();
    
    if (error_reason) {
        doc["error_reason"] = error_reason;
    }

    // Include full snapshot of confirmed output states
    JsonObject states = doc.createNestedObject("output_states");
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        states[outputs[i].output_id] = outputs[i].current_state ? "ON" : "OFF";
    }
    
    char buffer[512];
    serializeJson(doc, buffer, sizeof(buffer));
    
    mqttClient.publish(topicAck, buffer, false);
    Serial.printf("[ACK] Published ACK for %s (%s): %s -> State: %s\n", 
        command_id, output_id, success ? "SUCCESS" : "FAILED", reported_state);
}

// ─── Publish Availability (LWT & Connect) ───────────

void publishAvailability(const char* status) {
    StaticJsonDocument<256> doc;
    doc["status"] = status;
    doc["device_id"] = DEVICE_ID;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["ip_address"] = WiFi.localIP().toString();
    doc["uptime_ms"] = millis();
    doc["wifi_rssi"] = WiFi.RSSI();
    
    char buffer[256];
    serializeJson(doc, buffer, sizeof(buffer));
    
    mqttClient.publish(topicAvailability, buffer, true); // Retained message
    Serial.printf("[AVAIL] Device is %s\n", status);
}

// ─── Publish Heartbeat & State Report ───────────────

void publishHeartbeat() {
    StaticJsonDocument<512> doc;
    doc["device_id"] = DEVICE_ID;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["status"] = "online";
    doc["uptime_ms"] = millis();
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["free_heap"] = ESP.getFreeHeap();
    doc["sensor_connected"] = ina219Connected;
    
    JsonObject states = doc.createNestedObject("output_states");
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        states[outputs[i].output_id] = outputs[i].current_state ? "ON" : "OFF";
    }
    
    char buffer[512];
    serializeJson(doc, buffer, sizeof(buffer));
    
    mqttClient.publish(topicStatus, buffer, false);
}

// ─── Publish INA219 Telemetry ───────────────────────

void publishTelemetry() {
    StaticJsonDocument<512> doc;
    doc["schema_version"] = SCHEMA_VERSION;
    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = millis();
    
    if (ina219Connected) {
        float busVoltage_V = ina219.getBusVoltage_V();
        float shuntVoltage_mV = ina219.getShuntVoltage_mV();
        float current_mA = ina219.getCurrent_mA();
        float power_mW = ina219.getPower_mW();

        // Guard against negative current readings due to sensor offset
        if (current_mA < 0) current_mA = 0.0;
        if (power_mW < 0) power_mW = 0.0;

        doc["sensor_status"] = "OK";
        doc["bus_voltage_v"] = round(busVoltage_V * 100) / 100.0;
        doc["shunt_voltage_mv"] = round(shuntVoltage_mV * 10) / 10.0;
        doc["current_ma"] = round(current_mA * 10) / 10.0;
        doc["power_mw"] = round(power_mW * 10) / 10.0;
    } else {
        doc["sensor_status"] = "DISCONNECTED";
        doc["bus_voltage_v"] = 0.0;
        doc["shunt_voltage_mv"] = 0.0;
        doc["current_ma"] = 0.0;
        doc["power_mw"] = 0.0;
    }

    char buffer[512];
    serializeJson(doc, buffer, sizeof(buffer));
    mqttClient.publish(topicTelemetry, buffer, false);
}
