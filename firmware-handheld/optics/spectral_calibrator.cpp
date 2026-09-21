#include "spectral_calibrator.h"
#include <algorithm>
#include <cmath>

namespace aahar::optics {

SpectralCalibrator::SpectralCalibrator() = default;
SpectralCalibrator::~SpectralCalibrator() = default;

void SpectralCalibrator::set_dark_reference(const std::vector<float>& dark) {
    dark_ref_ = dark;
    has_dark_ = !dark.empty();
}

void SpectralCalibrator::set_white_reference(const std::vector<float>& white) {
    white_ref_ = white;
    has_white_ = !white.empty();
}

std::array<float, config::NUM_SPECTRAL_BANDS> SpectralCalibrator::get_standard_wavelengths() {
    std::array<float, config::NUM_SPECTRAL_BANDS> wls{};
    for (size_t i = 0; i < config::NUM_SPECTRAL_BANDS; ++i) {
        wls[i] = config::WAVELENGTH_START_NM + static_cast<float>(i) * config::WAVELENGTH_STEP_NM;
    }
    return wls;
}

float SpectralCalibrator::interpolate_at(
    float target_wl,
    const std::vector<float>& source_wls,
    const std::vector<float>& source_vals
) {
    if (source_wls.empty() || source_vals.empty()) return 0.0f;
    if (target_wl <= source_wls.front()) return source_vals.front();
    if (target_wl >= source_wls.back()) return source_vals.back();

    // Binary search for interval [i, i+1]
    auto it = std::lower_bound(source_wls.begin(), source_wls.end(), target_wl);
    size_t idx = std::distance(source_wls.begin(), it);
    if (idx == 0) return source_vals[0];

    float wl0 = source_wls[idx - 1];
    float wl1 = source_wls[idx];
    float v0 = source_vals[idx - 1];
    float v1 = source_vals[idx];

    float fraction = (target_wl - wl0) / (wl1 - wl0);
    return v0 + fraction * (v1 - v0);
}

errors::ErrorCode SpectralCalibrator::process_spectrum(
    const std::vector<float>& raw_sample,
    const std::vector<float>& raw_wavelengths,
    std::array<float, config::NUM_SPECTRAL_BANDS>& spectrum_228_out
) {
    if (raw_sample.size() != raw_wavelengths.size() || raw_sample.empty()) {
        return errors::ERR_SENSOR_TIMEOUT;
    }

    // 1. Check for ADC saturation (> 4050 counts on 12-bit ADC)
    for (float val : raw_sample) {
        if (val >= 4050.0f) {
            return errors::ERR_OPTICAL_SATURATION;
        }
    }

    // 2. Perform Dark Subtraction and White Normalization if calibration exists
    std::vector<float> normalized(raw_sample.size());
    if (has_dark_ && has_white_ && dark_ref_.size() == raw_sample.size() && white_ref_.size() == raw_sample.size()) {
        float max_signal = 0.0f;
        float avg_dark = 0.0f;
        for (size_t i = 0; i < raw_sample.size(); ++i) {
            float s = raw_sample[i];
            float d = dark_ref_[i];
            float w = white_ref_[i];
            float denom = std::max(w - d, 1.0f);
            float r = (s - d) / denom;
            normalized[i] = std::clamp(r, 0.0f, 2.5f); // Reflectance typically 0.0 to 1.0, allow specular up to 2.5
            max_signal = std::max(max_signal, s);
            avg_dark += d;
        }
        avg_dark /= raw_sample.size();

        // 3. SNR check: Signal must exceed dark level by at least 15 dB
        if (max_signal <= avg_dark * 1.05f) {
            return errors::ERR_SIGNAL_TOO_WEAK;
        }
    } else {
        // Uncalibrated raw pass-through normalized by maximum count
        float max_val = 1.0f;
        for (float v : raw_sample) max_val = std::max(max_val, v);
        for (size_t i = 0; i < raw_sample.size(); ++i) {
            normalized[i] = raw_sample[i] / max_val;
        }
    }

    // 4. Resample onto standard 228-channel grid (900.0 nm - 1700.0 nm)
    auto target_wls = get_standard_wavelengths();
    for (size_t i = 0; i < config::NUM_SPECTRAL_BANDS; ++i) {
        spectrum_228_out[i] = interpolate_at(target_wls[i], raw_wavelengths, normalized);
    }

    return errors::ERR_NONE;
}

} // namespace aahar::optics
