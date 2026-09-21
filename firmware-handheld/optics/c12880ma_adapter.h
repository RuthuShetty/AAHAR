/**
 * AAHAR Handheld — C12880MA Sensor Adapter
 * Binds Hamamatsu C12880MA driver to ISpectralSensor interface.
 */

#pragma once
#ifndef AAHAR_C12880MA_ADAPTER_H
#define AAHAR_C12880MA_ADAPTER_H

#include "sensor_interface.h"
#include "drivers/c12880ma.h"

namespace aahar::optics {

class C12880MASensorAdapter : public ISpectralSensor {
public:
    C12880MASensorAdapter(drivers::HamamatsuC12880MA& driver) : driver_(driver) {}

    bool init() override {
        return driver_.init();
    }

    bool capture_raw(std::vector<float>& intensities, std::vector<float>& wavelengths) override {
        std::array<uint16_t, drivers::C12880MA_NUM_PIXELS> raw_buf{};
        if (!driver_.capture_raw(raw_buf)) return false;

        auto wls = driver_.get_wavelengths();
        intensities.resize(drivers::C12880MA_NUM_PIXELS);
        wavelengths.resize(drivers::C12880MA_NUM_PIXELS);

        for (size_t i = 0; i < drivers::C12880MA_NUM_PIXELS; ++i) {
            intensities[i] = static_cast<float>(raw_buf[i]);
            wavelengths[i] = wls[i];
        }
        return true;
    }

    const char* get_sensor_name() const override {
        return "Hamamatsu C12880MA Micro-Spectrometer";
    }

    size_t get_num_channels() const override {
        return drivers::C12880MA_NUM_PIXELS;
    }

private:
    drivers::HamamatsuC12880MA& driver_;
};

} // namespace aahar::optics

#endif // AAHAR_C12880MA_ADAPTER_H
