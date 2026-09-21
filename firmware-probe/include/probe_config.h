/**
 * AAHAR Silage Probe Node — Hardware Configuration & Pinout
 * Target: ESP32-C6 + Semtech SX1262 LoRa (IN865 / EU868)
 */

#pragma once
#ifndef AAHAR_PROBE_CONFIG_H
#define AAHAR_PROBE_CONFIG_H

#include <cstdint>

namespace aahar::probe::config {

// ─── Default Identifiers ──────────────────────────────────────────────────────
constexpr const char* DEFAULT_PROBE_ID    = "PROBE-IN-0081";
constexpr const char* DEFAULT_BUNKER_ID   = "bunker-north-01";
constexpr const char* DEFAULT_FARM_ID     = "farm-punjab-042";

// ─── GPIO Pinout Mapping (ESP32-C6) ───────────────────────────────────────────

// 1-Wire Bus for 4x DS18B20 Array along 1.2m Lance
constexpr int PIN_ONEWIRE_TEMP            = 4;

// ISFET pH Sensor (AD8603 op-amp front-end to ADC1 Ch 0)
constexpr int PIN_ISFET_PH_ADC            = 0;

// Capacitive Moisture Lance (ADC1 Ch 1)
constexpr int PIN_MOISTURE_ADC            = 1;

// MH-Z19C NDIR CO2 Sensor (UART1)
constexpr int PIN_MHZ19_TX                = 2;
constexpr int PIN_MHZ19_RX                = 3;
constexpr uint32_t MHZ19_BAUD_RATE        = 9600;

// Solar & Battery Voltage Divider (ADC1 Ch 4)
constexpr int PIN_VBAT_SOLAR_ADC          = 5;

// I2C Bus for BME688 (VOC / Ammonia / Pressure / Temp)
constexpr int PIN_I2C_SDA                 = 6;
constexpr int PIN_I2C_SCL                 = 7;

// Semtech SX1262 LoRa Radio (SPI)
constexpr int PIN_SX1262_NSS              = 18;
constexpr int PIN_SX1262_SCK              = 19;
constexpr int PIN_SX1262_MISO             = 20;
constexpr int PIN_SX1262_MOSI             = 21;
constexpr int PIN_SX1262_BUSY             = 22;
constexpr int PIN_SX1262_DIO1             = 23;
constexpr int PIN_SX1262_RESET            = 15;

// Sensor Power Rail Enable (MOSFET high-side switch to cut all sensors in deep sleep)
constexpr int PIN_SENSOR_POWER_EN         = 9;

// ─── Sampling & Power Management Timings ──────────────────────────────────────
constexpr uint32_t SAMPLE_INTERVAL_S      = 900;  // 15 minutes = 900 seconds
constexpr uint32_t ACTIVE_MEASURE_TIME_MS = 3500; // 3.5s sensor warmup & sampling
constexpr float BATTERY_CAPACITY_MAH      = 5000.0f; // 3.7V 5000 mAh Li-ion cell
constexpr float DEEP_SLEEP_CURRENT_UA     = 18.0f;   // 18 uA RTC + deep sleep
constexpr float ACTIVE_CURRENT_MA         = 25.0f;   // 25 mA during measurement
constexpr float LORA_TX_CURRENT_MA        = 120.0f;  // 120 mA during +14dBm LoRa burst
constexpr float LORA_TX_DURATION_MS       = 80.0f;   // 80 ms packet transmission

// ─── LoRaWAN Radio Parameters (IN865 Band) ────────────────────────────────────
constexpr uint32_t LORA_FREQUENCY_HZ      = 865062500; // Channel 0: 865.0625 MHz
constexpr uint8_t LORA_SPREADING_FACTOR   = 7;         // SF7 (Fastest, lowest energy)
constexpr uint32_t LORA_BANDWIDTH_HZ      = 125000;    // 125 kHz
constexpr uint8_t LORA_CODING_RATE        = 1;         // 4/5
constexpr int8_t LORA_TX_POWER_DBM        = 14;        // +14 dBm (25 mW WPC compliant)

// ─── 4-Depth Lance Depth Constants (metres) ───────────────────────────────────
constexpr float LANCE_DEPTH_0_M           = 0.2f;  // Surface zone (most vulnerable)
constexpr float LANCE_DEPTH_1_M           = 0.5f;  // Sub-surface
constexpr float LANCE_DEPTH_2_M           = 0.8f;  // Mid core
constexpr float LANCE_DEPTH_3_M           = 1.1f;  // Deep core

} // namespace aahar::probe::config

#endif // AAHAR_PROBE_CONFIG_H
