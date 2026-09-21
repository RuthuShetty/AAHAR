/**
 * AAHAR Firmware Unit Test — CRC-16 CCITT Validation
 * Ensures bit-for-bit parity with mobile/src/ble/crc16.ts.
 */

#include <cassert>
#include <cstdio>
#include <cstring>
#include <vector>
#include "ble/spectrum_streamer.h"

namespace aahar::test {

void test_crc16_known_vectors() {
    std::printf("Running test_crc16_known_vectors...\n");

    // Standard test vector "123456789"
    const char* str = "123456789";
    uint16_t crc = ble::crc16_ccitt(reinterpret_cast<const uint8_t*>(str), std::strlen(str));
    std::printf("  CRC-16 of '123456789': 0x%04X\n", crc);
    assert(crc == 0x29B1);

    // Empty buffer
    uint16_t empty_crc = ble::crc16_ccitt(nullptr, 0);
    assert(empty_crc == 0xFFFF);

    // Single byte 0x00
    uint8_t zero = 0x00;
    uint16_t zero_crc = ble::crc16_ccitt(&zero, 1);
    std::printf("  CRC-16 of 0x00: 0x%04X\n", zero_crc);
    assert(zero_crc != 0xFFFF);

    std::printf("  PASS: test_crc16_known_vectors\n");
}

void test_crc16_error_detection() {
    std::printf("Running test_crc16_error_detection...\n");

    std::vector<uint8_t> payload(504, 0xA5);
    uint16_t original_crc = ble::crc16_ccitt(payload.data(), payload.size());

    // Flip single bit
    payload[42] ^= 0x01;
    uint16_t corrupted_crc = ble::crc16_ccitt(payload.data(), payload.size());

    assert(original_crc != corrupted_crc);
    std::printf("  PASS: test_crc16_error_detection (0x%04X != 0x%04X)\n", original_crc, corrupted_crc);
}

} // namespace aahar::test
