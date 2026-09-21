#include "illumination.h"
#include <algorithm>
#include <cmath>

#ifdef ESP_PLATFORM
#include "driver/ledc.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
static const char* TAG = "ILLUMINATION";
#endif

namespace aahar::drivers {

IlluminationController::IlluminationController() = default;

IlluminationController::~IlluminationController() {
    emergency_cutoff();
}

bool IlluminationController::init() {
#ifdef ESP_PLATFORM
    // Configure LEDC Timer for Halogen PWM (25 kHz ultrasonic)
    ledc_timer_config_t ledc_timer = {
        .speed_mode       = LEDC_LOW_SPEED_MODE,
        .duty_resolution  = LEDC_TIMER_12_BIT, // 0-4095
        .timer_num        = LEDC_TIMER_0,
        .freq_hz          = config::PWM_TIMER_FREQ_HZ,
        .clk_cfg          = LEDC_AUTO_CLK
    };
    ledc_timer_config(&ledc_timer);

    // Channel 0: Halogen 1
    ledc_channel_config_t ledc_ch1 = {
        .gpio_num       = config::PIN_HALOGEN_PWM_1,
        .speed_mode     = LEDC_LOW_SPEED_MODE,
        .channel        = LEDC_CHANNEL_0,
        .intr_type      = LEDC_INTR_DISABLE,
        .timer_sel      = LEDC_TIMER_0,
        .duty           = 0,
        .hpoint         = 0
    };
    ledc_channel_config(&ledc_ch1);

    // Channel 1: Halogen 2
    ledc_channel_config_t ledc_ch2 = {
        .gpio_num       = config::PIN_HALOGEN_PWM_2,
        .speed_mode     = LEDC_LOW_SPEED_MODE,
        .channel        = LEDC_CHANNEL_1,
        .intr_type      = LEDC_INTR_DISABLE,
        .timer_sel      = LEDC_TIMER_0,
        .duty           = 0,
        .hpoint         = 0
    };
    ledc_channel_config(&ledc_ch2);

    // GPIO for NIR LED Bank & UV LED
    gpio_config_t io_conf = {};
    io_conf.intr_type = GPIO_INTR_DISABLE;
    io_conf.mode = GPIO_MODE_OUTPUT;
    io_conf.pin_bit_mask = (1ULL << config::PIN_NIR_LED_BANK) | (1ULL << config::PIN_UV_365NM_LED);
    io_conf.pull_down_en = GPIO_PULLDOWN_ENABLE;
    io_conf.pull_up_en = GPIO_PULLUP_DISABLE;
    gpio_config(&io_conf);

    gpio_set_level(static_cast<gpio_num_t>(config::PIN_NIR_LED_BANK), 0);
    gpio_set_level(static_cast<gpio_num_t>(config::PIN_UV_365NM_LED), 0);
    ESP_LOGI(TAG, "Illumination system initialized (2x Halogen PWM + NIR Bank + UV LED)");
#endif
    initialized_ = true;
    return true;
}

bool IlluminationController::start_halogen_ramp(uint32_t ramp_duration_ms) {
    if (overtemp_trip_) {
        return false;
    }

    constexpr uint32_t step_ms = 50;
    const uint32_t num_steps = ramp_duration_ms / step_ms;
    
    for (uint32_t i = 1; i <= num_steps; ++i) {
        if (overtemp_trip_) {
            emergency_cutoff();
            return false;
        }
        // S-curve / sinusoidal soft-start ramp: 0.5 * (1 - cos(pi * t))
        float progress = static_cast<float>(i) / static_cast<float>(num_steps);
        float duty = 0.5f * (1.0f - std::cos(3.14159265f * progress)) * 100.0f;
        set_halogen_duty(duty);

#ifdef ESP_PLATFORM
        vTaskDelay(pdMS_TO_TICKS(step_ms));
#endif
    }
    set_halogen_duty(100.0f);
    return true;
}

void IlluminationController::set_halogen_duty(float duty_pct) {
    if (overtemp_trip_ && duty_pct > 0.0f) {
        return;
    }
    halogen_duty_ = std::clamp(duty_pct, 0.0f, 100.0f);
    apply_hardware_pwm();
}

void IlluminationController::set_nir_leds(bool enable) {
    nir_leds_on_ = enable;
#ifdef ESP_PLATFORM
    gpio_set_level(static_cast<gpio_num_t>(config::PIN_NIR_LED_BANK), enable ? 1 : 0);
#endif
}

void IlluminationController::set_uv_led(bool enable) {
    uv_led_on_ = enable;
#ifdef ESP_PLATFORM
    gpio_set_level(static_cast<gpio_num_t>(config::PIN_UV_365NM_LED), enable ? 1 : 0);
#endif
}

void IlluminationController::set_mode(LightSourceMode mode) {
    switch (mode) {
        case LightSourceMode::OFF:
            emergency_cutoff();
            break;
        case LightSourceMode::HALOGEN_BROADBAND:
            set_nir_leds(false);
            set_uv_led(false);
            start_halogen_ramp();
            break;
        case LightSourceMode::NIR_LED_NARROWBAND:
            set_halogen_duty(0.0f);
            set_uv_led(false);
            set_nir_leds(true);
            break;
        case LightSourceMode::UV_FLUORESCENCE:
            set_halogen_duty(0.0f);
            set_nir_leds(false);
            set_uv_led(true);
            break;
        case LightSourceMode::COMBINED_ALL:
            set_nir_leds(true);
            set_uv_led(true);
            start_halogen_ramp();
            break;
    }
}

void IlluminationController::emergency_cutoff() {
    halogen_duty_ = 0.0f;
    nir_leds_on_ = false;
    uv_led_on_ = false;
    apply_hardware_pwm();
#ifdef ESP_PLATFORM
    gpio_set_level(static_cast<gpio_num_t>(config::PIN_NIR_LED_BANK), 0);
    gpio_set_level(static_cast<gpio_num_t>(config::PIN_UV_365NM_LED), 0);
    ESP_LOGW(TAG, "EMERGENCY CUTOFF TRIGGERED — All light sources turned OFF");
#endif
}

void IlluminationController::update_lamp_temp(float temp_c) {
    lamp_temp_c_ = temp_c;
    if (temp_c > 65.0f) {
        overtemp_trip_ = true;
        emergency_cutoff();
    } else if (temp_c < 55.0f) {
        overtemp_trip_ = false;
    }
}

void IlluminationController::apply_hardware_pwm() {
#ifdef ESP_PLATFORM
    uint32_t raw_duty = static_cast<uint32_t>((halogen_duty_ / 100.0f) * 4095.0f);
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, raw_duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_1, raw_duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_1);
#endif
}

} // namespace aahar::drivers
