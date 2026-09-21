/**
 * AAHAR Firmware Unit Test — Spectral Calibration Math & Grid Interpolation
 */

#include <cassert>
#include <cstdio>
#include <cmath>
#include "optics/spectral_calibrator.h"

namespace aahar::test {

void test_spectral_calibration_math() {
    std::printf("Running test_spectral_calibration_math...\n");

    optics::SpectralCalibrator calib;

    // Standard raw channels (e.g. 288 detector pixels from 340nm to 850nm / 900-1700nm)
    constexpr size_t RAW_CHANNELS = 288;
    std::vector<float> raw_wls(RAW_CHANNELS);
    std::vector<float> dark(RAW_CHANNELS, 200.0f);     // 200 counts dark level
    std::vector<float> white(RAW_CHANNELS, 3500.0f);   // 3500 counts white reference
    std::vector<float> sample(RAW_CHANNELS, 1850.0f);  // 1850 counts sample

    for (size_t i = 0; i < RAW_CHANNELS; ++i) {
        raw_wls[i] = 850.0f + i * 3.0f; // 850nm to 1711nm
    }

    calib.set_dark_reference(dark);
    calib.set_white_reference(white);
    assert(calib.has_calibration());

    std::array<float, config::NUM_SPECTRAL_BANDS> spectrum_228{};
    errors::ErrorCode err = calib.process_spectrum(sample, raw_wls, spectrum_228);

    assert(err == errors::ERR_NONE);

    // Expected reflectance R = (1850 - 200) / (3500 - 200) = 1650 / 3300 = 0.50
    for (size_t i = 0; i < config::NUM_SPECTRAL_BANDS; ++i) {
        assert(std::abs(spectrum_228[i] - 0.50f) < 0.01f);
    }

    // Saturation test (> 4050 counts)
    std::vector<float> saturated_sample = sample;
    saturated_sample[100] = 4095.0f;
    err = calib.process_spectrum(saturated_sample, raw_wls, spectrum_228);
    assert(err == errors::ERR_OPTICAL_SATURATION);

    // Weak signal test
    std::vector<float> weak_sample = dark;
    for (float& v : weak_sample) v += 2.0f; // Only 2 counts above dark level
    err = calib.process_spectrum(weak_sample, raw_wls, spectrum_228);
    assert(err == errors::ERR_SIGNAL_TOO_WEAK);

    std::printf("  PASS: test_spectral_calibration_math\n");
}

} // namespace aahar::test
