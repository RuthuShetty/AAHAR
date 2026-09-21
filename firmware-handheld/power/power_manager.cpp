#include "power_manager.h"

#ifdef ESP_PLATFORM
#include "esp_sleep.h"
#include "esp_pm.h"
#include "driver/gpio.h"
#include "esp_log.h"
static const char* TAG = "POWER_MANAGER";
#endif

namespace aahar::power {

PowerManager::PowerManager(drivers::BatteryManager& battery, PowerBudgetTracker& budget)
    : battery_(battery), budget_(budget) {}

PowerManager::~PowerManager() = default;

bool PowerManager::init() {
#ifdef ESP_PLATFORM
    // Configure button wakeup on GPIO 0
    esp_sleep_enable_ext0_wakeup(static_cast<gpio_num_t>(config::PIN_USER_SCAN_BUTTON), 0);
    ESP_LOGI(TAG, "Power manager initialized (Wake source: GPIO %d)", config::PIN_USER_SCAN_BUTTON);
#endif
    return true;
}

void PowerManager::set_state(PowerState state) {
    if (current_state_ == state) return;
    current_state_ = state;
    feed_inactivity_timer();

    switch (state) {
        case PowerState::ACTIVE_SCAN:
#ifdef ESP_PLATFORM
            // Lock CPU frequency to 240 MHz max performance
#endif
            break;
        case PowerState::IDLE:
#ifdef ESP_PLATFORM
            // Enable dynamic frequency scaling (80-240 MHz)
#endif
            break;
        case PowerState::LIGHT_SLEEP:
#ifdef ESP_PLATFORM
            // Enter light sleep with BLE advertising maintained
            esp_light_sleep_start();
#endif
            break;
        case PowerState::DEEP_SLEEP:
            enter_deep_sleep();
            break;
    }
}

void PowerManager::feed_inactivity_timer() {
    inactive_time_ms_ = 0;
}

void PowerManager::update(uint32_t delta_ms) {
    if (current_state_ == PowerState::ACTIVE_SCAN) {
        inactive_time_ms_ = 0;
        return;
    }

    inactive_time_ms_ += delta_ms;

    if (inactive_time_ms_ >= DEEP_SLEEP_TIMEOUT_MS) {
        set_state(PowerState::DEEP_SLEEP);
    } else if (inactive_time_ms_ >= LIGHT_SLEEP_TIMEOUT_MS && current_state_ == PowerState::IDLE) {
        set_state(PowerState::LIGHT_SLEEP);
    }
}

void PowerManager::enter_deep_sleep() {
#ifdef ESP_PLATFORM
    ESP_LOGI(TAG, "Entering Deep Sleep (Current draw ~18 uA)...");
    esp_deep_sleep_start();
#endif
}

} // namespace aahar::power
