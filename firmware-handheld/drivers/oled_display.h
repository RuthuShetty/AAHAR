/**
 * AAHAR Handheld — SSD1306 1.3" OLED Display Driver
 * 128x64 I2C Graphic Display for Standalone Operation
 */

#pragma once
#ifndef AAHAR_OLED_DISPLAY_H
#define AAHAR_OLED_DISPLAY_H

#include <cstdint>
#include <string>
#include "aahar_config.h"

namespace aahar::drivers {

enum class DisplayScreen {
    BOOT,
    IDLE_READY,
    CALIBRATING,
    SCANNING,
    RESULT_SUMMARY,
    ERROR_SCREEN
};

class OledDisplay {
public:
    OledDisplay(uint8_t i2c_addr = 0x3C);
    ~OledDisplay();

    bool init();
    void clear();
    void update();

    void show_boot();
    void show_idle(uint8_t battery_pct, bool ble_connected, bool chamber_closed);
    void show_calibrating();
    void show_scanning(uint8_t progress_pct, float elapsed_s);
    void show_result(const char* grade, float cp_pct, float moisture_pct);
    void show_error(const char* error_msg);

private:
    uint8_t i2c_addr_;
    uint8_t buffer_[128 * 64 / 8]; // 1024 bytes frame buffer
    bool initialized_ = false;

    void draw_string(int x, int y, const char* str, bool invert = false);
    void draw_rect(int x, int y, int w, int h, bool fill = false);
    void draw_progress_bar(int x, int y, int w, int h, uint8_t pct);
    void send_command(uint8_t cmd);
    void send_data(const uint8_t* data, size_t len);
};

} // namespace aahar::drivers

#endif // AAHAR_OLED_DISPLAY_H
