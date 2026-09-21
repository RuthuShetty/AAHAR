/**
 * AAHAR Handheld — BLE 5.0 GATT Server
 * Hosts Primary Service aa00 and Characteristics aa01-aa07.
 */

#pragma once
#ifndef AAHAR_GATT_SERVER_H
#define AAHAR_GATT_SERVER_H

#include <cstdint>
#include <string>
#include <functional>
#include <vector>
#include "ble_types.h"
#include "spectrum_streamer.h"
#include "drivers/pmic_bq24074.h"
#include "drivers/bme688.h"

namespace aahar::ble {

struct DeviceStatusPayload {
    DeviceState state         = DeviceState::IDLE;
    uint8_t battery_pct       = 85;
    bool chamber_closed       = true;
    float lamp_temperature_c  = 38.5f;
    uint16_t error_code       = 0;
    std::string led_ring_color = "#2E7D32";
};

class GattServer {
public:
    using CommandCallback = std::function<void(CommandType cmd)>;
    using ConnectionCallback = std::function<void(bool connected)>;

    GattServer();
    ~GattServer();

    bool init(const std::string& device_name = "AAHAR-P-004821");
    bool start_advertising();
    bool stop_advertising();

    void register_command_callback(CommandCallback cb) { command_cb_ = cb; }
    void register_connection_callback(ConnectionCallback cb) { connection_cb_ = cb; }

    bool is_connected() const { return connected_; }

    // Notifications
    bool notify_status(const DeviceStatusPayload& status);
    bool notify_env_data(const drivers::EnvSample& env);
    bool notify_spectrum_packet(const SpectrumPacket& packet);
    bool notify_image_chunk(uint8_t frame_idx, const uint8_t* chunk, size_t chunk_len);

    // In-memory simulation / test hooks
    void simulate_connect(bool connected);
    void simulate_write_command(CommandType cmd);

private:
    std::string device_name_;
    bool connected_ = false;
    CommandCallback command_cb_ = nullptr;
    ConnectionCallback connection_cb_ = nullptr;
    bool initialized_ = false;

    std::string serialize_device_info_json() const;
    std::string serialize_status_json(const DeviceStatusPayload& status) const;
    std::string serialize_env_json(const drivers::EnvSample& env) const;
};

} // namespace aahar::ble

#endif // AAHAR_GATT_SERVER_H
