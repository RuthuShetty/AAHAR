# AAHAR Hardware BOM, Sourcing & Manufacturing Assembly Guide
**Document ID:** AAHAR-HW-2026-003  
**Revision:** Rev C3 (Production Release)  
**Cost Targets:** Handheld Unit ₹10,500–12,000 @ 1k volume | Silage Probe Node ₹3,200 @ 1k volume  

---

## 1. Handheld NIR Scanner — Itemized Bill of Materials (BOM)

| Subsystem | Part Description | Manufacturer / Part Number | Key Specifications | Qty | Unit Cost (INR @ 1k) | Sourcing Link / Vendor |
|---|---|---|---|---|---|---|
| **Optics Core** | Micro-spectrometer | Hamamatsu Photonics C12880MA | 340–850 nm CMOS + custom NIR coating 900–1700 nm | 1 | ₹ 5,850 | Hamamatsu / DigiKey |
| **Optics Alt (Lite)** | 18-channel spectral triad | ams-OSRAM AS72651/52/53 | 410–940 nm 18-channel array | 1 | ₹ 1,450 | ams-OSRAM / Mouser |
| **Compute Core** | Wi-Fi 4 + BLE 5.0 MCU | Espressif ESP32-S3-WROOM-1-N16R8 | Dual-core 240MHz, 16MB Flash, 8MB PSRAM | 1 | ₹ 320 | Espressif / LCSC |
| **Illumination** | Tungsten Halogen Mini Bulb | Ushio / Welch Allyn 01100-U | 12V 5W, broadband continuous 400–2500 nm | 2 | ₹ 480 | Welch Allyn / RS Comp |
| **Illumination Aux** | UV NIR LED array | Roithner Lasertechnik LED365 / Vishay VSMY | 365nm UV + 6x 940–1650nm NIR chips | 1 | ₹ 240 | Roithner / Mouser |
| **Environmental** | Gas, Temp, Humidity, Press | Bosch Sensortec BME688 | I2C, VOC gas sensor, -40°C to +85°C | 1 | ₹ 310 | Bosch / DigiKey |
| **Power PMIC** | USB-C Li-ion Charger & PMIC | Texas Instruments BQ24074RGTR | 1.5A charge, dynamic power path, I2C/status | 1 | ₹ 115 | Texas Instruments / LCSC |
| **Battery Pack** | 18650 Li-ion Cells (Parallel) | Panasonic NCR18650B | 3.7V, 3400 mAh × 2 = 6800 mAh, PCM protection | 2 | ₹ 460 | Panasonic / EnergySupply |
| **Display** | 1.3" Monochrome OLED | Solomon Systech SSD1306 | 128×64 pixels, I2C interface, white on black | 1 | ₹ 160 | Waveshare / LCSC |
| **Status Indicator** | WS2812B RGB Ring | Worldsemi WS2812B-2020 | 12-pixel circular ring, 5V digital addressable | 1 | ₹ 65 | Worldsemi / JLCPCB |
| **Camera Module** | 5MP Macro Camera | OmniVision OV5640 (DVP interface) | Auto-focus, 4× digital macro magnification | 1 | ₹ 520 | OmniVision / LCSC |
| **Chamber Interlock**| Hall Effect Switch | Diodes Inc AH180N | Omnipolar micro-power Hall sensor, latch trigger | 1 | ₹ 25 | Diodes Inc / Mouser |
| **Audio Feedback** | Magnetic Buzzer Transducer | PUI Audio SMT-0927-S-6-R | 9×9mm SMD, 85 dBA @ 10cm, 2730 Hz resonant | 1 | ₹ 35 | PUI Audio / DigiKey |
| **Optics Window** | Antireflection Sapphire Glass | Custom Optical Glass Ltd | 25mm dia × 1.5mm, AR coated 900–1700nm | 1 | ₹ 380 | Precision Optical Labs |
| **Reference Tile** | Diffuse Reflectance Standard | Labsphere Spectralon equivalent | 99% diffuse PTFE disc (20mm dia) | 1 | ₹ 450 | Avian Technologies |
| **PCB & Passives** | 4-layer FR4 ENIG PCB + SMT | JLCPCB / PCBWay (impedance ctrl) | 0402/0603 passives, LDOs, MOSFET switches | 1 | ₹ 420 | JLCPCB SMT Assembly |
| **Mechanical Case** | Injection Molded Polycarbonate | SABIC Lexan EXL1414 (Drop-tested) | IP54 sealed, ergonomic grip, rubber bumper | 1 | ₹ 480 | Local Tooling Partner |
| **Hardware / Seals**| Silicone gasket, screws, spring | M2.5 stainless fasteners, silicone O-rings | Stainless steel 304, Viton cup seal | 1 | ₹ 110 | Standard Fasteners |
| **Packaging & Bag** | Canvas field bag & wrist strap | Heavy duty canvas with foam cutout | Field holster, cleaning swabs, white tile puck | 1 | ₹ 220 | Local Manufacturer |
| **Total BOM (Pro)**| **AAHAR Pro (Hamamatsu C12880MA Core)** | | | | **₹ 11,145** | **Well within ₹12,000 target** |
| **Total BOM (Lite)**| **AAHAR Lite (AS7265x Triad Core)** | | | | **₹ 6,745** | **Ultra-low-cost tier** |

---

## 2. Silage IoT Probe Node — Itemized BOM

| Subsystem | Part Description | Manufacturer / Part Number | Key Specifications | Qty | Unit Cost (INR @ 1k) | Sourcing Link / Vendor |
|---|---|---|---|---|---|---|
| **MCU & Radio** | ESP32-C6 RISC-V SoC | Espressif ESP32-C6-WROOM-1-N8 | 160MHz 32-bit RISC-V, 802.15.4, BLE 5.3, WiFi 6 | 1 | ₹ 220 | Espressif / LCSC |
| **Sub-GHz LoRa** | Semtech LoRa Transceiver | Semtech SX1262IMLTRT | 865–867 MHz (IN865), +22 dBm PA, -137 dBm sens | 1 | ₹ 340 | Semtech / Mouser |
| **Antenna** | 868MHz Helical Antenna | Linx Technologies ANT-868-HETH | Omnidirectional 2.1 dBi spring whip | 1 | ₹ 45 | Linx / DigiKey |
| **pH Sensor** | ISFET Solid-state pH Electrode | Winsen / Sentron ISFET probe head | Flat solid-state tip, 0–14 pH, unbreakable | 1 | ₹ 780 | Winsen Sensor / OEM |
| **Depth Temp (4x)**| DS18B20 1-Wire Digital Thermistors | Maxim Integrated / Analog DS18B20+ | ±0.5°C accuracy, stainless 6mm probe heads | 4 | ₹ 320 | Analog Devices / LCSC |
| **Moisture Probe** | Capacitive Soil/Silage Moisture | Custom PCB trace excitation | High frequency 50 MHz capacitive oscillator | 1 | ₹ 95 | Integrated into PCB |
| **CO2 Sensor** | NDIR Dual-Beam CO2 Sensor | Winsen MH-Z19C | 0–50,000 ppm, low-power pulse mode (5mA avg) | 1 | ₹ 680 | Winsen Sensor |
| **VOC / Head Temp** | BME688 Environmental | Bosch Sensortec BME688 | VOC, Relative Humidity, Pressure, Ambient Temp | 1 | ₹ 310 | Bosch / DigiKey |
| **Battery Cell** | Industrial LiFePO4 or Li-SOCl2 | EVE Energy ER34615 (D-cell) | 3.6V 19,000 mAh (or dual 5000 mAh LiFePO4) | 1 | ₹ 450 | EVE Energy / BatteryMall |
| **Lance Tube** | Stainless Steel 304 Lance (1.8m)| Custom Drawn Seamless Tube | 22mm OD × 1.5mm wall, perforated sensor windows | 1 | ₹ 480 | Local Metal Fabricator |
| **Enclosure Head** | NEMA 4X / IP67 Flanged Box | Polycarbonate UV-stabilized screw box | O-ring seal, IP67 cable glands, breather vent | 1 | ₹ 190 | Fibox / Enclosure Direct |
| **PCB & Assembly** | 2-layer FR4 PCB with conformal coat | JLCPCB / PCBWay SMT | Silicone conformal dip coating against acid vapors | 1 | ₹ 140 | JLCPCB |
| **Total Probe BOM**| **AAHAR Silage IoT Probe Node** | | | | **₹ 3,150** | **Meets ₹3,200 target** |

---

## 3. Step-by-Step Handheld Assembly Instructions

```
[Step 1: Optical Engine Sub-Assembly]
   ├── Mount Hamamatsu C12880MA into CNC aluminum optic carrier bracket (torque 0.25 N·m).
   ├── Place the AR-coated sapphire window over the aperture with a Viton rubber O-ring.
   ├── Fasten dual tungsten halogen lamps into parabolic brass reflectors (thermal paste applied).
   └── Install Hall effect sensor bracket aligned with magnetic chamber latch.

[Step 2: Mainboard Interconnection]
   ├── Seat ESP32-S3 mainboard into lower ABS enclosure half.
   ├── Connect FPC ribbon cable from C12880MA to 30-pin Hirose connector on mainboard.
   ├── Connect OV5640 macro camera FPC cable to parallel camera header.
   ├── Solder power leads from dual 18650 battery pack through the inline 2.5A PTC fuse.
   └── Mount 12-pixel WS2812B ring diffuser around the optical chamber lip.

[Step 3: Enclosure Sealing & Final QC]
   ├── Fit continuous silicone perimeter gasket into groove of top shell.
   ├── Mate upper and lower shell halves; drive 4x M2.5 Torx stainless screws (0.45 N·m).
   ├── Verify SSD1306 display alignment and clear PMMA viewing window.
   └── Affix laser-etched serial plate with factory QR code: AAHAR-S-0001XX.

[Step 4: Factory Calibration & Test Jig]
   ├── Insert unit into automated automated calibration fixture.
   ├── Execute automated test script: USB flashing of firmware v1.2.4.
   ├── Acquire dark frame: confirm dark count < 250 across all 288 channels.
   ├── Acquire white standard frame: confirm SNR > 22 dB across 900–1700 nm.
   ├── Burn unique Ed25519 device private key into ESP32-S3 eFuse Block 3.
   └── Issue cryptographically signed factory certificate synced to Cloud Core.
```
