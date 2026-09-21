/**
 * AAHAR Handheld — Spectral Calibration & Normalization Engine
 * Implements:
 *  - Dark current subtraction: S_corr = S - D
 *  - White standard normalization: R(lambda) = (S - D) / (W - D)
 *  - Monotonic cubic spline / linear interpolation to standard 228-band grid (900-1700nm)
 *  - Saturation and SNR quality checks
 */

#pragma once
#ifndef AAHAR_SPECTRAL_CALIBRATOR_H
#define AAHAR_SPECTRAL_CALIBRATOR_H

#include <cstdint>
#include <vector>
#include <array>
#include "aahar_config.h"
#include "error_codes.h"

namespace aahar::optics {

class SpectralCalibrator {
public:
    SpectralCalibrator();
    ~SpectralCalibrator();

    void set_dark_reference(const std::vector<float>& dark);
    void set_white_reference(const std::vector<float>& white);

    bool has_calibration() const { return has_dark_ && has_white_; }

    // Normalize raw sample and resample onto standard 228-band grid (900.0nm - 1700.0nm)
    errors::ErrorCode process_spectrum(
        const std::vector<float>& raw_sample,
        const std::vector<float>& raw_wavelengths,
        std::array<float, config::NUM_SPECTRAL_BANDS>& spectrum_228_out
    );

    static std::array<float, config::NUM_SPECTRAL_BANDS> get_standard_wavelengths();

private:
    std::vector<float> dark_ref_;
    std::vector<float> white_ref_;
    bool has_dark_ = false;
    bool has_white_ = false;

    static float interpolate_at(
        float target_wl,
        const std::vector<float>& source_wls,
        const std::vector<float>& source_vals
    );
};

} // namespace aahar::optics

#endif // AAHAR_SPECTRAL_CALIBRATOR_H
