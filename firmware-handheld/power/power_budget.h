/**
 * AAHAR Handheld — Power Budget & Battery Life Simulator
 * Proves and monitors the non-negotiable constraint: >= 60 scans / charge
 * Dual 18650 Li-ion cells (6800 mAh @ 3.7V nominal).
 */

#pragma once
#ifndef AAHAR_POWER_BUDGET_H
#define AAHAR_POWER_BUDGET_H

#include <cstdint>
#include "aahar_config.h"

namespace aahar::power {

struct ScanPowerProfile {
    float esp32_active_ma       = 100.0f; // Dual-core 240MHz + BLE 5.0
    float halogen_lamps_ma      = 450.0f; // 2x tungsten-halogen micro-lamps
    float spectral_sensor_ma    = 20.0f;  // C12880MA or AS7265x
    float ui_led_oled_ma        = 35.0f;  // WS2812 status ring + OLED
    float camera_burst_avg_ma   = 5.0f;   // OV5640 4-angle burst
    float scan_duration_s       = 90.0f;  // 90 seconds scan
    float idle_power_ma         = 15.0f;  // Idle with BLE advertising
    float light_sleep_ma        = 0.8f;   // Light sleep
    float deep_sleep_ua         = 18.0f;  // Deep sleep
};

class PowerBudgetTracker {
public:
    PowerBudgetTracker(const ScanPowerProfile& profile = ScanPowerProfile());

    // Calculate mAh consumed during a single 90s scan
    float calculate_scan_energy_mah() const;

    // Calculate maximum scans possible on a full charge (6800 mAh)
    uint32_t calculate_max_scans_on_full_charge() const;

    // Calculate remaining scans possible given current battery percentage
    uint32_t estimate_remaining_scans(uint8_t battery_pct) const;

    // Validate that the system satisfies the master specification: >= 60 scans/charge
    bool satisfies_master_constraint() const {
        return calculate_max_scans_on_full_charge() >= config::MIN_SCANS_PER_CHARGE;
    }

    void record_scan_completed();
    uint32_t get_lifetime_scans() const { return lifetime_scans_; }

private:
    ScanPowerProfile profile_;
    uint32_t lifetime_scans_ = 0;
};

} // namespace aahar::power

#endif // AAHAR_POWER_BUDGET_H
