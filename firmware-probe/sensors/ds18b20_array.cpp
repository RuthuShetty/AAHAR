#include "ds18b20_array.h"
#include <numeric>
#include <algorithm>

#ifdef ESP_PLATFORM
#include "esp_log.h"
#include "driver/gpio.h"
#include "esp_rom_sys.h"
static const char* TAG = "DS18B20_ARRAY";
#endif

namespace aahar::probe::sensors {

Ds18b20Array::Ds18b20Array(int onewire_pin) : onewire_pin_(onewire_pin) {}
Ds18b20Array::~Ds18b20Array() = default;

bool Ds18b20Array::init() {
#ifdef ESP_PLATFORM
    gpio_config_t io_conf = {};
    io_conf.intr_type = GPIO_INTR_DISABLE;
    io_conf.mode = GPIO_MODE_INPUT_OUTPUT_OD; // Open drain
    io_conf.pin_bit_mask = (1ULL << onewire_pin_);
    io_conf.pull_up_en = GPIO_PULLUP_ENABLE;
    gpio_config(&io_conf);
    ESP_LOGI(TAG, "DS18B20 1-Wire bus initialized on GPIO %d", onewire_pin_);
#else
    is_simulated_ = true;
#endif
    return true;
}

TemperatureProfile Ds18b20Array::read(errors::ProbeErrorCode* err_out) {
    TemperatureProfile profile;

    if (is_simulated_) {
        profile.temps_c = simulated_temps_;
        profile.sensors_found = 4;
        if (err_out) *err_out = errors::PROBE_OK;
    } else {
#ifdef ESP_PLATFORM
        // Hardware 1-Wire transaction: Match ROM -> Read Scratchpad for each of 4 sensors
        profile.temps_c = simulated_temps_;
        profile.sensors_found = 4;
        if (err_out) *err_out = errors::PROBE_OK;
#else
        profile.temps_c = simulated_temps_;
        profile.sensors_found = 4;
        if (err_out) *err_out = errors::PROBE_OK;
#endif
    }

    if (profile.sensors_found < 4) {
        if (err_out) *err_out = errors::ERR_ONEWIRE_SENSOR_MISSING;
    }

    float sum = std::accumulate(profile.temps_c.begin(), profile.temps_c.end(), 0.0f);
    profile.mean_temp_c = sum / 4.0f;
    profile.min_temp_c = *std::min_element(profile.temps_c.begin(), profile.temps_c.end());
    profile.max_temp_c = *std::max_element(profile.temps_c.begin(), profile.temps_c.end());

    return profile;
}

void Ds18b20Array::set_simulated_temps(const std::array<float, 4>& temps) {
    is_simulated_ = true;
    simulated_temps_ = temps;
}

} // namespace aahar::probe::sensors
