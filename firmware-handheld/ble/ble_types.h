/**
 * AAHAR Handheld — BLE Protocol Definitions
 * Aligned with Master Prompt Section 8.5 & mobile/src/ble/types.ts
 */

#pragma once
#ifndef AAHAR_BLE_TYPES_H
#define AAHAR_BLE_TYPES_H

#include <cstdint>
#include <string>

namespace aahar::ble {

// Service UUID: 0000aa00-0000-1000-8000-00805f9b34fb
constexpr const char* UUID_SERVICE_AAHAR     = "0000aa00-0000-1000-8000-00805f9b34fb";

// Characteristic UUIDs
constexpr const char* UUID_CHAR_DEVICE_INFO  = "0000aa01-0000-1000-8000-00805f9b34fb"; // Read
constexpr const char* UUID_CHAR_STATUS       = "0000aa02-0000-1000-8000-00805f9b34fb"; // Notify
constexpr const char* UUID_CHAR_COMMAND      = "0000aa03-0000-1000-8000-00805f9b34fb"; // Write
constexpr const char* UUID_CHAR_SPECTRUM     = "0000aa04-0000-1000-8000-00805f9b34fb"; // Notify (Streaming)
constexpr const char* UUID_CHAR_IMAGE        = "0000aa05-0000-1000-8000-00805f9b34fb"; // Notify (Streaming)
constexpr const char* UUID_CHAR_ENV_DATA     = "0000aa06-0000-1000-8000-00805f9b34fb"; // Notify
constexpr const char* UUID_CHAR_OTA          = "0000aa07-0000-1000-8000-00805f9b34fb"; // Write

enum class CommandType : uint8_t {
    START_SCAN = 1,
    ABORT      = 2,
    CALIBRATE  = 3,
    SLEEP      = 4,
    OTA_BEGIN  = 5,
    UNKNOWN    = 0
};

inline CommandType parse_command_string(const std::string& cmd_str) {
    if (cmd_str == "START_SCAN") return CommandType::START_SCAN;
    if (cmd_str == "ABORT")      return CommandType::ABORT;
    if (cmd_str == "CALIBRATE")  return CommandType::CALIBRATE;
    if (cmd_str == "SLEEP")      return CommandType::SLEEP;
    if (cmd_str == "OTA_BEGIN")  return CommandType::OTA_BEGIN;
    return CommandType::UNKNOWN;
}

enum class DeviceState : uint8_t {
    IDLE,
    CALIBRATING,
    SCANNING,
    ERROR,
    SLEEP
};

inline const char* to_string(DeviceState state) {
    switch (state) {
        case DeviceState::IDLE:        return "IDLE";
        case DeviceState::CALIBRATING: return "CALIBRATING";
        case DeviceState::SCANNING:    return "SCANNING";
        case DeviceState::ERROR:       return "ERROR";
        case DeviceState::SLEEP:       return "SLEEP";
        default:                       return "IDLE";
    }
}

#pragma pack(push, 1)
struct SpectrumPacketHeader {
    uint16_t seq;             // Packet sequence index (0 .. total_packets - 1)
    uint16_t crc16;           // CRC-16 CCITT of the payload
    uint16_t total_packets;   // Total packets in transmission
    uint16_t payload_length;  // Byte length of data following header
};
#pragma pack(pop)

constexpr size_t BLE_MAX_MTU = 517;
constexpr size_t BLE_MAX_PAYLOAD = 512;
constexpr size_t PACKET_HEADER_SIZE = sizeof(SpectrumPacketHeader); // 8 bytes
constexpr size_t PACKET_DATA_CAPACITY = BLE_MAX_PAYLOAD - PACKET_HEADER_SIZE; // 504 bytes

} // namespace aahar::ble

#endif // AAHAR_BLE_TYPES_H
