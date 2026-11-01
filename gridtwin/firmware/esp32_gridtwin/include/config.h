/**
 * GRIDTWIN ESP32 Firmware - Hardware & Network Configuration Header
 * 
 * Hardware Architecture:
 * - ESP32 DevKit V1 (30-pin or 38-pin)
 * - 8-Channel 5V Optoisolated Relay Module (tested working)
 * - INA219 I2C High-Side DC Voltage/Current Sensor
 * - 5x Tower LEDs (T1–T5)
 * 
 * Pinout Assignment:
 * - GPIO 13 -> Relay IN1 -> Tower 1 LED branch
 * - GPIO 14 -> Relay IN2 -> Tower 2 LED branch
 * - GPIO 25 -> Relay IN3 -> Tower 3 LED branch
 * - GPIO 26 -> Relay IN4 -> Tower 4 LED branch
 * - GPIO 27 -> Relay IN5 -> Tower 5 LED branch
 * - GPIO 32 -> Relay IN6 -> Reserved (Normal-path / Isolation feature)
 * - IN7 & IN8: Not connected / reserved
 * 
 * INA219 Sensor Pins:
 * - VCC -> ESP32 3V3
 * - GND -> ESP32 GND
 * - SDA -> GPIO 21
 * - SCL -> GPIO 22
 * - VIN+ / VIN- -> In series with 12V LED supply positive rail
 */

#ifndef GRIDTWIN_CONFIG_H
#define GRIDTWIN_CONFIG_H

// ─── Wi-Fi Configuration ────────────────────────────
// Override these in config_local.h or compile flags
#ifndef WIFI_SSID
#define WIFI_SSID "YOUR_WIFI_SSID"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif

// ─── MQTT Configuration ─────────────────────────────
#ifndef MQTT_BROKER
#define MQTT_BROKER "192.168.1.100" // IP address of host running Mosquitto
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

// ─── Device Identity ────────────────────────────────
#ifndef DEVICE_ID
#define DEVICE_ID "esp32-gridtwin-001"
#endif

#define FIRMWARE_VERSION "2.0.0-hackathon"
#define SCHEMA_VERSION "1.0"

// ─── GPIO Relay Pin Mappings ────────────────────────
#define OUTPUT_T1_PIN 13 // Relay IN1 -> Tower 1
#define OUTPUT_T2_PIN 14 // Relay IN2 -> Tower 2
#define OUTPUT_T3_PIN 25 // Relay IN3 -> Tower 3
#define OUTPUT_T4_PIN 26 // Relay IN4 -> Tower 4
#define OUTPUT_T5_PIN 27 // Relay IN5 -> Tower 5
#define RELAY_6_PIN   32 // Relay IN6 -> Reserved normal path

#define NUM_OUTPUTS 5

// ─── Relay Board Active Logic ───────────────────────
// Most 8-channel optoisolated relay boards with a JD-VCC / VR jumper
// switch ON when the input is pulled LOW (Active-LOW).
// If your board switches ON when input is HIGH, set RELAY_ACTIVE_LOW to false.
#ifndef RELAY_ACTIVE_LOW
#define RELAY_ACTIVE_LOW true
#endif

#define RELAY_STATE_ON  (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_STATE_OFF (RELAY_ACTIVE_LOW ? HIGH : LOW)

// ─── INA219 I2C Current Sensor Configuration ────────
#define INA219_SDA_PIN 21
#define INA219_SCL_PIN 22
#define INA219_I2C_ADDRESS 0x40

// ─── Timing Intervals (Milliseconds) ────────────────
#define HEARTBEAT_INTERVAL_MS      10000 // 10 seconds heartbeat
#define SENSOR_READ_INTERVAL_MS     1000 // 1 second INA219 telemetry
#define MQTT_RECONNECT_INTERVAL_MS  5000 // 5 seconds
#define WIFI_RECONNECT_INTERVAL_MS 10000 // 10 seconds
#define COMMAND_TIMEOUT_MS         15000 // 15 seconds

#endif // GRIDTWIN_CONFIG_H
