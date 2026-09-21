#include "spectrum_streamer.h"
#include <cstring>

namespace aahar::ble {

uint16_t crc16_ccitt(const uint8_t* data, size_t length) {
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

std::vector<uint8_t> SpectrumPacket::serialize() const {
    std::vector<uint8_t> buffer(PACKET_HEADER_SIZE + data.size());
    std::memcpy(buffer.data(), &header, PACKET_HEADER_SIZE);
    if (!data.empty()) {
        std::memcpy(buffer.data() + PACKET_HEADER_SIZE, data.data(), data.size());
    }
    return buffer;
}

bool SpectrumPacket::deserialize(const uint8_t* buffer, size_t len, SpectrumPacket& out) {
    if (!buffer || len < PACKET_HEADER_SIZE) return false;
    std::memcpy(&out.header, buffer, PACKET_HEADER_SIZE);

    if (len < PACKET_HEADER_SIZE + out.header.payload_length) return false;
    out.data.resize(out.header.payload_length);
    if (out.header.payload_length > 0) {
        std::memcpy(out.data.data(), buffer + PACKET_HEADER_SIZE, out.header.payload_length);
    }

    // Verify CRC-16 of payload
    uint16_t calc_crc = crc16_ccitt(out.data.data(), out.data.size());
    return calc_crc == out.header.crc16;
}

SpectrumStreamer::SpectrumStreamer() = default;
SpectrumStreamer::~SpectrumStreamer() = default;

std::vector<SpectrumPacket> SpectrumStreamer::prepare_packets(
    const std::array<float, config::NUM_SPECTRAL_BANDS>& wavelengths,
    const std::array<float, config::NUM_SPECTRAL_BANDS>& mean_intensities,
    const std::array<std::array<float, config::NUM_SPECTRAL_BANDS>, config::NUM_SCAN_REPEATS>& repeats
) {
    // Total float payload: (1 + 1 + NUM_SCAN_REPEATS) * NUM_SPECTRAL_BANDS
    constexpr size_t total_floats = (2 + config::NUM_SCAN_REPEATS) * config::NUM_SPECTRAL_BANDS;
    constexpr size_t total_bytes = total_floats * sizeof(float);

    std::vector<uint8_t> raw_payload(total_bytes);
    uint8_t* ptr = raw_payload.data();

    // 1. Wavelengths (228 * 4B)
    std::memcpy(ptr, wavelengths.data(), config::NUM_SPECTRAL_BANDS * sizeof(float));
    ptr += config::NUM_SPECTRAL_BANDS * sizeof(float);

    // 2. Mean intensities (228 * 4B)
    std::memcpy(ptr, mean_intensities.data(), config::NUM_SPECTRAL_BANDS * sizeof(float));
    ptr += config::NUM_SPECTRAL_BANDS * sizeof(float);

    // 3. Repeats (3 * 228 * 4B)
    for (uint8_t rep = 0; rep < config::NUM_SCAN_REPEATS; ++rep) {
        std::memcpy(ptr, repeats[rep].data(), config::NUM_SPECTRAL_BANDS * sizeof(float));
        ptr += config::NUM_SPECTRAL_BANDS * sizeof(float);
    }

    // Split into MTU packets
    const size_t num_packets = (total_bytes + PACKET_DATA_CAPACITY - 1) / PACKET_DATA_CAPACITY;
    std::vector<SpectrumPacket> packets(num_packets);

    for (size_t seq = 0; seq < num_packets; ++seq) {
        size_t offset = seq * PACKET_DATA_CAPACITY;
        size_t chunk_len = std::min(PACKET_DATA_CAPACITY, total_bytes - offset);

        packets[seq].data.resize(chunk_len);
        std::memcpy(packets[seq].data.data(), raw_payload.data() + offset, chunk_len);

        packets[seq].header.seq = static_cast<uint16_t>(seq);
        packets[seq].header.crc16 = crc16_ccitt(packets[seq].data.data(), chunk_len);
        packets[seq].header.total_packets = static_cast<uint16_t>(num_packets);
        packets[seq].header.payload_length = static_cast<uint16_t>(chunk_len);
    }

    return packets;
}

bool SpectrumStreamer::stream(const std::vector<SpectrumPacket>& packets, PacketEmitter emitter) {
    if (!emitter) return false;
    for (const auto& pkt : packets) {
        if (!emitter(pkt)) {
            return false;
        }
    }
    return true;
}

bool SpectrumStreamer::reassemble(
    const std::vector<SpectrumPacket>& packets,
    std::vector<float>& wavelengths_out,
    std::vector<float>& mean_intensities_out,
    std::vector<std::vector<float>>& repeats_out
) {
    if (packets.empty()) return false;
    uint16_t total_expected = packets[0].header.total_packets;
    if (packets.size() != total_expected) return false;

    // Concatenate validated payload chunks
    std::vector<uint8_t> raw_bytes;
    for (size_t i = 0; i < packets.size(); ++i) {
        if (packets[i].header.seq != i) return false;
        uint16_t computed_crc = crc16_ccitt(packets[i].data.data(), packets[i].data.size());
        if (computed_crc != packets[i].header.crc16) return false;
        raw_bytes.insert(raw_bytes.end(), packets[i].data.begin(), packets[i].data.end());
    }

    constexpr size_t expected_bytes = (2 + config::NUM_SCAN_REPEATS) * config::NUM_SPECTRAL_BANDS * sizeof(float);
    if (raw_bytes.size() != expected_bytes) return false;

    const float* fptr = reinterpret_cast<const float*>(raw_bytes.data());

    // 1. Wavelengths
    wavelengths_out.assign(fptr, fptr + config::NUM_SPECTRAL_BANDS);
    fptr += config::NUM_SPECTRAL_BANDS;

    // 2. Mean intensities
    mean_intensities_out.assign(fptr, fptr + config::NUM_SPECTRAL_BANDS);
    fptr += config::NUM_SPECTRAL_BANDS;

    // 3. Repeats
    repeats_out.resize(config::NUM_SCAN_REPEATS);
    for (uint8_t r = 0; r < config::NUM_SCAN_REPEATS; ++r) {
        repeats_out[r].assign(fptr, fptr + config::NUM_SPECTRAL_BANDS);
        fptr += config::NUM_SPECTRAL_BANDS;
    }

    return true;
}

} // namespace aahar::ble
