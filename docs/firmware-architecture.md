# AAHAR Handheld Firmware Architecture (ESP-IDF / C++17)

## Overview
The AAHAR Handheld NIR Scanner firmware runs on the **ESP32-S3-WROOM-1 N16R8** dual-core microcontroller (240 MHz, 16MB Flash, 8MB Octal PSRAM). It implements an optical front-end abstraction, sensor calibration, illumination soft-start control, Bluetooth 5.0 GATT communication, dual-slot OTA firmware updates, and power management satisfying the $\ge 60\text{ scans/charge}$ constraint on dual 18650 cells (6800 mAh).

---

## 1. Hardware SKU Configurations
| Feature | AAHAR Pro (FPO / Clinic) | AAHAR Lite (Farmer Affordable) |
|---|---|---|
| **MCU** | ESP32-S3-WROOM-1 N16R8 | ESP32-S3-WROOM-1 N16R8 |
| **Spectral Sensor** | Hamamatsu C12880MA micro-spectrometer | AS7265x Triad (18 optical channels) |
| **Spectral Range** | 340–850 nm optical / 900–1700 nm NIR | 410–940 nm |
| **Standard Grid** | 228 channels (900.0 nm to 1700.0 nm) | 228 channels (interpolated) |
| **NIR Illumination** | 2x Tungsten-halogen lamps + 6x NIR LEDs | 6x NIR LEDs |
| **Fluorescence** | 365 nm 3W UV LED (Aflatoxin B1) | None |
| **Macro Vision** | OV5640 5MP camera (4-angle burst) | None |
| **Environmental** | Bosch BME688 (T/RH/P/VOC) | Bosch BME688 (T/RH/P/VOC) |
| **Target BOM** | ₹ 11,300 @ 1k | ₹ 6,900 @ 1k |

---

## 2. BLE 5.0 GATT Profile (Section 8.5)
- **Primary Service UUID**: `0000aa00-0000-1000-8000-00805f9b34fb`
- **Characteristics**:
  - `aa01`: Device Info (`READ`) — SKU, FW, serial, calibration date, battery_pct
  - `aa02`: Device Status (`NOTIFY`) — state, battery, chamber, lamp temp, error code, LED color
  - `aa03`: Command (`WRITE`) — `START_SCAN`, `ABORT`, `CALIBRATE`, `SLEEP`, `OTA_BEGIN`
  - `aa04`: Spectrum Stream (`NOTIFY`) — 512-byte MTU packets (10 packets) with CRC-16 CCITT (0x1021)
  - `aa05`: Image Stream (`NOTIFY`) — chunked JPEG frames (4 angles)
  - `aa06`: Environmental Data (`NOTIFY`) — Temperature, Humidity, Pressure, VOC index
  - `aa07`: OTA (`WRITE`) — dual-slot A/B partition chunks with SHA-256 validation

---

## 3. Optical Sequence (90 Seconds)
1. Pre-flight check: chamber switch closed, battery $> 10\%$.
2. LED status ring pulses blue (`#1565C0`), buzzer plays start chime.
3. 2x Tungsten-halogen lamps warm up via 3.5s soft-start PWM ramp (eliminating thermal shock and filament surge).
4. 3 repeat sweeps across sample (228 bands each), averaged into mean spectrum.
5. 365nm UV LED pulse for Aflatoxin B1 fluorescence emission.
6. Bosch BME688 environmental sampling (T, RH, P, VOC).
7. OV5640 macro camera quad-angle photo burst.
8. Illumination shutdown, LED ring returns to solid green (`#2E7D32`), buzzer plays finish chime.
9. 512-byte MTU packet streaming over BLE GATT (<130 ms).

---

## 4. Power Budget Analysis
- **Battery**: Dual 18650 Li-ion in parallel (6800 mAh @ 3.7V nominal $\approx 25.16\text{ Wh}$).
- **Usable capacity** (85% DoD): $5,780\text{ mAh}$.
- **Active scan power** (550 mA avg for 90s): $13.75\text{ mAh}$ per scan.
- **Maximum scans per charge**: $\approx 379\text{ scans}$ (Master requirement: $\ge 60\text{ scans}$).
- **Sleep power**: 18 µA deep sleep (indefinite standby).
