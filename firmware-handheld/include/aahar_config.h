/**
 * AAHAR Handheld Scanner — Hardware Configuration & Pinout
 * ESP32-S3-WROOM-1 N16R8
 */

#pragma once
#ifndef AAHAR_CONFIG_H
#define AAHAR_CONFIG_H

#include <cstdint>

namespace aahar::config {

// ─── Hardware SKUs ────────────────────────────────────────────────────────────
enum class HardwareSku : uint8_t {
    AAHAR_PRO  = 1, // Hamamatsu C12880MA + OV5640 Camera + 365nm UV LED
    AAHAR_LITE = 2  // AS7265x Triad optical sensor (cost-optimized)
};

#if defined(AAHAR_SKU_LITE)
constexpr HardwareSku ACTIVE_SKU = HardwareSku::AAHAR_LITE;
constexpr const char* SKU_NAME = "AAHAR_LITE";
constexpr const char* DEFAULT_SERIAL = "AAHAR-L-001290";
#else
constexpr HardwareSku ACTIVE_SKU = HardwareSku::AAHAR_PRO;
constexpr const char* SKU_NAME = "AAHAR_PRO";
constexpr const char* DEFAULT_SERIAL = "AAHAR-P-004821";
#endif

// ─── GPIO Pinout Mapping ──────────────────────────────────────────────────────

// I2C Bus (BME688, SSD1306 OLED, AS7265x, BQ24074 status)
constexpr int PIN_I2C_SDA             = 8;
constexpr int PIN_I2C_SCL             = 9;
constexpr uint32_t I2C_FREQ_HZ         = 400000; // 400 kHz Fast-mode

// Hamamatsu C12880MA Micro-Spectrometer (AAHAR Pro)
constexpr int PIN_C12880_CLK          = 10;
constexpr int PIN_C12880_ST           = 11;
constexpr int PIN_C12880_TRG          = 12;
constexpr int PIN_C12880_EOS          = 13;
constexpr int PIN_C12880_VIDEO_ADC    = 4;  // ADC1 Channel 3

// Illumination Control (PWM / Digital)
constexpr int PIN_HALOGEN_PWM_1       = 14; // Tungsten Halogen Micro-lamp 1
constexpr int PIN_HALOGEN_PWM_2       = 15; // Tungsten Halogen Micro-lamp 2
constexpr int PIN_NIR_LED_BANK        = 16; // 6x 1450/1650nm NIR LEDs
constexpr int PIN_UV_365NM_LED        = 17; // 365nm 3W UV LED (Fluorescence)
constexpr uint32_t PWM_TIMER_FREQ_HZ  = 25000; // 25 kHz ultrasonic PWM

// Safety & Interlock Sensors
constexpr int PIN_CHAMBER_INTERLOCK   = 18; // Hall effect / microswitch (Active LOW)

// Power & Battery Management
constexpr int PIN_BATTERY_ADC         = 5;  // Voltage divider (1/2 Vbat) on ADC1 Ch 4
constexpr int PIN_PMIC_CHG_STAT       = 6;  // BQ24074 Charge Status
constexpr int PIN_PMIC_POWER_GOOD     = 7;  // BQ24074 PGOOD

// User Interface
constexpr int PIN_WS2812_LED_RING     = 38; // RGB LED status ring (8 or 16 pixels)
constexpr int PIN_BUZZER_PWM          = 39; // Audio alert buzzer
constexpr int PIN_USER_SCAN_BUTTON    = 0;  // Push button on enclosure

// OV5640 Camera (DVP 8-bit bus) (AAHAR Pro)
constexpr int PIN_CAM_PWDN            = -1;
constexpr int PIN_CAM_RESET           = 21;
constexpr int PIN_CAM_XCLK            = 45;
constexpr int PIN_CAM_SIOD            = PIN_I2C_SDA;
constexpr int PIN_CAM_SIOC            = PIN_I2C_SCL;
constexpr int PIN_CAM_Y9              = 48;
constexpr int PIN_CAM_Y8              = 46;
constexpr int PIN_CAM_Y7              = 47;
constexpr int PIN_CAM_Y6              = 42;
constexpr int PIN_CAM_Y5              = 41;
constexpr int PIN_CAM_Y4              = 40;
constexpr int PIN_CAM_Y3              = 37;
constexpr int PIN_CAM_Y2              = 36;
constexpr int PIN_CAM_VSYNC           = 1;
constexpr int PIN_CAM_HREF            = 2;
constexpr int PIN_CAM_PCLK            = 3;

// ─── Spectral Acquisition Parameters ──────────────────────────────────────────
constexpr uint16_t NUM_SPECTRAL_BANDS   = 228;   // Standardized contract channels
constexpr float WAVELENGTH_START_NM     = 900.0f;
constexpr float WAVELENGTH_END_NM       = 1700.0f;
constexpr float WAVELENGTH_STEP_NM      = (WAVELENGTH_END_NM - WAVELENGTH_START_NM) / (NUM_SPECTRAL_BANDS - 1); // ~3.52 nm

constexpr uint8_t NUM_SCAN_REPEATS      = 3;     // 3 repeat sweeps per test
constexpr uint32_t LAMP_WARMUP_TIME_MS  = 3500;  // 3.5s soft-start ramp to thermal stability
constexpr uint32_t INTEGRATION_TIME_US  = 25000; // 25 ms default integration time
constexpr uint32_t TOTAL_SCAN_TIME_S    = 90;    // 90 seconds complete acquisition sequence

// ─── Power & Battery Parameters ───────────────────────────────────────────────
constexpr float BATTERY_CAPACITY_MAH    = 6800.0f; // 2x 18650 in parallel (6800 mAh total)
constexpr float NOMINAL_VOLTAGE_V       = 3.7f;
constexpr float MIN_VOLTAGE_V           = 3.2f;    // Cut-off threshold
constexpr float MAX_VOLTAGE_V           = 4.2f;    // 100% full charge
constexpr uint16_t MIN_SCANS_PER_CHARGE = 60;      // Non-negotiable constraint: >=60 scans/charge

} // namespace aahar::config

#endif // AAHAR_CONFIG_H
