/**
 * AAHAR Silage Probe — LoRaWAN Packet Encoder & Node
 * Packs sensor readings into compact 24-byte binary payload for SX1262 LoRa transmission.
 */

#pragma once
#ifndef AAHAR_LORAWAN_NODE_H
#define AAHAR_LORAWAN_NODE_H

#include <cstdint>
#include <vector>
#include <string>
#include <array>
#include "sx1262_driver.h"

namespace aahar::probe::lora {

#pragma pack(push, 1)
struct ProbeTelemetryPacket {
    uint8_t protocol_version = 1;     // 1 byte
    uint16_t sequence_num    = 0;     // 2 bytes
    uint16_t ph_x100         = 400;   // 2 bytes (pH 4.00)
    int16_t temp_depth0_x10  = 245;   // 2 bytes (24.5 C)
    int16_t temp_depth1_x10  = 252;   // 2 bytes (25.2 C)
    int16_t temp_depth2_x10  = 260;   // 2 bytes (26.0 C)
    int16_t temp_depth3_x10  = 268;   // 2 bytes (26.8 C)
    uint16_t moisture_x10    = 665;   // 2 bytes (66.5 %)
    uint16_t co2_ppm         = 1450;  // 2 bytes (1450 ppm)
    uint16_t o2_x10          = 8;     // 2 bytes (0.8 %)
    uint16_t voc_index       = 75;    // 2 bytes (75)
    uint8_t battery_pct      = 92;    // 1 byte (92 %)
    uint16_t error_flags     = 0;     // 2 bytes
    uint16_t crc16           = 0;     // 2 bytes
};
#pragma pack(pop)

constexpr size_t PROBE_PACKET_SIZE = sizeof(ProbeTelemetryPacket); // 26 bytes

class LoRaWanNode {
public:
    LoRaWanNode(Sx1262Driver& radio);
    ~LoRaWanNode();

    bool init();
    
    // Encodes readings and transmits over SX1262
    bool transmit_telemetry(
        uint16_t seq,
        float ph,
        const std::array<float, 4>& temps,
        float moisture,
        uint16_t co2,
        float o2,
        float voc,
        uint8_t battery_pct,
        uint16_t error_flags
    );

    // Serialization & deserialization helpers (used also by test harness & cloud bridge)
    static std::vector<uint8_t> serialize(const ProbeTelemetryPacket& pkt);
    static bool deserialize(const uint8_t* buffer, size_t len, ProbeTelemetryPacket& out);

private:
    Sx1262Driver& radio_;
};

} // namespace aahar::probe::lora

#endif // AAHAR_LORAWAN_NODE_H
