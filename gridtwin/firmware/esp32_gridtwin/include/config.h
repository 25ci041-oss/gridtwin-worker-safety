/**
 * GRIDTWIN ESP32 Firmware - Configuration Header
 * 
 * IMPORTANT: Copy this file to 'config_local.h' and fill in your
 * actual credentials. Do NOT commit config_local.h to source control.
 * 
 * GPIO PINS: The pin assignments below are EXAMPLES for a generic ESP32 DevKit.
 * You MUST verify pin availability and suitability for your specific board.
 * Some pins have boot restrictions or are input-only on certain ESP32 variants.
 */

#ifndef GRIDTWIN_CONFIG_H
#define GRIDTWIN_CONFIG_H

// ─── Wi-Fi Configuration ────────────────────────────
// Override these in config_local.h
#ifndef WIFI_SSID
#define WIFI_SSID "YOUR_WIFI_SSID"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif

// ─── MQTT Configuration ─────────────────────────────
#ifndef MQTT_BROKER
#define MQTT_BROKER "192.168.1.100"
#endif

#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

#ifndef MQTT_USERNAME
#define MQTT_USERNAME "gridtwin"
#endif

#ifndef MQTT_PASSWORD_STR
#define MQTT_PASSWORD_STR "gridtwin_mqtt_secret"
#endif

// ─── Device Configuration ───────────────────────────
#ifndef DEVICE_ID
#define DEVICE_ID "esp32-gridtwin-001"
#endif

#define FIRMWARE_VERSION "1.0.0"
#define SCHEMA_VERSION "1.0"

// ─── GPIO Pin Mappings ──────────────────────────────
// WARNING: These are EXAMPLE pins for a generic ESP32 DevKit.
// Verify against your board's pinout before connecting hardware.
// Use appropriate current-limiting resistors for LEDs.
// Use driver circuits (transistors/MOSFETs) for loads > 12mA.

#define OUTPUT_T1_PIN 16
#define OUTPUT_T2_PIN 17
#define OUTPUT_T3_PIN 18
#define OUTPUT_T4_PIN 19
#define OUTPUT_T5_PIN 21

#define NUM_OUTPUTS 5

// ─── Timing Configuration ───────────────────────────
#define HEARTBEAT_INTERVAL_MS 30000      // 30 seconds
#define MQTT_RECONNECT_INTERVAL_MS 5000  // 5 seconds
#define WIFI_RECONNECT_INTERVAL_MS 10000 // 10 seconds
#define COMMAND_TIMEOUT_MS 30000         // 30 seconds

// ─── MQTT Topics ────────────────────────────────────
// Format: gridtwin/devices/{device_id}/{type}
// These are constructed at runtime using DEVICE_ID

#endif // GRIDTWIN_CONFIG_H
