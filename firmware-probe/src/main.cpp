/**
 * AAHAR Silage Probe — Firmware Entry Point (app_main)
 * Target: ESP32-C6-WROOM-1 (RISC-V)
 */

#include <cstdio>
#include "probe_controller.h"

#ifdef ESP_PLATFORM
#include "nvs_flash.h"
#include "esp_log.h"
#include "esp_sleep.h"

static const char* TAG = "PROBE_MAIN";
RTC_DATA_ATTR static uint16_t s_boot_count = 0;

extern "C" void app_main(void) {
    s_boot_count++;
    ESP_LOGI(TAG, "AAHAR Silage Probe Node Wakeup #%u", s_boot_count);

    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        nvs_flash_erase();
        nvs_flash_init();
    }

    static aahar::probe::ProbeController probe;
    probe.init();

    // Execute measurement and LoRa transmission
    auto snap = probe.execute_cycle(s_boot_count);
    ESP_LOGI(TAG, "Cycle #%u complete: pH=%.2f, Temp=%.1fC, Moist=%.1f%%, CO2=%u ppm",
             s_boot_count, snap.ph, snap.temps.mean_temp_c, snap.moisture_pct, snap.co2_ppm);

    // Enter 15-minute deep sleep (18 uA)
    probe.power_manager().enter_deep_sleep(aahar::probe::config::SAMPLE_INTERVAL_S);
}

#else

int main() {
    std::printf("AAHAR Silage Probe Node Host Runner\n");
    aahar::probe::ProbeController probe;
    probe.init();
    auto snap = probe.execute_cycle(1);
    std::printf("  Reading: pH=%.2f, Mean Temp=%.1fC\n", snap.ph, snap.temps.mean_temp_c);
    return 0;
}

#endif
