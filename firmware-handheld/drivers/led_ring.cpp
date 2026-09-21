#include "led_ring.h"
#include <cmath>
#include <sstream>
#include <iomanip>

#ifdef ESP_PLATFORM
#include "led_strip.h"
#include "esp_log.h"
static const char* TAG = "LED_RING";
static led_strip_handle_t led_strip = nullptr;
#endif

namespace aahar::drivers {

std::string RgbColor::to_hex_string() const {
    std::ostringstream ss;
    ss << '#'
       << std::hex << std::uppercase << std::setfill('0')
       << std::setw(2) << static_cast<int>(r)
       << std::setw(2) << static_cast<int>(g)
       << std::setw(2) << static_cast<int>(b);
    return ss.str();
}

LedRingController::LedRingController(uint8_t num_pixels, int gpio_pin)
    : num_pixels_(num_pixels), gpio_pin_(gpio_pin) {}

LedRingController::~LedRingController() {
    set_color(RgbColor::Off());
}

bool LedRingController::init() {
#ifdef ESP_PLATFORM
    led_strip_config_t strip_config = {
        .strip_gpio_num = gpio_pin_,
        .max_leds = num_pixels_,
        .led_pixel_format = LED_PIXEL_FORMAT_GRB,
        .led_model = LED_MODEL_WS2812,
        .flags = {
            .invert_out = false,
        }
    };
    led_strip_rmt_config_t rmt_config = {
        .clk_src = RMT_CLK_SRC_DEFAULT,
        .resolution_hz = 10 * 1000 * 1000, // 10MHz
        .flags = {
            .with_dma = false,
        }
    };
    esp_err_t ret = led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize WS2812 RMT driver: %d", ret);
        return false;
    }
    led_strip_clear(led_strip);
    ESP_LOGI(TAG, "WS2812 status ring initialized on GPIO %d (%d pixels)", gpio_pin_, num_pixels_);
#endif
    set_color(RgbColor::Green(), LedRingMode::SOLID);
    return true;
}

void LedRingController::set_color(RgbColor color, LedRingMode mode) {
    current_color_ = color;
    current_mode_ = mode;
    phase_ = 0.0f;
    if (mode == LedRingMode::SOLID || mode == LedRingMode::OFF) {
        render_hardware_pixels(color.r, color.g, color.b);
    }
}

void LedRingController::set_progress(float progress_pct, RgbColor color) {
    progress_pct_ = std::clamp(progress_pct, 0.0f, 100.0f);
    current_color_ = color;
    current_mode_ = LedRingMode::ROTATING;
}

void LedRingController::update_animation(uint32_t delta_ms) {
    if (current_mode_ == LedRingMode::BREATHING) {
        phase_ += (delta_ms / 1000.0f) * 2.0f; // 2 rad/s
        if (phase_ > 6.2831853f) phase_ -= 6.2831853f;
        float factor = 0.3f + 0.7f * (0.5f * (1.0f + std::sin(phase_)));
        render_hardware_pixels(
            static_cast<uint8_t>(current_color_.r * factor),
            static_cast<uint8_t>(current_color_.g * factor),
            static_cast<uint8_t>(current_color_.b * factor)
        );
    } else if (current_mode_ == LedRingMode::ROTATING) {
        uint8_t active_pixels = static_cast<uint8_t>((progress_pct_ / 100.0f) * num_pixels_);
#ifdef ESP_PLATFORM
        if (led_strip) {
            for (uint8_t i = 0; i < num_pixels_; ++i) {
                if (i <= active_pixels) {
                    led_strip_set_pixel(led_strip, i, current_color_.r, current_color_.g, current_color_.b);
                } else {
                    led_strip_set_pixel(led_strip, i, 0, 0, 0);
                }
            }
            led_strip_refresh(led_strip);
        }
#endif
    }
}

void LedRingController::render_hardware_pixels(uint8_t r, uint8_t g, uint8_t b) {
#ifdef ESP_PLATFORM
    if (led_strip) {
        for (uint8_t i = 0; i < num_pixels_; ++i) {
            led_strip_set_pixel(led_strip, i, r, g, b);
        }
        led_strip_refresh(led_strip);
    }
#endif
}

} // namespace aahar::drivers
