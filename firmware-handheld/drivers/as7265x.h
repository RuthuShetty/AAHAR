/**
 * AAHAR Handheld — AS7265x Triad Optical Sensor Driver (AAHAR Lite)
 * 18-channel multi-spectral sensor (410nm to 940nm) via I2C virtual registers.
 */

#pragma once
#ifndef AAHAR_AS7265X_H
#define AAHAR_AS7265X_H

#include <cstdint>
#include <cstddef>
#include <array>
#include "aahar_config.h"
#include "sensor_guard.h"

namespace aahar::drivers {

using aahar::SensorState;

constexpr std::size_t AS7265X_NUM_CHANNELS = 18;

// 18 calibrated channel center wavelengths (nm)
constexpr std::array<float, AS7265X_NUM_CHANNELS> AS7265X_WAVELENGTHS = {
    410.0f, 435.0f, 460.0f, 485.0f, 510.0f, 535.0f, // AS72653 (UV/Vis)
    560.0f, 585.0f, 645.0f, 705.0f, 900.0f, 940.0f, // AS72652 (Color)
    610.0f, 680.0f, 730.0f, 760.0f, 810.0f, 860.0f  // AS72651 (NIR Master)
};

class As7265xTriad {
public:
    As7265xTriad(uint8_t i2c_addr = 0x49);
    ~As7265xTriad();

    /** False when the sensor is absent or faulty. Callers must check it. */
    bool init();

    /**
     * Returns SensorState::Ok only when channels_out holds a real reading.
     * Previously returned bool and was always true, including when the data
     * was synthetic.
     */
    SensorState capture_calibrated(std::array<float, AS7265X_NUM_CHANNELS>& channels_out);

    bool set_gain(uint8_t gain_level); // 0=1x, 1=3.7x, 2=16x, 3=64x
    bool set_integration_time(uint8_t int_cycles);

    SensorState state() const { return state_; }

#if AAHAR_SIMULATION_ALLOWED
    // Compiled out of release images by sensor_guard.h.
    void set_simulated_channels(const std::array<float, AS7265X_NUM_CHANNELS>& simulated);
#endif

private:
    uint8_t i2c_addr_;
    SensorState state_ = SensorState::NotPresent;
    std::array<float, AS7265X_NUM_CHANNELS> simulated_buffer_{};

    bool virtual_reg_read(uint8_t reg, uint8_t* out);
    bool virtual_reg_write(uint8_t reg, uint8_t val);
};

} // namespace aahar::drivers

#endif // AAHAR_AS7265X_H
