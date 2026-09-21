/**
 * AAHAR Silage Probe — Ultra-Low-Power Management & Battery Life Tracker
 * Manages 15-minute deep sleep cycles (18 uA) and high-side sensor rail power isolation.
 * Proves > 14 months battery life on 5000 mAh cell without solar.
 */

#pragma once
#ifndef AAHAR_PROBE_POWER_H
#define AAHAR_PROBE_POWER_H

#include <cstdint>
#include "probe_config.h"

namespace aahar::probe::power {

struct ProbePowerProfile {
    float battery_capacity_mah = config::BATTERY_CAPACITY_MAH; // 5000 mAh
    float deep_sleep_current_ua = config::DEEP_SLEEP_CURRENT_UA; // 18 uA
    float active_current_ma    = config::ACTIVE_CURRENT_MA;     // 25 mA
    float active_duration_s    = 5.0f;                          // 5 seconds
    float lora_tx_current_ma   = config::LORA_TX_CURRENT_MA;    // 120 mA
    float lora_tx_duration_ms  = config::LORA_TX_DURATION_MS;   // 80 ms
    float cycle_period_s       = static_cast<float>(config::SAMPLE_INTERVAL_S); // 900 s (15 min)
};

class ProbePowerManager {
public:
    ProbePowerManager(const ProbePowerProfile& profile = ProbePowerProfile());
    ~ProbePowerManager();

    bool init();
    void enable_sensor_power(bool enable);
    void enter_deep_sleep(uint32_t sleep_seconds = config::SAMPLE_INTERVAL_S);

    // Energy calculations
    float calculate_cycle_energy_uah() const;
    float calculate_average_current_ma() const;
    float calculate_battery_life_months() const;
    bool satisfies_master_constraint() const {
        return calculate_battery_life_months() >= 14.0f;
    }

private:
    ProbePowerProfile profile_;
    bool sensor_rail_enabled_ = false;
};

} // namespace aahar::probe::power

#endif // AAHAR_PROBE_POWER_H
