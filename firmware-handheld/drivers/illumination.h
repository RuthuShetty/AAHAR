/**
 * AAHAR Handheld — Illumination & Optical Light Source Driver
 * Controls dual tungsten-halogen micro-lamps (soft-start PWM),
 * 6x 1450/1650nm NIR LEDs, and 365nm UV LED.
 */

#pragma once
#ifndef AAHAR_ILLUMINATION_H
#define AAHAR_ILLUMINATION_H

#include <cstdint>
#include "aahar_config.h"

namespace aahar::drivers {

enum class LightSourceMode {
    OFF,
    HALOGEN_BROADBAND,  // Dual halogen lamps on (proximates sweep)
    NIR_LED_NARROWBAND, // 1450/1650nm LED bank on
    UV_FLUORESCENCE,    // 365nm UV excitation (Aflatoxin B1)
    COMBINED_ALL
};

class IlluminationController {
public:
    IlluminationController();
    ~IlluminationController();

    bool init();
    
    // Soft-start halogen lamps with linear/exponential duty cycle ramp
    bool start_halogen_ramp(uint32_t ramp_duration_ms = config::LAMP_WARMUP_TIME_MS);
    void set_halogen_duty(float duty_pct); // 0.0 to 100.0%
    void set_nir_leds(bool enable);
    void set_uv_led(bool enable);
    void set_mode(LightSourceMode mode);
    void emergency_cutoff();

    bool is_halogen_active() const { return halogen_duty_ > 0.0f; }
    float get_halogen_duty() const { return halogen_duty_; }
    float get_lamp_heatsink_temp_c() const { return lamp_temp_c_; }
    void update_lamp_temp(float temp_c);

private:
    float halogen_duty_ = 0.0f;
    bool nir_leds_on_ = false;
    bool uv_led_on_ = false;
    float lamp_temp_c_ = 35.0f;
    bool initialized_ = false;
    bool overtemp_trip_ = false;

    void apply_hardware_pwm();
};

} // namespace aahar::drivers

#endif // AAHAR_ILLUMINATION_H
