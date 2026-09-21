/**
 * AAHAR Handheld — 90-Second Optical Capture Sequence Coordinator
 * Manages lamp warm-up, multi-sweep acquisitions, UV fluorescence,
 * environmental sensing, and macro camera burst.
 */

#pragma once
#ifndef AAHAR_CAPTURE_SEQUENCE_H
#define AAHAR_CAPTURE_SEQUENCE_H

#include <cstdint>
#include <array>
#include <vector>
#include <functional>
#include "aahar_config.h"
#include "error_codes.h"
#include "drivers/chamber_sensor.h"
#include "drivers/illumination.h"
#include "drivers/pmic_bq24074.h"
#include "drivers/led_ring.h"
#include "drivers/buzzer.h"
#include "drivers/bme688.h"
#include "drivers/camera_ov5640.h"
#include "sensor_interface.h"
#include "spectral_calibrator.h"

namespace aahar::optics {

struct ScanResult {
    errors::ErrorCode status = errors::ERR_NONE;
    std::array<float, config::NUM_SPECTRAL_BANDS> wavelengths{};
    std::array<float, config::NUM_SPECTRAL_BANDS> mean_intensities{};
    std::array<std::array<float, config::NUM_SPECTRAL_BANDS>, config::NUM_SCAN_REPEATS> repeats{};
    float uv_fluorescence_intensity = 0.0f;
    drivers::EnvSample env_data;
    uint32_t duration_ms = 0;
};

class CaptureSequenceCoordinator {
public:
    using ProgressCallback = std::function<void(uint8_t progress_pct, float elapsed_s)>;

    CaptureSequenceCoordinator(
        drivers::ChamberSensor& chamber,
        drivers::IlluminationController& illumination,
        drivers::BatteryManager& battery,
        drivers::LedRingController& led_ring,
        drivers::Buzzer& buzzer,
        drivers::Bme688Sensor& env_sensor,
        drivers::MacroCamera& camera,
        ISpectralSensor& spectral_sensor,
        SpectralCalibrator& calibrator
    );

    ~CaptureSequenceCoordinator();

    // Execute full 90-second measurement cycle
    ScanResult execute_scan(ProgressCallback progress_cb = nullptr);
    void abort();
    bool is_scanning() const { return scanning_; }

private:
    drivers::ChamberSensor& chamber_;
    drivers::IlluminationController& illumination_;
    drivers::BatteryManager& battery_;
    drivers::LedRingController& led_ring_;
    drivers::Buzzer& buzzer_;
    drivers::Bme688Sensor& env_sensor_;
    drivers::MacroCamera& camera_;
    ISpectralSensor& spectral_sensor_;
    SpectralCalibrator& calibrator_;

    volatile bool scanning_ = false;
    volatile bool abort_requested_ = false;
};

} // namespace aahar::optics

#endif // AAHAR_CAPTURE_SEQUENCE_H
