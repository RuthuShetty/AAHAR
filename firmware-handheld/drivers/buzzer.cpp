#include "buzzer.h"

#ifdef ESP_PLATFORM
#include "driver/ledc.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
static const char* TAG = "BUZZER";
#endif

namespace aahar::drivers {

Buzzer::Buzzer(int gpio_pin) : gpio_pin_(gpio_pin) {}

Buzzer::~Buzzer() {
    stop();
}

bool Buzzer::init() {
#ifdef ESP_PLATFORM
    ledc_timer_config_t timer_conf = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .duty_resolution = LEDC_TIMER_10_BIT,
        .timer_num       = LEDC_TIMER_1,
        .freq_hz         = 2000,
        .clk_cfg         = LEDC_AUTO_CLK
    };
    ledc_timer_config(&timer_conf);

    ledc_channel_config_t ch_conf = {
        .gpio_num   = gpio_pin_,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel    = LEDC_CHANNEL_2,
        .intr_type  = LEDC_INTR_DISABLE,
        .timer_sel  = LEDC_TIMER_1,
        .duty       = 0,
        .hpoint     = 0
    };
    ledc_channel_config(&ch_conf);
    ESP_LOGI(TAG, "Buzzer initialized on GPIO %d", gpio_pin_);
#endif
    initialized_ = true;
    return true;
}

void Buzzer::play_tone(uint32_t freq_hz, uint32_t duration_ms) {
#ifdef ESP_PLATFORM
    if (freq_hz == 0) {
        stop();
        vTaskDelay(pdMS_TO_TICKS(duration_ms));
        return;
    }
    ledc_set_freq(LEDC_LOW_SPEED_MODE, LEDC_TIMER_1, freq_hz);
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_2, 512); // 50% duty
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_2);
    vTaskDelay(pdMS_TO_TICKS(duration_ms));
    stop();
#endif
}

void Buzzer::stop() {
#ifdef ESP_PLATFORM
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_2, 0);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_2);
#endif
}

void Buzzer::play_effect(SoundEffect effect) {
    switch (effect) {
        case SoundEffect::CLICK:
            play_tone(3000, 30);
            break;
        case SoundEffect::SCAN_START:
            play_tone(1500, 100);
            play_tone(2200, 150);
            break;
        case SoundEffect::SCAN_COMPLETE:
            play_tone(1800, 120);
            play_tone(2400, 120);
            play_tone(3000, 250);
            break;
        case SoundEffect::ERROR_ALERT:
            play_tone(400, 200);
            play_tone(0, 100);
            play_tone(400, 200);
            break;
        case SoundEffect::CALIBRATION_TONE:
            play_tone(1200, 80);
            play_tone(1600, 80);
            break;
    }
}

} // namespace aahar::drivers
