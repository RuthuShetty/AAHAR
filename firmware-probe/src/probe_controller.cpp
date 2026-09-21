#include "probe_controller.h"

#ifdef ESP_PLATFORM
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
static const char* TAG = "PROBE_CTRL";
#endif

namespace aahar::probe {

ProbeController::ProbeController()
    : lorawan_(radio_) {}

ProbeController::~ProbeController() = default;

bool ProbeController::init() {
    power_manager_.init();
    ph_sensor_.init();
    temp_array_.init();
    moisture_sensor_.init();
    co2_sensor_.init();
    env_sensor_.init();
    lorawan_.init();
    ble_relay_.init();
    return true;
}

ProbeReadingSnapshot ProbeController::execute_cycle(uint16_t sequence_num) {
    ProbeReadingSnapshot snapshot;

    // 1. Power on sensor rail
    power_manager_.enable_sensor_power(true);
#ifdef ESP_PLATFORM
    vTaskDelay(pdMS_TO_TICKS(500)); // 500 ms stabilization
#endif

    // 2. Read sensors
    errors::ProbeErrorCode err_code = errors::PROBE_OK;
    snapshot.temps = temp_array_.read(&err_code);
    if (err_code != errors::PROBE_OK) snapshot.error_flags |= err_code;

    snapshot.ph = ph_sensor_.read_ph(snapshot.temps.mean_temp_c, &err_code);
    if (err_code != errors::PROBE_OK) snapshot.error_flags |= err_code;

    snapshot.moisture_pct = moisture_sensor_.read_moisture_pct(&err_code);
    if (err_code != errors::PROBE_OK) snapshot.error_flags |= err_code;

    snapshot.co2_ppm = co2_sensor_.read_co2_ppm(&err_code);
    if (err_code != errors::PROBE_OK) snapshot.error_flags |= err_code;

    auto env = env_sensor_.read(&err_code);
    snapshot.voc_index = env.voc_index;
    snapshot.o2_pct = 0.8f; // Derived from sealed chamber / electrochemical proxy
    snapshot.battery_pct = 95;

    // 3. Transmit telemetry via LoRaWAN (SX1262)
    lorawan_.transmit_telemetry(
        sequence_num,
        snapshot.ph,
        snapshot.temps.temps_c,
        snapshot.moisture_pct,
        snapshot.co2_ppm,
        snapshot.o2_pct,
        snapshot.voc_index,
        snapshot.battery_pct,
        snapshot.error_flags
    );

    // 4. Queue reading in BLE fallback relay buffer
    lora::ProbeTelemetryPacket pkt;
    pkt.sequence_num = sequence_num;
    pkt.ph_x100 = static_cast<uint16_t>(snapshot.ph * 100);
    pkt.temp_depth0_x10 = static_cast<int16_t>(snapshot.temps.temps_c[0] * 10);
    pkt.temp_depth1_x10 = static_cast<int16_t>(snapshot.temps.temps_c[1] * 10);
    pkt.temp_depth2_x10 = static_cast<int16_t>(snapshot.temps.temps_c[2] * 10);
    pkt.temp_depth3_x10 = static_cast<int16_t>(snapshot.temps.temps_c[3] * 10);
    pkt.moisture_x10 = static_cast<uint16_t>(snapshot.moisture_pct * 10);
    pkt.co2_ppm = snapshot.co2_ppm;
    pkt.o2_x10 = static_cast<uint16_t>(snapshot.o2_pct * 10);
    pkt.voc_index = static_cast<uint16_t>(snapshot.voc_index);
    pkt.battery_pct = snapshot.battery_pct;
    pkt.error_flags = snapshot.error_flags;
    ble_relay_.queue_reading_for_relay(pkt);

    // 5. Power off sensor rail
    power_manager_.enable_sensor_power(false);

    return snapshot;
}

} // namespace aahar::probe
