#include "oled_display.h"
#include <cstring>
#include <cstdio>

#ifdef ESP_PLATFORM
#include "driver/i2c.h"
#include "esp_log.h"
static const char* TAG = "OLED_SSD1306";
#endif

namespace aahar::drivers {

OledDisplay::OledDisplay(uint8_t i2c_addr) : i2c_addr_(i2c_addr) {
    std::memset(buffer_, 0, sizeof(buffer_));
}

OledDisplay::~OledDisplay() {
    clear();
    update();
}

void OledDisplay::send_command(uint8_t cmd) {
#ifdef ESP_PLATFORM
    uint8_t write_buf[2] = {0x00, cmd};
    i2c_master_write_to_device(I2C_NUM_0, i2c_addr_, write_buf, sizeof(write_buf), pdMS_TO_TICKS(100));
#endif
}

void OledDisplay::send_data(const uint8_t* data, size_t len) {
#ifdef ESP_PLATFORM
    // Send in chunks with 0x40 control byte
    constexpr size_t CHUNK_SIZE = 64;
    uint8_t chunk_buf[CHUNK_SIZE + 1];
    chunk_buf[0] = 0x40; // Co=0, D/C#=1

    for (size_t offset = 0; offset < len; offset += CHUNK_SIZE) {
        size_t to_send = (len - offset > CHUNK_SIZE) ? CHUNK_SIZE : (len - offset);
        std::memcpy(&chunk_buf[1], data + offset, to_send);
        i2c_master_write_to_device(I2C_NUM_0, i2c_addr_, chunk_buf, to_send + 1, pdMS_TO_TICKS(100));
    }
#endif
}

bool OledDisplay::init() {
#ifdef ESP_PLATFORM
    send_command(0xAE); // Display OFF
    send_command(0xD5); // Set Display Clock Divide Ratio
    send_command(0x80);
    send_command(0xA8); // Set Multiplex Ratio (64 lines)
    send_command(0x3F);
    send_command(0xD3); // Set Display Offset
    send_command(0x00);
    send_command(0x40); // Set Start Line = 0
    send_command(0x8D); // Charge Pump Setting
    send_command(0x14); // Enable Charge Pump
    send_command(0x20); // Memory Addressing Mode: Horizontal
    send_command(0x00);
    send_command(0xA1); // Segment Re-map (column 127 is mapped to SEG0)
    send_command(0xC8); // COM Output Scan Direction (remapped)
    send_command(0xDA); // COM Pins Hardware Configuration
    send_command(0x12);
    send_command(0x81); // Set Contrast Control
    send_command(0xCF);
    send_command(0xD9); // Set Pre-charge Period
    send_command(0xF1);
    send_command(0xDB); // Set VCOMH Deselect Level
    send_command(0x40);
    send_command(0xA4); // Output Follows RAM
    send_command(0xA6); // Normal Display (non-inverted)
    send_command(0xAF); // Display ON

    ESP_LOGI(TAG, "SSD1306 128x64 OLED initialized at address 0x%02X", i2c_addr_);
#endif
    initialized_ = true;
    show_boot();
    return true;
}

void OledDisplay::clear() {
    std::memset(buffer_, 0, sizeof(buffer_));
}

void OledDisplay::update() {
    send_command(0x21); // Column Address
    send_command(0);    // Start
    send_command(127);  // End
    send_command(0x22); // Page Address
    send_command(0);    // Start
    send_command(7);    // End
    send_data(buffer_, sizeof(buffer_));
}

void OledDisplay::draw_string(int x, int y, const char* str, bool /*invert*/) {
    // 5x7 bitmap font rendering stub for embedded frame buffer
    (void)x; (void)y; (void)str;
}

void OledDisplay::draw_rect(int x, int y, int w, int h, bool fill) {
    for (int px = x; px < x + w && px < 128; ++px) {
        for (int py = y; py < y + h && py < 64; ++py) {
            bool is_border = (px == x || px == x + w - 1 || py == y || py == y + h - 1);
            if (fill || is_border) {
                buffer_[(py / 8) * 128 + px] |= (1 << (py % 8));
            }
        }
    }
}

void OledDisplay::draw_progress_bar(int x, int y, int w, int h, uint8_t pct) {
    draw_rect(x, y, w, h, false);
    int fill_w = static_cast<int>((static_cast<float>(pct) / 100.0f) * (w - 4));
    if (fill_w > 0) {
        draw_rect(x + 2, y + 2, fill_w, h - 4, true);
    }
}

void OledDisplay::show_boot() {
    clear();
    // Splash banner: "AAHAR NIR SCANNER"
    draw_rect(10, 10, 108, 44, false);
    update();
}

void OledDisplay::show_idle(uint8_t battery_pct, bool ble_connected, bool chamber_closed) {
    clear();
    // Header: Battery & BLE
    draw_rect(0, 0, 128, 12, false);
    // Body: State & Chamber status
    if (!chamber_closed) {
        draw_rect(20, 24, 88, 20, true); // Chamber warning inverted bar
    }
    update();
}

void OledDisplay::show_calibrating() {
    clear();
    draw_rect(15, 20, 98, 24, false);
    update();
}

void OledDisplay::show_scanning(uint8_t progress_pct, float /*elapsed_s*/) {
    clear();
    draw_progress_bar(10, 30, 108, 14, progress_pct);
    update();
}

void OledDisplay::show_result(const char* /*grade*/, float /*cp_pct*/, float /*moisture_pct*/) {
    clear();
    draw_rect(10, 10, 108, 44, false);
    update();
}

void OledDisplay::show_error(const char* /*error_msg*/) {
    clear();
    draw_rect(0, 0, 128, 64, false);
    draw_rect(2, 2, 124, 60, false);
    update();
}

} // namespace aahar::drivers
