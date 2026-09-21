#include "power_budget.h"
#include <algorithm>

namespace aahar::power {

PowerBudgetTracker::PowerBudgetTracker(const ScanPowerProfile& profile)
    : profile_(profile) {}

float PowerBudgetTracker::calculate_scan_energy_mah() const {
    float total_active_ma = profile_.esp32_active_ma +
                            profile_.halogen_lamps_ma +
                            profile_.spectral_sensor_ma +
                            profile_.ui_led_oled_ma +
                            profile_.camera_burst_avg_ma;

    // mAh = Current (mA) * Time (hours)
    float duration_hours = profile_.scan_duration_s / 3600.0f;
    return total_active_ma * duration_hours;
}

uint32_t PowerBudgetTracker::calculate_max_scans_on_full_charge() const {
    float scan_mah = calculate_scan_energy_mah();
    if (scan_mah <= 0.0f) return 0;

    // Usable capacity considering 85% depth of discharge (DoD) for battery longevity
    float usable_mah = config::BATTERY_CAPACITY_MAH * 0.85f; // ~5780 mAh
    return static_cast<uint32_t>(usable_mah / scan_mah);
}

uint32_t PowerBudgetTracker::estimate_remaining_scans(uint8_t battery_pct) const {
    float scan_mah = calculate_scan_energy_mah();
    if (scan_mah <= 0.0f || battery_pct <= 10) return 0; // Inhibit below 10%

    float available_pct = static_cast<float>(battery_pct - 10) / 100.0f;
    float available_mah = config::BATTERY_CAPACITY_MAH * available_pct;
    return static_cast<uint32_t>(available_mah / scan_mah);
}

void PowerBudgetTracker::record_scan_completed() {
    lifetime_scans_++;
}

} // namespace aahar::power
