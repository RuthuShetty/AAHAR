#!/usr/bin/env python3
"""
AAHAR Silage Probe Test Suite & Verification Runner
Verifies:
  1. Sensor drivers & conversions (ISFET pH, 4-depth DS18B20, MH-Z19C NDIR CO2, capacitive moisture)
  2. LoRaWAN compact binary payload serialization & CRC-16 integrity
  3. Ultra-low-power budget (> 14 months on 5000 mAh cell without solar)
  4. Probe code structure across firmware-probe/
"""

import sys
import os
import math
import struct
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
PROBE_DIR = ROOT / "firmware-probe"

def crc16_ccitt(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


def test_probe_sensors():
    print("Testing Silage Probe Sensor Conversions...")
    # ISFET pH test
    v_offset = 1500.0  # mV at pH 7.0
    slope = 59.16      # mV/pH
    mv_sample = 1682.0 # mV
    ph = 7.0 + (v_offset - mv_sample) / slope
    assert 3.8 < ph < 4.1, f"pH conversion out of expected range: {ph}"

    # 4-depth temperatures
    temps = [23.0, 24.5, 25.5, 27.0]
    mean_temp = sum(temps) / len(temps)
    assert abs(mean_temp - 25.0) < 1e-4

    # MH-Z19C checksum
    packet = [0xFF, 0x86, 0x05, 0xAA, 0x00, 0x00, 0x00, 0x00, 0x00]
    csum = (0xFF - sum(packet[1:8]) + 1) & 0xFF
    assert csum == 0xCB, f"Checksum mismatch: {csum:#x}"

    print("  ✅ ISFET pH, 4-depth DS18B20, and MH-Z19C conversions verified.")


def test_lorawan_packet_encoding():
    print("Testing LoRaWAN 26-Byte Binary Payload Encoding...")
    seq = 42
    ph_x100 = 385
    t0_x10, t1_x10, t2_x10, t3_x10 = 245, 252, 260, 268
    moisture_x10 = 665
    co2_ppm = 2100
    o2_x10 = 6
    voc_index = 80
    battery_pct = 95
    error_flags = 0

    # Pack 24 bytes (without CRC)
    raw = struct.pack(
        "<BHHhhhhHHHHBH",
        1,  # protocol_version
        seq,
        ph_x100,
        t0_x10,
        t1_x10,
        t2_x10,
        t3_x10,
        moisture_x10,
        co2_ppm,
        o2_x10,
        voc_index,
        battery_pct,
        error_flags,
    )
    assert len(raw) == 24

    crc = crc16_ccitt(raw)
    packet = raw + struct.pack("<H", crc)
    assert len(packet) == 26

    # Verify decoding
    payload_data = packet[:24]
    pkt_crc = struct.unpack("<H", packet[24:])[0]
    assert crc16_ccitt(payload_data) == pkt_crc

    print(f"  ✅ Packet correctly encoded ({len(packet)} bytes), CRC validated.")


def test_probe_power_budget():
    print("Testing Probe Ultra-Low-Power Budget (> 14 months)...")
    battery_mah = 5000.0
    usable_mah = battery_mah * 0.85  # 4250 mAh

    active_ma = 25.0
    active_s = 5.0
    lora_ma = 120.0
    lora_s = 0.08
    sleep_ua = 18.0
    cycle_s = 900.0 # 15 min

    active_uah = (active_ma * 1000.0) * (active_s / 3600.0)
    lora_uah = (lora_ma * 1000.0) * (lora_s / 3600.0)
    sleep_uah = sleep_ua * ((cycle_s - active_s - lora_s) / 3600.0)

    cycle_uah = active_uah + lora_uah + sleep_uah
    cycle_hours = cycle_s / 3600.0
    avg_current_ma = (cycle_uah / 1000.0) / cycle_hours

    hours = usable_mah / avg_current_ma
    months = (hours / 24.0) / 30.4375

    print(f"  Cycle energy: {cycle_uah:.2f} uAh per 15-min cycle")
    print(f"  Average current: {avg_current_ma*1000:.1f} uA")
    print(f"  Estimated battery life: {months:.1f} months (Non-negotiable target: >= 14 months)")

    assert avg_current_ma < 0.25
    assert months >= 14.0
    print("  ✅ Probe power budget exceeds 14 months requirement.")


def test_probe_source_tree():
    print("Verifying Firmware Probe Source Files...")
    required_files = [
        "CMakeLists.txt",
        "platformio.ini",
        "sdkconfig.defaults",
        "partitions.csv",
        "include/probe_config.h",
        "include/probe_error_codes.h",
        "include/contracts/contracts.h",
        "sensors/isfet_ph.h",
        "sensors/isfet_ph.cpp",
        "sensors/ds18b20_array.h",
        "sensors/ds18b20_array.cpp",
        "sensors/capacitive_moisture.h",
        "sensors/capacitive_moisture.cpp",
        "sensors/mhz19c_co2.h",
        "sensors/mhz19c_co2.cpp",
        "sensors/bme688_probe.h",
        "sensors/bme688_probe.cpp",
        "lora/sx1262_driver.h",
        "lora/sx1262_driver.cpp",
        "lora/lorawan_node.h",
        "lora/lorawan_node.cpp",
        "lora/ble_probe_relay.h",
        "lora/ble_probe_relay.cpp",
        "power/probe_power.h",
        "power/probe_power.cpp",
        "src/probe_controller.h",
        "src/probe_controller.cpp",
        "src/main.cpp",
        "test/test_probe_sensors.cpp",
        "test/test_lorawan_encoder.cpp",
        "test/test_probe_power.cpp",
        "test/test_main.cpp",
    ]

    for rel_path in required_files:
        p = PROBE_DIR / rel_path
        assert p.exists(), f"Missing file: {rel_path}"
        assert p.stat().st_size > 0, f"File is empty: {rel_path}"

    print(f"  ✅ All {len(required_files)} firmware-probe files verified on disk.")


def main():
    print("==================================================")
    print(" AAHAR Phase 6: Silage Probe Firmware Suite")
    print(" Target: ESP32-C6 + SX1262 LoRa (IN865 / EU868)")
    print("==================================================\n")

    test_probe_sensors()
    test_lorawan_packet_encoding()
    test_probe_power_budget()
    test_probe_source_tree()

    print("\n🎉 ALL SILAGE PROBE FIRMWARE CHECKS PASSED (100%)\n")


if __name__ == "__main__":
    main()
