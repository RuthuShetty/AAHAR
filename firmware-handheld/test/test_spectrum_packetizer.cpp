/**
 * AAHAR Firmware Unit Test — Spectrum Streamer & 512-Byte MTU Packetizer
 */

#include <cassert>
#include <cstdio>
#include <cmath>
#include "ble/spectrum_streamer.h"
#include "aahar_config.h"

namespace aahar::test {

void test_spectrum_packetizer_roundtrip() {
    std::printf("Running test_spectrum_packetizer_roundtrip...\n");

    ble::SpectrumStreamer streamer;

    std::array<float, config::NUM_SPECTRAL_BANDS> wavelengths{};
    std::array<float, config::NUM_SPECTRAL_BANDS> mean_intensities{};
    std::array<std::array<float, config::NUM_SPECTRAL_BANDS>, config::NUM_SCAN_REPEATS> repeats{};

    for (size_t i = 0; i < config::NUM_SPECTRAL_BANDS; ++i) {
        wavelengths[i] = 900.0f + i * 3.52f;
        mean_intensities[i] = 0.5f + 0.3f * std::sin(i * 0.1f);
        for (size_t r = 0; r < config::NUM_SCAN_REPEATS; ++r) {
            repeats[r][i] = mean_intensities[i] + (r - 1) * 0.01f;
        }
    }

    auto packets = streamer.prepare_packets(wavelengths, mean_intensities, repeats);

    std::printf("  Fragmented into %zu packets (Target <= 10 packets)\n", packets.size());
    assert(packets.size() == 10);

    // Verify packet headers
    for (size_t i = 0; i < packets.size(); ++i) {
        assert(packets[i].header.seq == i);
        assert(packets[i].header.total_packets == 10);
        assert(packets[i].header.payload_length == packets[i].data.size());
        assert(packets[i].header.payload_length <= ble::PACKET_DATA_CAPACITY);
    }

    // Test serialization & deserialization
    for (const auto& pkt : packets) {
        auto serialized = pkt.serialize();
        assert(serialized.size() == ble::PACKET_HEADER_SIZE + pkt.data.size());

        ble::SpectrumPacket recovered;
        bool ok = ble::SpectrumPacket::deserialize(serialized.data(), serialized.size(), recovered);
        assert(ok);
        assert(recovered.header.seq == pkt.header.seq);
        assert(recovered.header.crc16 == pkt.header.crc16);
    }

    // Reassemble and verify float values match
    std::vector<float> rec_wls;
    std::vector<float> rec_mean;
    std::vector<std::vector<float>> rec_reps;

    bool reassemble_ok = ble::SpectrumStreamer::reassemble(packets, rec_wls, rec_mean, rec_reps);
    assert(reassemble_ok);
    assert(rec_wls.size() == config::NUM_SPECTRAL_BANDS);
    assert(rec_mean.size() == config::NUM_SPECTRAL_BANDS);
    assert(rec_reps.size() == config::NUM_SCAN_REPEATS);

    for (size_t i = 0; i < config::NUM_SPECTRAL_BANDS; ++i) {
        assert(std::abs(rec_wls[i] - wavelengths[i]) < 1e-5f);
        assert(std::abs(rec_mean[i] - mean_intensities[i]) < 1e-5f);
    }

    std::printf("  PASS: test_spectrum_packetizer_roundtrip\n");
}

} // namespace aahar::test
