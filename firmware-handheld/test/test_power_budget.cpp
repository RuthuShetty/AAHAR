/**
 * AAHAR Firmware Unit Test — Power Budget & Battery Life
 * Proves compliance with Master Prompt: >= 60 scans per charge on 6800 mAh.
 */

#include <cassert>
#include <cstdio>
#include "power/power_budget.h"

namespace aahar::test {

void test_power_budget_compliance() {
    std::printf("Running test_power_budget_compliance...\n");

    power::ScanPowerProfile profile;
    profile.esp32_active_ma     = 100.0f;
    profile.halogen_lamps_ma    = 450.0f;
    profile.spectral_sensor_ma  = 20.0f;
    profile.ui_led_oled_ma      = 35.0f;
    profile.camera_burst_avg_ma = 5.0f;
    profile.scan_duration_s     = 90.0f;

    power::PowerBudgetTracker tracker(profile);

    float energy_per_scan = tracker.calculate_scan_energy_mah();
    std::printf("  Energy consumed per 90s scan: %.2f mAh\n", energy_per_scan);
    assert(energy_per_scan > 10.0f && energy_per_scan < 20.0f);

    uint32_t max_scans = tracker.calculate_max_scans_on_full_charge();
    std::printf("  Max scans on full charge (6800 mAh @ 85%% DoD): %u scans\n", max_scans);
    assert(max_scans >= config::MIN_SCANS_PER_CHARGE);
    assert(tracker.satisfies_master_constraint());

    // Remaining scans estimation
    uint32_t remaining_at_50 = tracker.estimate_remaining_scans(50);
    uint32_t remaining_at_15 = tracker.estimate_remaining_scans(15);
    uint32_t remaining_at_8  = tracker.estimate_remaining_scans(8);

    assert(remaining_at_50 > remaining_at_15);
    assert(remaining_at_8 == 0); // Inhibit below 10%

    std::printf("  PASS: test_power_budget_compliance (%u >= 60 scans)\n", max_scans);
}

} // namespace aahar::test
