#include "probe_power.h"

#ifdef ESP_PLATFORM
#include "esp_sleep.h"
#include "driver/gpio.h"
#include "esp_log.h"
static const char* TAG = "PROBE_POWER";
#endif

namespace aahar::probe::power {

ProbePowerManager::ProbePowerManager(const ProbePowerProfile& profile)
    : profile_(profile) {}

ProbePowerManager::~ProbePowerManager() = default;

bool ProbePowerManager::init() {
#ifdef ESP_PLATFORM
    // Configure high-side MOSFET switch for sensor power rail
    gpio_config_t io_conf = {};
    io_conf.mode = GPIO_MODE_OUTPUT;
    io_conf.pin_bit_mask = (1ULL << config::PIN_SENSOR_POWER_EN);
    gpio_config(&io_conf);
    enable_sensor_power(false);
    ESP_LOGI(TAG, "Sensor power isolation rail initialized on GPIO %d", config::PIN_SENSOR_POWER_EN);
#endif
    return true;
}

void ProbePowerManager::enable_sensor_power(bool enable) {
    sensor_rail_enabled_ = enable;
#ifdef ESP_PLATFORM
    // Active HIGH closes high-side P-channel gate driver
    gpio_set_level(static_cast<gpio_num_t>(config::PIN_SENSOR_POWER_EN), enable ? 1 : 0);
#endif
}

void ProbePowerManager::enter_deep_sleep(uint32_t sleep_seconds) {
    enable_sensor_power(false);
#ifdef ESP_PLATFORM
    ESP_LOGI(TAG, "Entering 15-minute Deep Sleep (%u s, current ~18 uA)...", (unsigned)sleep_seconds);
    esp_sleep_enable_timer_wakeup(static_cast<uint64_t>(sleep_seconds) * 1000000ULL);
    esp_deep_sleep_start();
#endif
}

float ProbePowerManager::calculate_cycle_energy_uah() const {
    // 1. Active sensor sampling energy: 25 mA * 5 s = 125 mAs = 0.0347 mAh = 34.72 uAh
    float active_uah = (profile_.active_current_ma * 1000.0f) * (profile_.active_duration_s / 3600.0f);

    // 2. LoRa TX burst: 120 mA * 0.08 s = 9.6 mAs = 0.00267 mAh = 2.67 uAh
    float lora_uah = (profile_.lora_tx_current_ma * 1000.0f) * ((profile_.lora_tx_duration_ms / 1000.0f) / 3600.0f);

    // 3. Deep sleep: 18 uA * (900 - 5.08) s = 18 uA * (894.92 / 3600) h = 4.47 uAh
    float sleep_duration_s = profile_.cycle_period_s - profile_.active_duration_s - (profile_.lora_tx_duration_ms / 1000.0f);
    float sleep_uah = profile_.deep_sleep_current_ua * (sleep_duration_s / 3600.0f);

    return active_uah + lora_uah + sleep_uah;
}

float ProbePowerManager::calculate_average_current_ma() const {
    float cycle_hours = profile_.cycle_period_s / 3600.0f; // 0.25 h
    float cycle_uah = calculate_cycle_energy_uah();
    float cycle_mah = cycle_uah / 1000.0f;
    return cycle_mah / cycle_hours;
}

float ProbePowerManager::calculate_battery_life_months() const {
    float avg_ma = calculate_average_current_ma();
    if (avg_ma <= 0.0f) return 0.0f;

    // 85% usable depth of discharge
    float usable_mah = profile_.battery_capacity_mah * 0.85f;
    float hours = usable_mah / avg_ma;
    float days = hours / 24.0f;
    return days / 30.4375f; // months
}

} // namespace aahar::probe::power
