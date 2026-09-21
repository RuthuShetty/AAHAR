#include "lorawan_node.h"
#include <cstring>
#include <cmath>

namespace aahar::probe::lora {

static uint16_t probe_crc16(const uint8_t* data, size_t length) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < length; ++i) {
        crc ^= (static_cast<uint16_t>(data[i]) << 8);
        for (int j = 0; j < 8; ++j) {
            if ((crc & 0x8000) != 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc;
}

LoRaWanNode::LoRaWanNode(Sx1262Driver& radio) : radio_(radio) {}
LoRaWanNode::~LoRaWanNode() = default;

bool LoRaWanNode::init() {
    return radio_.init();
}

std::vector<uint8_t> LoRaWanNode::serialize(const ProbeTelemetryPacket& pkt) {
    std::vector<uint8_t> buf(PROBE_PACKET_SIZE);
    ProbeTelemetryPacket temp = pkt;
    // Calculate CRC over all fields except the crc16 field itself
    temp.crc16 = probe_crc16(reinterpret_cast<const uint8_t*>(&temp), PROBE_PACKET_SIZE - 2);
    std::memcpy(buf.data(), &temp, PROBE_PACKET_SIZE);
    return buf;
}

bool LoRaWanNode::deserialize(const uint8_t* buffer, size_t len, ProbeTelemetryPacket& out) {
    if (!buffer || len != PROBE_PACKET_SIZE) return false;
    std::memcpy(&out, buffer, PROBE_PACKET_SIZE);
    uint16_t calc = probe_crc16(buffer, PROBE_PACKET_SIZE - 2);
    return calc == out.crc16;
}

bool LoRaWanNode::transmit_telemetry(
    uint16_t seq,
    float ph,
    const std::array<float, 4>& temps,
    float moisture,
    uint16_t co2,
    float o2,
    float voc,
    uint8_t battery_pct,
    uint16_t error_flags
) {
    ProbeTelemetryPacket pkt;
    pkt.sequence_num = seq;
    pkt.ph_x100 = static_cast<uint16_t>(std::round(ph * 100.0f));
    pkt.temp_depth0_x10 = static_cast<int16_t>(std::round(temps[0] * 10.0f));
    pkt.temp_depth1_x10 = static_cast<int16_t>(std::round(temps[1] * 10.0f));
    pkt.temp_depth2_x10 = static_cast<int16_t>(std::round(temps[2] * 10.0f));
    pkt.temp_depth3_x10 = static_cast<int16_t>(std::round(temps[3] * 10.0f));
    pkt.moisture_x10 = static_cast<uint16_t>(std::round(moisture * 10.0f));
    pkt.co2_ppm = co2;
    pkt.o2_x10 = static_cast<uint16_t>(std::round(o2 * 10.0f));
    pkt.voc_index = static_cast<uint16_t>(std::round(voc));
    pkt.battery_pct = battery_pct;
    pkt.error_flags = error_flags;

    auto bytes = serialize(pkt);
    return radio_.transmit_packet(bytes.data(), bytes.size());
}

} // namespace aahar::probe::lora
