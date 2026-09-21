#include "c12880ma.h"
#include <cmath>

#ifdef ESP_PLATFORM
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_rom_sys.h"
#include "esp_log.h"
static const char* TAG = "C12880MA";
static adc_oneshot_unit_handle_t spec_adc = nullptr;
#endif

namespace aahar::drivers {

HamamatsuC12880MA::HamamatsuC12880MA(int clk, int st, int trg, int eos, int adc)
    : clk_pin_(clk), st_pin_(st), trg_pin_(trg), eos_pin_(eos), adc_pin_(adc) {
    // Generate realistic simulated baseline curve
    for (size_t i = 0; i < C12880MA_NUM_PIXELS; ++i) {
        float wl = calib_coeffs_.pixel_to_wavelength(static_cast<uint16_t>(i));
        // Baseline curve with characteristic absorption dip
        float val = 2048.0f + 1200.0f * std::sin((wl - 400.0f) / 150.0f);
        simulated_buffer_[i] = static_cast<uint16_t>(std::clamp(val, 200.0f, 4000.0f));
    }
}

HamamatsuC12880MA::~HamamatsuC12880MA() = default;

bool HamamatsuC12880MA::init() {
#ifdef ESP_PLATFORM
    gpio_config_t out_conf = {};
    out_conf.intr_type = GPIO_INTR_DISABLE;
    out_conf.mode = GPIO_MODE_OUTPUT;
    out_conf.pin_bit_mask = (1ULL << clk_pin_) | (1ULL << st_pin_);
    out_conf.pull_down_en = GPIO_PULLDOWN_ENABLE;
    gpio_config(&out_conf);

    gpio_config_t in_conf = {};
    in_conf.intr_type = GPIO_INTR_DISABLE;
    in_conf.mode = GPIO_MODE_INPUT;
    in_conf.pin_bit_mask = (1ULL << trg_pin_) | (1ULL << eos_pin_);
    in_conf.pull_up_en = GPIO_PULLUP_ENABLE;
    gpio_config(&in_conf);

    gpio_set_level(static_cast<gpio_num_t>(clk_pin_), 0);
    gpio_set_level(static_cast<gpio_num_t>(st_pin_), 0);

    // Configure ADC1 channel 3 for Video analog output
    adc_oneshot_unit_init_cfg_t init_config = {
        .unit_id = ADC_UNIT_1,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    adc_oneshot_new_unit(&init_config, &spec_adc);

    adc_oneshot_chan_cfg_t chan_config = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12,
    };
    adc_oneshot_config_channel(spec_adc, ADC_CHANNEL_3, &chan_config);

    ESP_LOGI(TAG, "Hamamatsu C12880MA initialized (CLK=%d, ST=%d, ADC=%d)", clk_pin_, st_pin_, adc_pin_);
#else
    is_simulated_ = true;
#endif
    return true;
}

void HamamatsuC12880MA::set_integration_time_us(uint32_t integration_us) {
    integration_time_us_ = std::clamp(integration_us, 10u, 100000u);
}

void HamamatsuC12880MA::pulse_clock(uint32_t count) {
#ifdef ESP_PLATFORM
    for (uint32_t i = 0; i < count; ++i) {
        gpio_set_level(static_cast<gpio_num_t>(clk_pin_), 1);
        esp_rom_delay_us(1);
        gpio_set_level(static_cast<gpio_num_t>(clk_pin_), 0);
        esp_rom_delay_us(1);
    }
#else
    (void)count;
#endif
}

bool HamamatsuC12880MA::capture_raw(std::array<uint16_t, C12880MA_NUM_PIXELS>& raw_out) {
    if (is_simulated_) {
        raw_out = simulated_buffer_;
        return true;
    }

#ifdef ESP_PLATFORM
    // Hamamatsu C12880MA Timing Protocol:
    // 1. ST goes HIGH for integration start
    gpio_set_level(static_cast<gpio_num_t>(st_pin_), 1);
    pulse_clock(1);
    gpio_set_level(static_cast<gpio_num_t>(st_pin_), 0);

    // 2. Integration period
    esp_rom_delay_us(integration_time_us_);

    // 3. Lead clock pulses before pixel 0 video output
    pulse_clock(88);

    // 4. Read each of the 288 pixels on clock transitions
    for (size_t i = 0; i < C12880MA_NUM_PIXELS; ++i) {
        gpio_set_level(static_cast<gpio_num_t>(clk_pin_), 1);
        esp_rom_delay_us(1);

        int adc_val = 0;
        adc_oneshot_read(spec_adc, ADC_CHANNEL_3, &adc_val);
        raw_out[i] = static_cast<uint16_t>(adc_val);

        gpio_set_level(static_cast<gpio_num_t>(clk_pin_), 0);
        esp_rom_delay_us(1);
    }

    // 5. Tail clock pulses until EOS (End of Scan)
    pulse_clock(8);
    return true;
#else
    raw_out = simulated_buffer_;
    return true;
#endif
}

std::array<float, C12880MA_NUM_PIXELS> HamamatsuC12880MA::get_wavelengths() const {
    std::array<float, C12880MA_NUM_PIXELS> wls{};
    for (size_t i = 0; i < C12880MA_NUM_PIXELS; ++i) {
        wls[i] = calib_coeffs_.pixel_to_wavelength(static_cast<uint16_t>(i));
    }
    return wls;
}

void HamamatsuC12880MA::set_calibration_coeffs(const WavelengthCalibrationCoeffs& coeffs) {
    calib_coeffs_ = coeffs;
}

void HamamatsuC12880MA::set_simulated_spectrum(const std::array<uint16_t, C12880MA_NUM_PIXELS>& simulated) {
    is_simulated_ = true;
    simulated_buffer_ = simulated;
}

} // namespace aahar::drivers
