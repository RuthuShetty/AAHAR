/**
 * AAHAR Handheld — Abstract Spectral Sensor Interface
 * Decouples optical front-end (Hamamatsu C12880MA vs AS7265x Triad)
 * from the 228-band calibration and streaming pipeline.
 */

#pragma once
#ifndef AAHAR_SENSOR_INTERFACE_H
#define AAHAR_SENSOR_INTERFACE_H

#include <cstdint>
#include <vector>

namespace aahar::optics {

class ISpectralSensor {
public:
    virtual ~ISpectralSensor() = default;

    virtual bool init() = 0;
    virtual bool capture_raw(std::vector<float>& intensities, std::vector<float>& wavelengths) = 0;
    virtual const char* get_sensor_name() const = 0;
    virtual size_t get_num_channels() const = 0;
};

} // namespace aahar::optics

#endif // AAHAR_SENSOR_INTERFACE_H
