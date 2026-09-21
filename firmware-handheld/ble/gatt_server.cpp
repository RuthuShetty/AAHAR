#include "gatt_server.h"
#include <sstream>
#include <iomanip>
#include "version.h"
#include "aahar_config.h"

#ifdef ESP_PLATFORM
#include "esp_log.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"
#include "host/ble_hs.h"
#include "host/util/util.h"
#include "services/gap/ble_svc_gap.h"
#include "services/gatt/ble_svc_gatt.h"
static const char* TAG = "BLE_GATT_SERVER";
#endif

namespace aahar::ble {

GattServer::GattServer() = default;
GattServer::~GattServer() {
    stop_advertising();
}

std::string GattServer::serialize_device_info_json() const {
    std::ostringstream ss;
    ss << "{\"sku\":\"" << config::SKU_NAME << "\","
       << "\"serial_number\":\"" << config::DEFAULT_SERIAL << "\","
       << "\"firmware_version\":\"" << AAHAR_FW_VERSION_STRING << "\","
       << "\"hardware_revision\":\"" << AAHAR_HW_REVISION << "\","
       << "\"calibration_date\":\"2026-09-01T00:00:00Z\","
       << "\"battery_pct\":85}";
    return ss.str();
}

std::string GattServer::serialize_status_json(const DeviceStatusPayload& status) const {
    std::ostringstream ss;
    ss << "{\"state\":\"" << to_string(status.state) << "\","
       << "\"battery_pct\":" << static_cast<int>(status.battery_pct) << ","
       << "\"chamber_closed\":" << (status.chamber_closed ? "true" : "false") << ","
       << std::fixed << std::setprecision(1)
       << "\"lamp_temperature_c\":" << status.lamp_temperature_c << ","
       << "\"error_code\":" << status.error_code << ","
       << "\"led_ring_color\":\"" << status.led_ring_color << "\"}";
    return ss.str();
}

std::string GattServer::serialize_env_json(const drivers::EnvSample& env) const {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(2)
       << "{\"temperature_c\":" << env.temperature_c << ","
       << "\"humidity_pct\":" << env.humidity_pct << ","
       << "\"pressure_hpa\":" << env.pressure_hpa << ","
       << "\"voc_index\":" << env.voc_index << ","
       << "\"ambient_light_lux\":" << env.ambient_light_lux << "}";
    return ss.str();
}

bool GattServer::init(const std::string& device_name) {
    device_name_ = device_name;

#ifdef ESP_PLATFORM
    nimble_port_init();
    ble_svc_gap_device_name_set(device_name_.c_str());
    ble_svc_gap_init();
    ble_svc_gatt_init();
    ESP_LOGI(TAG, "BLE GATT Server initialized (Device: %s, MTU: 517)", device_name_.c_str());
#endif

    initialized_ = true;
    return true;
}

bool GattServer::start_advertising() {
#ifdef ESP_PLATFORM
    struct ble_gap_adv_params adv_params = {};
    adv_params.conn_mode = BLE_GAP_CONN_MODE_UND;
    adv_params.disc_mode = BLE_GAP_DISC_MODE_GEN;
    ble_gap_adv_start(BLE_OWN_ADDR_PUBLIC, nullptr, BLE_HS_FOREVER, &adv_params, nullptr, nullptr);
    ESP_LOGI(TAG, "BLE Advertising started for %s", device_name_.c_str());
#endif
    return true;
}

bool GattServer::stop_advertising() {
#ifdef ESP_PLATFORM
    ble_gap_adv_stop();
#endif
    return true;
}

bool GattServer::notify_status(const DeviceStatusPayload& status) {
    std::string json = serialize_status_json(status);
#ifdef ESP_PLATFORM
    // Send BLE characteristic notification
#endif
    return true;
}

bool GattServer::notify_env_data(const drivers::EnvSample& env) {
    std::string json = serialize_env_json(env);
#ifdef ESP_PLATFORM
    // Send BLE characteristic notification
#endif
    return true;
}

bool GattServer::notify_spectrum_packet(const SpectrumPacket& packet) {
    auto bytes = packet.serialize();
#ifdef ESP_PLATFORM
    // Send chunk notification over UUID aa04
#endif
    return true;
}

bool GattServer::notify_image_chunk(uint8_t /*frame_idx*/, const uint8_t* /*chunk*/, size_t /*chunk_len*/) {
#ifdef ESP_PLATFORM
    // Send chunk notification over UUID aa05
#endif
    return true;
}

void GattServer::simulate_connect(bool connected) {
    connected_ = connected;
    if (connection_cb_) {
        connection_cb_(connected);
    }
}

void GattServer::simulate_write_command(CommandType cmd) {
    if (command_cb_) {
        command_cb_(cmd);
    }
}

} // namespace aahar::ble
