#include "pmic_bq24074.h"
#include <algorithm>

#ifdef ESP_PLATFORM
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_log.h"
static const char* TAG = "BATTERY_PMIC";
static adc_oneshot_unit_handle_t adc_handle = nullptr;
#endif

namespace aahar::drivers {

BatteryManager::BatteryManager() = default;
BatteryManager::~BatteryManager() = default;

bool BatteryManager::init() {
#ifdef ESP_PLATFORM
    // Configure PMIC status GPIOs
    gpio_config_t io_conf = {};
    io_conf.intr_type = GPIO_INTR_DISABLE;
    io_conf.mode = GPIO_MODE_INPUT;
    io_conf.pin_bit_mask = (1ULL << config::PIN_PMIC_CHG_STAT) | (1ULL << config::PIN_PMIC_POWER_GOOD);
    io_conf.pull_up_en = GPIO_PULLUP_ENABLE;
    io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
    gpio_config(&io_conf);

    // Configure ADC1 for Battery Voltage divider
    adc_oneshot_unit_init_cfg_t init_config = {
        .unit_id = ADC_UNIT_1,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    adc_oneshot_new_unit(&init_config, &adc_handle);

    adc_oneshot_chan_cfg_t chan_config = {
        .atten = ADC_ATTEN_DB_12, // Up to ~3.1V on pin
        .bitwidth = ADC_BITWIDTH_12,
    };
    adc_oneshot_config_channel(adc_handle, ADC_CHANNEL_4, &chan_config);

    ESP_LOGI(TAG, "Battery & PMIC subsystem initialized");
#else
    is_simulated_ = true;
#endif
    read_status();
    return true;
}

float BatteryManager::sample_adc_voltage() {
#ifdef ESP_PLATFORM
    if (!adc_handle) return 3.85f;
    int raw_val = 0;
    int sum = 0;
    constexpr int samples = 16;
    for (int i = 0; i < samples; ++i) {
        adc_oneshot_read(adc_handle, ADC_CHANNEL_4, &raw_val);
        sum += raw_val;
    }
    float avg_raw = static_cast<float>(sum) / samples;
    // 12-bit ADC (0-4095) with 12dB attenuation (~3100 mV full scale)
    // 1:1 voltage divider (2x multiplier)
    float pin_voltage_mv = (avg_raw / 4095.0f) * 3100.0f;
    float battery_v = (pin_voltage_mv * 2.0f) / 1000.0f;
    return battery_v;
#else
    return status_.voltage_v;
#endif
}

uint8_t BatteryManager::voltage_to_soc_pct(float voltage) {
    // Li-ion 18650 discharge curve OCV lookup table
    // 4.20V = 100%, 4.05V = 90%, 3.92V = 80%, 3.82V = 70%, 3.75V = 60%,
    // 3.70V = 50%, 3.65V = 40%, 3.60V = 30%, 3.52V = 20%, 3.40V = 10%, 3.20V = 0%
    if (voltage >= 4.18f) return 100;
    if (voltage >= 4.05f) return 90 + static_cast<uint8_t>((voltage - 4.05f) / (4.18f - 4.05f) * 10);
    if (voltage >= 3.92f) return 80 + static_cast<uint8_t>((voltage - 3.92f) / (4.05f - 3.92f) * 10);
    if (voltage >= 3.82f) return 70 + static_cast<uint8_t>((voltage - 3.82f) / (3.92f - 3.82f) * 10);
    if (voltage >= 3.74f) return 60 + static_cast<uint8_t>((voltage - 3.74f) / (3.82f - 3.74f) * 10);
    if (voltage >= 3.68f) return 50 + static_cast<uint8_t>((voltage - 3.68f) / (3.74f - 3.68f) * 10);
    if (voltage >= 3.62f) return 40 + static_cast<uint8_t>((voltage - 3.62f) / (3.68f - 3.62f) * 10);
    if (voltage >= 3.55f) return 30 + static_cast<uint8_t>((voltage - 3.55f) / (3.62f - 3.55f) * 10);
    if (voltage >= 3.45f) return 20 + static_cast<uint8_t>((voltage - 3.45f) / (3.55f - 3.45f) * 10);
    if (voltage >= 3.35f) return 10 + static_cast<uint8_t>((voltage - 3.35f) / (3.45f - 3.35f) * 10);
    if (voltage >= 3.20f) return static_cast<uint8_t>((voltage - 3.20f) / (3.35f - 3.20f) * 10);
    return 0;
}

BatteryStatus BatteryManager::read_status() {
    if (!is_simulated_) {
        status_.voltage_v = sample_adc_voltage();
        status_.percentage = voltage_to_soc_pct(status_.voltage_v);
#ifdef ESP_PLATFORM
        bool pgood = gpio_get_level(static_cast<gpio_num_t>(config::PIN_PMIC_POWER_GOOD)) == 0;
        bool chg   = gpio_get_level(static_cast<gpio_num_t>(config::PIN_PMIC_CHG_STAT)) == 0;
        status_.usb_power_connected = pgood;
        if (pgood && chg) {
            status_.charging = ChargingState::CHARGING;
        } else if (pgood && !chg) {
            status_.charging = ChargingState::CHARGE_COMPLETE;
        } else {
            status_.charging = ChargingState::NOT_CHARGING;
        }
#endif
    }

    status_.is_low_battery = (status_.percentage <= 15);
    status_.is_critical = (status_.percentage <= 10 || status_.voltage_v < config::MIN_VOLTAGE_V);
    return status_;
}

void BatteryManager::set_simulated_voltage(float v) {
    is_simulated_ = true;
    status_.voltage_v = v;
    status_.percentage = voltage_to_soc_pct(v);
    status_.is_low_battery = (status_.percentage <= 15);
    status_.is_critical = (status_.percentage <= 10 || status_.voltage_v < config::MIN_VOLTAGE_V);
}

} // namespace aahar::drivers
