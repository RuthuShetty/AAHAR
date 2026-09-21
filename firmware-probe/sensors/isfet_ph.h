/**
 * AAHAR Silage Probe — ISFET pH Sensor Driver
 * Precision food-grade ISFET probe with AD8603 buffer.
 * Measuring range: 3.0 to 7.5 pH (accuracy ±0.1).
 */

#pragma once
#ifndef AAHAR_ISFET_PH_H
#define AAHAR_ISFET_PH_H

#include <cstdint>
#include "probe_config.h"
#include "probe_error_codes.h"
#include "sensor_guard.h"

namespace aahar::probe::sensors {

using aahar::SensorState;

/** Sentinel returned when no trustworthy pH value could be produced. */
constexpr float PH_INVALID = -1.0f;

class IsfetPhSensor {
public:
    IsfetPhSensor(int adc_pin = config::PIN_ISFET_PH_ADC);
    ~IsfetPhSensor();

    /** False when the ISFET does not respond. Callers must check it. */
    bool init();

    SensorState state() const { return state_; }
    
    // Read pH with Nernstian temperature compensation
    float read_ph(float temp_c = 25.0f, errors::ProbeErrorCode* err_out = nullptr);

    // Two-point buffer calibration (pH 4.01 and pH 7.00)
    void calibrate_point(float buffer_ph, float measured_mv);

#if AAHAR_SIMULATION_ALLOWED
    // Compiled out of release images.
    void set_simulated_ph(float ph);
#endif

private:
    int adc_pin_;
    SensorState state_ = SensorState::NotPresent;
    float simulated_ph_ = 3.95f;

    // Calibration: mV = offset - slope * (pH - 7)
    float v_offset_mv_ = 1500.0f; // Voltage at pH 7.00
    float slope_mv_per_ph_ = 59.16f; // Theoretical Nernstian slope @ 25C

    float sample_adc_millivolts();
};

} // namespace aahar::probe::sensors

#endif // AAHAR_ISFET_PH_H
