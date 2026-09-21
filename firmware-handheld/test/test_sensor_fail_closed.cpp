/**
 * Regression test: absent sensors must NOT yield measurements.
 * Compiled as a RELEASE build (AAHAR_TEST_BUILD undefined for the drivers),
 * which is the configuration that ships.
 */
#include "as7265x.h"
#include "sensor_guard.h"
#include <array>
#include <cstdio>

static int failures = 0;
#define CHECK(cond, msg) do { \
    if (cond) { std::printf("  [ok]   %s\n", msg); } \
    else      { std::printf("  [FAIL] %s\n", msg); ++failures; } } while (0)

int main() {
    using namespace aahar;
    using namespace aahar::drivers;

    std::printf("AS7265x driver, release build, NO hardware attached:\n");

    As7265xTriad sensor(0x49);

    bool ok = sensor.init();
    CHECK(ok == false, "init() returns false when the sensor does not respond");
    CHECK(sensor.state() == SensorState::NotPresent,
          "state() is NOT_PRESENT (previously: is_simulated_=true, init()=true)");

    std::array<float, AS7265X_NUM_CHANNELS> channels{};
    channels.fill(1234.5f);                       // poison the buffer
    SensorState st = sensor.capture_calibrated(channels);

    CHECK(st != SensorState::Ok,
          "capture_calibrated() does not report Ok without hardware");
    CHECK(!is_measurement_trustworthy(st),
          "result is not trustworthy as a measurement");

    bool all_zero = true;
    for (float v : channels) if (v != 0.0f) all_zero = false;
    CHECK(all_zero, "output buffer is zeroed, not filled with a synthetic curve");

    std::printf("  state reported to caller: %s\n", to_string(st));

    // The simulation injector must not even exist in a release build.
    std::printf("\nSimulation API availability in release build:\n");
#if AAHAR_SIMULATION_ALLOWED
    std::printf("  [FAIL] AAHAR_SIMULATION_ALLOWED is 1 in a release build\n");
    ++failures;
#else
    std::printf("  [ok]   AAHAR_SIMULATION_ALLOWED == 0 (set_simulated_channels compiled out)\n");
#endif

    std::printf("\n%s (%d failure%s)\n", failures ? "FAILED" : "PASSED",
                failures, failures == 1 ? "" : "s");
    return failures ? 1 : 0;
}
