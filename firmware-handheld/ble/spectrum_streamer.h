/**
 * AAHAR Handheld — Spectrum Streamer & CRC-16 CCITT Packetizer
 * Splits 228-band spectral data into 512-byte MTU packets with sequence numbers
 * and CRC-16 CCITT (0x1021) checksums.
 */

#pragma once
#ifndef AAHAR_SPECTRUM_STREAMER_H
#define AAHAR_SPECTRUM_STREAMER_H

#include <cstdint>
#include <vector>
#include <array>
#include <functional>
#include "ble_types.h"
#include "aahar_config.h"

namespace aahar::ble {

// CRC-16 CCITT (polynomial 0x1021, init 0xFFFF)
uint16_t crc16_ccitt(const uint8_t* data, size_t length);

struct SpectrumPacket {
    SpectrumPacketHeader header;
    std::vector<uint8_t> data;

    std::vector<uint8_t> serialize() const;
    static bool deserialize(const uint8_t* buffer, size_t len, SpectrumPacket& out);
};

class SpectrumStreamer {
public:
    using PacketEmitter = std::function<bool(const SpectrumPacket& packet)>;

    SpectrumStreamer();
    ~SpectrumStreamer();

    // Serialize wavelengths, mean spectrum, and 3 repeat sweeps into MTU packets
    std::vector<SpectrumPacket> prepare_packets(
        const std::array<float, config::NUM_SPECTRAL_BANDS>& wavelengths,
        const std::array<float, config::NUM_SPECTRAL_BANDS>& mean_intensities,
        const std::array<std::array<float, config::NUM_SPECTRAL_BANDS>, config::NUM_SCAN_REPEATS>& repeats
    );

    // Stream out packets via callback
    bool stream(const std::vector<SpectrumPacket>& packets, PacketEmitter emitter);

    // Reassemble packets back into raw float buffers (for verification/testing)
    static bool reassemble(
        const std::vector<SpectrumPacket>& packets,
        std::vector<float>& wavelengths_out,
        std::vector<float>& mean_intensities_out,
        std::vector<std::vector<float>>& repeats_out
    );
};

} // namespace aahar::ble

#endif // AAHAR_SPECTRUM_STREAMER_H
