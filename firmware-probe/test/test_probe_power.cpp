/**
 * AAHAR Probe Unit Test — Power Budget & Battery Life
 * Proves > 14 months battery life on 5000 mAh cell without solar.
 */

#include <cassert>
#include <cstdio>
#include "power/probe_power.h"

namespace aahar::probe::test {

void test_probe_power() {
    std::printf("Running probe test_probe_power...\n");

    power::ProbePowerProfile profile;
    profile.battery_capacity_mah = 5000.0f;
    profile.deep_sleep_current_ua = 18.0f;
    profile.active_current_ma = 25.0f;
    profile.active_duration_s = 5.0f;
    profile.lora_tx_current_ma = 120.0f;
    profile.lora_tx_duration_ms = 80.0f;
    profile.cycle_period_s = 900.0f; // 15 min

    power::ProbePowerManager mgr(profile);

    float cycle_uah = mgr.calculate_cycle_energy_uah();
    float avg_current_ma = mgr.calculate_average_current_ma();
    float battery_life_months = mgr.calculate_battery_life_months();

    std::printf("  Cycle energy: %.2f uAh per 15 min\n", cycle_uah);
    std::printf("  Average current: %.3f mA (~%u uA)\n", avg_current_ma, static_cast<unsigned>(avg_current_ma * 1000));
    std::printf("  Estimated battery life: %.1f months (Non-negotiable: >= 14 months)\n", battery_life_months);

    assert(avg_current_ma < 0.25f); // < 250 uA avg
    assert(battery_life_months >= 14.0f);
    assert(mgr.satisfies_master_constraint());

    std::printf("  PASS: probe test_probe_power (%.1f months >= 14 months)\n", battery_life_months);
}

} // namespace aahar::probe::test
