/**
 * AAHAR Handheld — Audio Buzzer Driver
 * Low-literacy sound feedback:
 *  - SCAN_START: 2-tone ascending chime
 *  - SCAN_COMPLETE: 3-tone victory chime
 *  - ERROR: 2 low warning buzzes
 *  - BUTTON_CLICK: short 50ms click
 */

#pragma once
#ifndef AAHAR_BUZZER_H
#define AAHAR_BUZZER_H

#include <cstdint>
#include "aahar_config.h"

namespace aahar::drivers {

enum class SoundEffect {
    CLICK,
    SCAN_START,
    SCAN_COMPLETE,
    ERROR_ALERT,
    CALIBRATION_TONE
};

class Buzzer {
public:
    Buzzer(int gpio_pin = config::PIN_BUZZER_PWM);
    ~Buzzer();

    bool init();
    void play_tone(uint32_t freq_hz, uint32_t duration_ms);
    void play_effect(SoundEffect effect);
    void stop();

private:
    int gpio_pin_;
    bool initialized_ = false;
};

} // namespace aahar::drivers

#endif // AAHAR_BUZZER_H
