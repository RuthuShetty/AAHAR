/**
 * AAHAR Handheld — Status LED Ring Driver (WS2812B / RGB)
 * Encodes system state into standard AAHAR visual semantics:
 *  Green #2E7D32, Amber #F9A825, Red #C62828, Blue #1565C0
 */

#pragma once
#ifndef AAHAR_LED_RING_H
#define AAHAR_LED_RING_H

#include <cstdint>
#include <string>
#include "aahar_config.h"

namespace aahar::drivers {

enum class LedRingMode {
    SOLID,
    BREATHING,
    ROTATING,
    OFF
};

struct RgbColor {
    uint8_t r = 0;
    uint8_t g = 0;
    uint8_t b = 0;

    static constexpr RgbColor Green() { return {46, 125, 50}; }   // #2E7D32
    static constexpr RgbColor Amber() { return {249, 168, 37}; }  // #F9A825
    static constexpr RgbColor Red()   { return {198, 40, 40}; }   // #C62828
    static constexpr RgbColor Blue()  { return {21, 101, 192}; }  // #1565C0
    static constexpr RgbColor Off()   { return {0, 0, 0}; }

    std::string to_hex_string() const;
};

class LedRingController {
public:
    LedRingController(uint8_t num_pixels = 16, int gpio_pin = config::PIN_WS2812_LED_RING);
    ~LedRingController();

    bool init();
    void set_color(RgbColor color, LedRingMode mode = LedRingMode::SOLID);
    void set_progress(float progress_pct, RgbColor color);
    void update_animation(uint32_t delta_ms);

    RgbColor get_active_color() const { return current_color_; }
    std::string get_active_hex_color() const { return current_color_.to_hex_string(); }

private:
    uint8_t num_pixels_;
    int gpio_pin_;
    RgbColor current_color_ = RgbColor::Green();
    LedRingMode current_mode_ = LedRingMode::SOLID;
    float phase_ = 0.0f;
    float progress_pct_ = 0.0f;

    void render_hardware_pixels(uint8_t r, uint8_t g, uint8_t b);
};

} // namespace aahar::drivers

#endif // AAHAR_LED_RING_H
