#include "isfet_ph.h"
#include "sensor_guard.h"
#include <algorithm>
#include <cmath>

#ifdef ESP_PLATFORM
#include "esp_adc/adc_oneshot.h"
#include "esp_log.h"
static const char* TAG = "ISFET_PH";
static adc_oneshot_unit_handle_t ph_adc = nullptr;
#endif

namespace aahar::probe::sensors {

IsfetPhSensor::IsfetPhSensor(int adc_pin) : adc_pin_(adc_pin) {}
IsfetPhSensor::~IsfetPhSensor() = default;

bool IsfetPhSensor::init() {
#ifdef ESP_PLATFORM
    adc_oneshot_unit_init_cfg_t init_config = {
        .unit_id = ADC_UNIT_1,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    adc_oneshot_new_unit(&init_config, &ph_adc);

    adc_oneshot_chan_cfg_t chan_config = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12,
    };
    adc_oneshot_config_channel(ph_adc, ADC_CHANNEL_0, &chan_config);
    ESP_LOGI(TAG, "ISFET pH probe initialized on ADC1 Ch 0 (GPIO %d)", adc_pin_);
#else
    is_simulated_ = true;
#endif
    return true;
}

float IsfetPhSensor::sample_adc_millivolts() {
#ifdef ESP_PLATFORM
    if (!ph_adc) return 1680.0f; // Default ~pH 4.0
    int sum = 0;
    constexpr int N = 16;
    for (int i = 0; i < N; ++i) {
        int raw = 0;
        adc_oneshot_read(ph_adc, ADC_CHANNEL_0, &raw);
        sum += raw;
    }
    float avg_raw = static_cast<float>(sum) / N;
    return (avg_raw / 4095.0f) * 3100.0f; // mV
#else
    // Inverse Nernst formula for simulation
    return v_offset_mv_ + (7.0f - simulated_ph_) * slope_mv_per_ph_;
#endif
}

float IsfetPhSensor::read_ph(float temp_c, errors::ProbeErrorCode* err_out) {
    // Previously: when no ISFET probe was attached this returned
    // simulated_ph_ (3.95 -- "well preserved silage") together with PROBE_OK.
    // A bunker with no pH probe reported healthy fermentation.
    if (state_ == SensorState::Simulated) {
#if AAHAR_SIMULATION_ALLOWED
        if (err_out) *err_out = errors::ERR_SENSOR_SIMULATED;
        return simulated_ph_;
#else
        if (err_out) *err_out = errors::ERR_SENSOR_NOT_PRESENT;
        return PH_INVALID;
#endif
    }
    if (state_ != SensorState::Ok) {
        if (err_out) *err_out = errors::ERR_SENSOR_NOT_PRESENT;
        return PH_INVALID;
    }

    float mv = sample_adc_millivolts();

    // Temperature compensated Nernstian slope: S(T) = 59.16 * (T_K / 298.15)
    float temp_k = temp_c + 273.15f;
    float temp_slope = slope_mv_per_ph_ * (temp_k / 298.15f);

    float ph = 7.0f + (v_offset_mv_ - mv) / temp_slope;
    ph = std::clamp(ph, 1.0f, 14.0f);

    if (ph < 2.5f || ph > 9.0f) {
        if (err_out) *err_out = errors::ERR_ISFET_PH_OUT_OF_RANGE;
    } else {
        if (err_out) *err_out = errors::PROBE_OK;
    }

    return ph;
}

void IsfetPhSensor::calibrate_point(float buffer_ph, float measured_mv) {
    if (std::abs(buffer_ph - 7.0f) < 0.2f) {
        v_offset_mv_ = measured_mv;
    } else if (std::abs(buffer_ph - 4.01f) < 0.2f) {
        slope_mv_per_ph_ = (measured_mv - v_offset_mv_) / (7.0f - 4.01f);
    }
}

#if AAHAR_SIMULATION_ALLOWED
void IsfetPhSensor::set_simulated_ph(float ph) {
    state_ = SensorState::Simulated;
    is_simulated_ = true;
    simulated_ph_ = ph;
}
#endif

} // namespace aahar::probe::sensors
