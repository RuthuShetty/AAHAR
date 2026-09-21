#include "capacitive_moisture.h"
#include <algorithm>

#ifdef ESP_PLATFORM
#include "esp_adc/adc_oneshot.h"
#include "esp_log.h"
static const char* TAG = "MOISTURE_LANCE";
static adc_oneshot_unit_handle_t moist_adc = nullptr;
#endif

namespace aahar::probe::sensors {

CapacitiveMoistureSensor::CapacitiveMoistureSensor(int adc_pin) : adc_pin_(adc_pin) {}
CapacitiveMoistureSensor::~CapacitiveMoistureSensor() = default;

bool CapacitiveMoistureSensor::init() {
#ifdef ESP_PLATFORM
    adc_oneshot_chan_cfg_t chan_config = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12,
    };
    adc_oneshot_config_channel(moist_adc, ADC_CHANNEL_1, &chan_config);
    ESP_LOGI(TAG, "Capacitive moisture lance initialized on GPIO %d", adc_pin_);
#else
    is_simulated_ = true;
#endif
    return true;
}

float CapacitiveMoistureSensor::sample_adc_millivolts() {
#ifdef ESP_PLATFORM
    if (!moist_adc) return 1850.0f;
    int sum = 0;
    constexpr int N = 16;
    for (int i = 0; i < N; ++i) {
        int raw = 0;
        adc_oneshot_read(moist_adc, ADC_CHANNEL_1, &raw);
        sum += raw;
    }
    return (static_cast<float>(sum) / N / 4095.0f) * 3100.0f;
#else
    // 3000 mV in air (~10%), 1200 mV in wet silage (~75%)
    return 3200.0f - (simulated_moisture_ / 100.0f) * 2600.0f;
#endif
}

float CapacitiveMoistureSensor::read_moisture_pct(errors::ProbeErrorCode* err_out) {
    if (is_simulated_) {
        if (err_out) *err_out = errors::PROBE_OK;
        return MOISTURE_INVALID;  // was: fabricated 66.5%
    }

    float mv = sample_adc_millivolts();
    // Calibration curve: Higher capacitance (higher moisture) -> Lower frequency/voltage
    // V_air = 3100 mV (0% moisture), V_water = 800 mV (100% moisture)
    float moisture = ((3100.0f - mv) / (3100.0f - 800.0f)) * 100.0f;
    moisture = std::clamp(moisture, 0.0f, 100.0f);

    if (mv > 3050.0f) {
        if (err_out) *err_out = errors::ERR_MOISTURE_DISCONNECTED;
    } else {
        if (err_out) *err_out = errors::PROBE_OK;
    }

    return moisture;
}

void CapacitiveMoistureSensor::set_simulated_moisture(float moisture_pct) {
    is_simulated_ = true;
    state_ = SensorState::Simulated;
    simulated_moisture_ = moisture_pct;
}

} // namespace aahar::probe::sensors
