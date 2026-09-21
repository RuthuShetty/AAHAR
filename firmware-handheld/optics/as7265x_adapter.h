/**
 * AAHAR Handheld — AS7265x Triad Sensor Adapter
 * Binds AS7265x driver to ISpectralSensor interface.
 */

#pragma once
#ifndef AAHAR_AS7265X_ADAPTER_H
#define AAHAR_AS7265X_ADAPTER_H

#include "sensor_interface.h"
#include "drivers/as7265x.h"

namespace aahar::optics {

class As7265xSensorAdapter : public ISpectralSensor {
public:
    As7265xSensorAdapter(drivers::As7265xTriad& driver) : driver_(driver) {}

    bool init() override {
        return driver_.init();
    }

    bool capture_raw(std::vector<float>& intensities, std::vector<float>& wavelengths) override {
        std::array<float, drivers::AS7265X_NUM_CHANNELS> raw_buf{};
        if (!driver_.capture_calibrated(raw_buf)) return false;

        intensities.resize(drivers::AS7265X_NUM_CHANNELS);
        wavelengths.resize(drivers::AS7265X_NUM_CHANNELS);

        for (size_t i = 0; i < drivers::AS7265X_NUM_CHANNELS; ++i) {
            intensities[i] = raw_buf[i];
            wavelengths[i] = drivers::AS7265X_WAVELENGTHS[i];
        }
        return true;
    }

    const char* get_sensor_name() const override {
        return "AS7265x Triad 18-Channel Multi-Spectral Sensor";
    }

    size_t get_num_channels() const override {
        return drivers::AS7265X_NUM_CHANNELS;
    }

private:
    drivers::As7265xTriad& driver_;
};

} // namespace aahar::optics

#endif // AAHAR_AS7265X_ADAPTER_H
