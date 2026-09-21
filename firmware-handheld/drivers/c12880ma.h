/**
 * AAHAR Handheld — Hamamatsu C12880MA Micro-Spectrometer Driver
 * Controls 288-channel CMOS linear image sensor with integrated optical grating.
 */

#pragma once
#ifndef AAHAR_C12880MA_H
#define AAHAR_C12880MA_H

#include <cstdint>
#include <vector>
#include <array>
#include "aahar_config.h"

namespace aahar::drivers {

constexpr size_t C12880MA_NUM_PIXELS = 288;

struct WavelengthCalibrationCoeffs {
    float a0 = 310.23f;
    float a1 = 2.714f;
    float a2 = -0.00138f;
    float a3 = -0.00000142f;

    float pixel_to_wavelength(uint16_t pixel) const {
        float p = static_cast<float>(pixel);
        return a0 + a1 * p + a2 * p * p + a3 * p * p * p;
    }
};

class HamamatsuC12880MA {
public:
    HamamatsuC12880MA(
        int clk_pin = config::PIN_C12880_CLK,
        int st_pin  = config::PIN_C12880_ST,
        int trg_pin = config::PIN_C12880_TRG,
        int eos_pin = config::PIN_C12880_EOS,
        int adc_pin = config::PIN_C12880_VIDEO_ADC
    );
    ~HamamatsuC12880MA();

    bool init();
    void set_integration_time_us(uint32_t integration_us);
    uint32_t get_integration_time_us() const { return integration_time_us_; }

    // Read full 288 raw ADC values
    bool capture_raw(std::array<uint16_t, C12880MA_NUM_PIXELS>& raw_out);

    // Get calibrated wavelengths for all 288 pixels
    std::array<float, C12880MA_NUM_PIXELS> get_wavelengths() const;
    void set_calibration_coeffs(const WavelengthCalibrationCoeffs& coeffs);

    // Simulation / testing hook
    void set_simulated_spectrum(const std::array<uint16_t, C12880MA_NUM_PIXELS>& simulated);

private:
    int clk_pin_;
    int st_pin_;
    int trg_pin_;
    int eos_pin_;
    int adc_pin_;

    uint32_t integration_time_us_ = config::INTEGRATION_TIME_US;
    WavelengthCalibrationCoeffs calib_coeffs_;
    bool is_simulated_ = false;
    std::array<uint16_t, C12880MA_NUM_PIXELS> simulated_buffer_{};

    void pulse_clock(uint32_t count);
};

} // namespace aahar::drivers

#endif // AAHAR_C12880MA_H
