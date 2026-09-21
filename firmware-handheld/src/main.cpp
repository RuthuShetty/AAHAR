/**
 * AAHAR Handheld NIR Scanner — Firmware Entry Point (app_main)
 * ESP32-S3-WROOM-1 N16R8 (C++17 / ESP-IDF)
 */

#include <cstdio>
#include "system_controller.h"

#ifdef ESP_PLATFORM
#include "nvs_flash.h"
#include "esp_log.h"
#include "esp_task_wdt.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

static const char* TAG = "AAHAR_MAIN";
static aahar::SystemController* g_system = nullptr;

static void system_loop_task(void* pvParameters) {
    auto* sys = static_cast<aahar::SystemController*>(pvParameters);
    TickType_t last_wake_time = xTaskGetTickCount();
    constexpr TickType_t period_ticks = pdMS_TO_TICKS(20); // 50 Hz loop

    while (true) {
        sys->update(20);
        esp_task_wdt_reset();
        vTaskDelayUntil(&last_wake_time, period_ticks);
    }
}

static void button_monitor_task(void* pvParameters) {
    auto* sys = static_cast<aahar::SystemController*>(pvParameters);
    gpio_config_t btn_conf = {};
    btn_conf.intr_type = GPIO_INTR_DISABLE;
    btn_conf.mode = GPIO_MODE_INPUT;
    btn_conf.pin_bit_mask = (1ULL << aahar::config::PIN_USER_SCAN_BUTTON);
    btn_conf.pull_up_en = GPIO_PULLUP_ENABLE;
    btn_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
    gpio_config(&btn_conf);

    bool last_pressed = false;

    while (true) {
        bool pressed = (gpio_get_level(static_cast<gpio_num_t>(aahar::config::PIN_USER_SCAN_BUTTON)) == 0);
        if (pressed && !last_pressed) {
            // Button pressed — start scan or wake up
            ESP_LOGI(TAG, "Hardware scan button pressed");
            sys->buzzer().play_effect(aahar::drivers::SoundEffect::CLICK);
            if (sys->get_state() == aahar::ble::DeviceState::IDLE) {
                sys->start_scan();
            } else if (sys->get_state() == aahar::ble::DeviceState::SCANNING) {
                sys->abort_scan();
            }
        }
        last_pressed = pressed;
        vTaskDelay(pdMS_TO_TICKS(50)); // 20 Hz debounce poll
    }
}

extern "C" void app_main(void) {
    ESP_LOGI(TAG, "==================================================");
    ESP_LOGI(TAG, " AAHAR Handheld NIR Scanner Firmware %s", AAHAR_FW_VERSION_STRING);
    ESP_LOGI(TAG, " Target: ESP32-S3-WROOM-1 N16R8 | Hardware: %s", AAHAR_HW_REVISION);
    ESP_LOGI(TAG, " SKU: %s", aahar::config::SKU_NAME);
    ESP_LOGI(TAG, "==================================================");

    // 1. Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // 2. Initialize Watchdog Timer (15s timeout)
    esp_task_wdt_config_t wdt_config = {
        .timeout_ms = 15000,
        .idle_core_mask = (1 << 0) | (1 << 1),
        .trigger_panic = true,
    };
    esp_task_wdt_init(&wdt_config);

    // 3. Instantiate and initialize System Controller
    static aahar::SystemController system_controller;
    g_system = &system_controller;
    system_controller.init();

    // 4. Create FreeRTOS background tasks
    xTaskCreatePinnedToCore(system_loop_task, "sys_loop", 8192, g_system, 5, nullptr, 0);
    xTaskCreatePinnedToCore(button_monitor_task, "btn_monitor", 4096, g_system, 4, nullptr, 1);

    ESP_LOGI(TAG, "AAHAR Handheld firmware ready. Awaiting BLE connection or button press.");
}

#else

// Host / Test entry point stub
int main(int argc, char** argv) {
    std::printf("AAHAR Handheld Firmware Host Runner v%s\n", AAHAR_FW_VERSION_STRING);
    aahar::SystemController sys;
    sys.init();
    sys.update(100);
    return 0;
}

#endif
