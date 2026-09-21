/**
 * AAHAR Handheld — Over-The-Air (OTA) Firmware Update Service
 * Manages dual-slot A/B partition updates via BLE characteristic 0007.
 */

#pragma once
#ifndef AAHAR_OTA_SERVICE_H
#define AAHAR_OTA_SERVICE_H

#include <cstdint>
#include <vector>
#include <string>
#include <array>
#include "error_codes.h"

namespace aahar::ble {

enum class OtaState {
    IDLE,
    IN_PROGRESS,
    VERIFYING,
    COMPLETE,
    ERROR
};

class OtaService {
public:
    OtaService();
    ~OtaService();

    bool begin(size_t image_size, const std::string& expected_sha256);
    errors::ErrorCode write_chunk(const uint8_t* data, size_t len);
    errors::ErrorCode finalize_and_reboot();
    void abort();

    OtaState get_state() const { return state_; }
    size_t get_bytes_written() const { return bytes_written_; }
    float get_progress_pct() const;

private:
    OtaState state_ = OtaState::IDLE;
    size_t total_size_ = 0;
    size_t bytes_written_ = 0;
    std::string expected_hash_;
    bool is_simulated_ = false;

    void reset();
};

} // namespace aahar::ble

#endif // AAHAR_OTA_SERVICE_H
