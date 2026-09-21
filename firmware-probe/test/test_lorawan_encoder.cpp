/**
 * AAHAR Probe Unit Test — LoRaWAN Packet Encoder & Decoder
 */

#include <cassert>
#include <cstdio>
#include <cmath>
#include "lora/lorawan_node.h"

namespace aahar::probe::test {

void test_lorawan_encoder() {
    std::printf("Running probe test_lorawan_encoder...\n");

    lora::ProbeTelemetryPacket pkt;
    pkt.sequence_num = 42;
    pkt.ph_x100 = 385; // pH 3.85
    pkt.temp_depth0_x10 = 245;
    pkt.temp_depth1_x10 = 252;
    pkt.temp_depth2_x10 = 260;
    pkt.temp_depth3_x10 = 268;
    pkt.moisture_x10 = 665; // 66.5%
    pkt.co2_ppm = 2100;
    pkt.o2_x10 = 6; // 0.6%
    pkt.voc_index = 80;
    pkt.battery_pct = 95;
    pkt.error_flags = 0;

    auto bytes = lora::LoRaWanNode::serialize(pkt);
    assert(bytes.size() == lora::PROBE_PACKET_SIZE);

    lora::ProbeTelemetryPacket decoded;
    bool ok = lora::LoRaWanNode::deserialize(bytes.data(), bytes.size(), decoded);
    assert(ok);
    assert(decoded.sequence_num == 42);
    assert(decoded.ph_x100 == 385);
    assert(decoded.temp_depth0_x10 == 245);
    assert(decoded.temp_depth3_x10 == 268);
    assert(decoded.co2_ppm == 2100);

    // Bit-flip test
    bytes[5] ^= 0x01;
    bool corrupted_ok = lora::LoRaWanNode::deserialize(bytes.data(), bytes.size(), decoded);
    assert(!corrupted_ok);

    std::printf("  PASS: probe test_lorawan_encoder (26-byte binary payload + CRC validated)\n");
}

} // namespace aahar::probe::test
