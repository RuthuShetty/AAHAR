/**
 * AAHAR Firmware Unit Test Runner
 */

#include <cstdio>

namespace aahar::test {
    void test_crc16_known_vectors();
    void test_crc16_error_detection();
    void test_spectrum_packetizer_roundtrip();
    void test_spectral_calibration_math();
    void test_power_budget_compliance();
    void test_ble_protocol_parsing();
}

int main() {
    std::printf("=========================================\n");
    std::printf(" AAHAR Handheld Firmware Unit Tests\n");
    std::printf("=========================================\n");

    aahar::test::test_crc16_known_vectors();
    aahar::test::test_crc16_error_detection();
    aahar::test::test_spectrum_packetizer_roundtrip();
    aahar::test::test_spectral_calibration_math();
    aahar::test::test_power_budget_compliance();
    aahar::test::test_ble_protocol_parsing();

    std::printf("\n✅ ALL 6 FIRMWARE TEST SUITES PASSED (100%%)\n");
    return 0;
}
