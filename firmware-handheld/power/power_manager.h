/**
 * AAHAR Handheld — Power State Manager
 * Transitions between ACTIVE_SCAN, IDLE, LIGHT_SLEEP, and DEEP_SLEEP.
 */

#pragma once
#ifndef AAHAR_POWER_MANAGER_H
#define AAHAR_POWER_MANAGER_H

#include <cstdint>
#include "power_budget.h"
#include "drivers/pmic_bq24074.h"

namespace aahar::power {

enum class PowerState {
    ACTIVE_SCAN,
    IDLE,
    LIGHT_SLEEP,
    DEEP_SLEEP
};

class PowerManager {
public:
    PowerManager(drivers::BatteryManager& battery, PowerBudgetTracker& budget);
    ~PowerManager();

    bool init();
    void set_state(PowerState state);
    PowerState get_state() const { return current_state_; }

    void feed_inactivity_timer();
    void update(uint32_t delta_ms);

    void enter_deep_sleep();

private:
    drivers::BatteryManager& battery_;
    PowerBudgetTracker& budget_;
    PowerState current_state_ = PowerState::IDLE;

    uint32_t inactive_time_ms_ = 0;
    static constexpr uint32_t LIGHT_SLEEP_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
    static constexpr uint32_t DEEP_SLEEP_TIMEOUT_MS  = 15 * 60 * 1000; // 15 minutes
};

} // namespace aahar::power

#endif // AAHAR_POWER_MANAGER_H
