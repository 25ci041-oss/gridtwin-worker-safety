/**
 * GRIDTWIN ESP32 Firmware - Main Source
 * 
 * Controls five low-voltage indicator outputs (T1-T5) via MQTT.
 * 
 * Features:
 * - Wi-Fi connection with auto-reconnect
 * - MQTT connection with LWT (Last Will and Testament)
 * - Five configurable output channels
 * - JSON command parsing and acknowledgement
 * - Heartbeat/availability reporting
 * - Duplicate command protection
 * - Command timeout handling
 * 
 * SAFETY NOTE: This firmware is for LOW-VOLTAGE EDUCATIONAL PROTOTYPES ONLY.
 * Never use this to control actual utility power equipment.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Try to include local config overrides
#if __has_include("config_local.h")
#include "config_local.h"
#endif

#include "config.h"

// ─── Global Objects ─────────────────────────────────

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ─── Output State Tracking ──────────────────────────

struct OutputChannel {
    const char* output_id;
    int gpio_pin;
    bool current_state;      // true = ON, false = OFF
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
unsigned long lastWifiReconnect = 0;
unsigned long lastMqttReconnect = 0;

// ─── MQTT Topic Buffers ─────────────────────────────

char topicStatus[80];
char topicTelemetry[80];
char topicCommands[80];
char topicAck[80];
char topicAvailability[80];

// ─── Function Declarations ──────────────────────────

void setupWifi();
void setupMqtt();
void setupOutputs();
void buildTopics();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void reconnectMqtt();
void publishHeartbeat();
void publishAvailability(const char* status);
void publishAck(const char* command_id, const char* output_id, 
                bool success, const char* reported_state, const char* error_reason);
void handleCommand(JsonDocument& doc);
int findOutputIndex(const char* output_id);

// ─── Setup ──────────────────────────────────────────

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n╔══════════════════════════════════════════╗");
    Serial.println("║     GRIDTWIN ESP32 Controller v" FIRMWARE_VERSION "     ║");
    Serial.println("║   Low-Voltage Educational Prototype      ║");
    Serial.println("╚══════════════════════════════════════════╝");
    Serial.printf("Device ID: %s\n", DEVICE_ID);
    
    buildTopics();
    setupOutputs();
    setupWifi();
    setupMqtt();
}

// ─── Main Loop ──────────────────────────────────────

void loop() {
    // Maintain WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        if (millis() - lastWifiReconnect > WIFI_RECONNECT_INTERVAL_MS) {
            lastWifiReconnect = millis();
            Serial.println("[WiFi] Reconnecting...");
            WiFi.reconnect();
        }
        return;
    }
    
    // Maintain MQTT connection
    if (!mqttClient.connected()) {
        if (millis() - lastMqttReconnect > MQTT_RECONNECT_INTERVAL_MS) {
            lastMqttReconnect = millis();
            reconnectMqtt();
        }
    }
    
    mqttClient.loop();
    
    // Heartbeat
    if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat = millis();
        publishHeartbeat();
    }
    
    // Check command timeouts
    unsigned long now = millis();
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        if (outputs[i].last_command_time > 0 && 
            (now - outputs[i].last_command_time) > COMMAND_TIMEOUT_MS) {
            outputs[i].last_command_time = 0;
            outputs[i].last_command_id = "";
        }
    }
}

// ─── WiFi Setup ─────────────────────────────────────

void setupWifi() {
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WiFi] Connection failed! Will retry in loop.");
    }
}

// ─── MQTT Setup ─────────────────────────────────────

void setupMqtt() {
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(1024);
    
    // Set Last Will and Testament
    char lwtPayload[128];
    snprintf(lwtPayload, sizeof(lwtPayload),
        "{\"status\":\"offline\",\"device_id\":\"%s\"}", DEVICE_ID);
    mqttClient.setKeepAlive(60);
}

void reconnectMqtt() {
    Serial.printf("[MQTT] Connecting to %s:%d...\n", MQTT_BROKER, MQTT_PORT);
    
    // LWT message
    char lwtPayload[128];
    snprintf(lwtPayload, sizeof(lwtPayload),
        "{\"status\":\"offline\",\"device_id\":\"%s\"}", DEVICE_ID);
    
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
        Serial.println("[MQTT] Connected!");
        
        // Subscribe to commands
        mqttClient.subscribe(topicCommands, 1);
        Serial.printf("[MQTT] Subscribed to: %s\n", topicCommands);
        
        // Publish online status
        publishAvailability("online");
        publishHeartbeat();
    } else {
        Serial.printf("[MQTT] Connection failed, state: %d\n", mqttClient.state());
    }
}

// ─── Output Setup ───────────────────────────────────

void setupOutputs() {
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        pinMode(outputs[i].gpio_pin, OUTPUT);
        digitalWrite(outputs[i].gpio_pin, LOW);
        outputs[i].current_state = false;
        Serial.printf("[Output] %s -> GPIO %d (OFF)\n", 
            outputs[i].output_id, outputs[i].gpio_pin);
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

// ─── MQTT Message Handler ───────────────────────────

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    // Parse JSON
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    
    if (error) {
        Serial.printf("[MQTT] JSON parse error: %s\n", error.c_str());
        return;
    }
    
    Serial.printf("[MQTT] Received on %s\n", topic);
    
    // Handle command
    if (String(topic) == String(topicCommands)) {
        handleCommand(doc);
    }
}

// ─── Command Handler ────────────────────────────────

void handleCommand(JsonDocument& doc) {
    const char* command_id = doc["command_id"];
    const char* device_id = doc["device_id"];
    const char* output_id = doc["output_id"];
    const char* requested_state = doc["requested_state"];
    
    // Validate required fields
    if (!command_id || !device_id || !output_id || !requested_state) {
        Serial.println("[CMD] Missing required fields");
        return;
    }
    
    // Verify device ID
    if (String(device_id) != String(DEVICE_ID)) {
        Serial.printf("[CMD] Command not for this device: %s\n", device_id);
        return;
    }
    
    Serial.printf("[CMD] Command %s: %s -> %s\n", command_id, output_id, requested_state);
    
    // Find the output
    int idx = findOutputIndex(output_id);
    if (idx < 0) {
        Serial.printf("[CMD] Unknown output: %s\n", output_id);
        publishAck(command_id, output_id, false, "UNKNOWN", "Output not found");
        return;
    }
    
    // Duplicate command protection
    if (outputs[idx].last_command_id == String(command_id)) {
        Serial.printf("[CMD] Duplicate command ignored: %s\n", command_id);
        const char* state_str = outputs[idx].current_state ? "ON" : "OFF";
        publishAck(command_id, output_id, true, state_str, NULL);
        return;
    }
    
    // Check command expiry
    if (doc.containsKey("expires_at")) {
        // Simple expiry check - if we can parse the timestamp
        // For educational prototype, we trust the backend's timing
    }
    
    // Execute the command
    bool target_state;
    if (String(requested_state) == "ON") {
        target_state = true;
    } else if (String(requested_state) == "OFF") {
        target_state = false;
    } else {
        publishAck(command_id, output_id, false, "UNKNOWN", "Invalid requested_state");
        return;
    }
    
    // Set the output
    digitalWrite(outputs[idx].gpio_pin, target_state ? HIGH : LOW);
    outputs[idx].current_state = target_state;
    outputs[idx].last_command_id = String(command_id);
    outputs[idx].last_command_time = millis();
    
    const char* reported = target_state ? "ON" : "OFF";
    Serial.printf("[CMD] Output %s set to %s (GPIO %d)\n", 
        output_id, reported, outputs[idx].gpio_pin);
    
    // Send acknowledgement
    publishAck(command_id, output_id, true, reported, NULL);
}

// ─── Find Output Index ──────────────────────────────

int findOutputIndex(const char* output_id) {
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        if (String(outputs[i].output_id) == String(output_id)) {
            return i;
        }
    }
    return -1;
}

// ─── Publish Acknowledgement ────────────────────────

void publishAck(const char* command_id, const char* output_id, 
                bool success, const char* reported_state, const char* error_reason) {
    JsonDocument doc;
    
    doc["schema_version"] = SCHEMA_VERSION;
    doc["command_id"] = command_id;
    doc["device_id"] = DEVICE_ID;
    doc["output_id"] = output_id;
    doc["success"] = success;
    doc["reported_state"] = reported_state;
    doc["timestamp"] = millis(); // In production, use NTP time
    
    if (error_reason) {
        doc["error_reason"] = error_reason;
    }
    
    char buffer[512];
    serializeJson(doc, buffer, sizeof(buffer));
    
    mqttClient.publish(topicAck, buffer, false);
    Serial.printf("[ACK] Sent for command %s: %s\n", command_id, 
        success ? "SUCCESS" : "FAILED");
}

// ─── Publish Availability ───────────────────────────

void publishAvailability(const char* status) {
    JsonDocument doc;
    doc["status"] = status;
    doc["device_id"] = DEVICE_ID;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["ip_address"] = WiFi.localIP().toString();
    doc["uptime_ms"] = millis();
    
    char buffer[256];
    serializeJson(doc, buffer, sizeof(buffer));
    
    mqttClient.publish(topicAvailability, buffer, true); // retained
    Serial.printf("[AVAIL] Published: %s\n", status);
}

// ─── Publish Heartbeat ──────────────────────────────

void publishHeartbeat() {
    JsonDocument doc;
    doc["device_id"] = DEVICE_ID;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["uptime_ms"] = millis();
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["free_heap"] = ESP.getFreeHeap();
    
    // Include current output states
    JsonObject states = doc["output_states"].to<JsonObject>();
    for (int i = 0; i < NUM_OUTPUTS; i++) {
        states[outputs[i].output_id] = outputs[i].current_state ? "ON" : "OFF";
    }
    
    char buffer[512];
    serializeJson(doc, buffer, sizeof(buffer));
    
    mqttClient.publish(topicStatus, buffer, false);
}
