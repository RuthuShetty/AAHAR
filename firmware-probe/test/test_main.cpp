/**
 * AAHAR Probe Unit Test Runner
 */

#include <cstdio>

namespace aahar::probe::test {
    void test_sensors();
    void test_lorawan_encoder();
    void test_probe_power();
}

int main() {
    std::printf("=========================================\n");
    std::printf(" AAHAR Silage Probe Unit Tests\n");
    std::printf("=========================================\n");

    aahar::probe::test::test_sensors();
    aahar::probe::test::test_lorawan_encoder();
    aahar::probe::test::test_probe_power();

    std::printf("\n✅ ALL PROBE TEST SUITES PASSED (100%%)\n");
    return 0;
}
