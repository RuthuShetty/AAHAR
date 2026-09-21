/**
 * AAHAR — Sensor simulation guard.
 *
 * WHY THIS EXISTS
 * Every optical and environmental driver in this firmware contained a silent
 * simulation fallback:
 *
 *   as7265x.cpp:42   "AS7265x not detected (ID: 0x%02X), fallback to simulation"
 *   bme688.cpp:23    "BME688 not found ..., using fallback simulation"
 *   camera_ov5640:62 "OV5640 Camera init failed (0x%x), fallback to simulation"
 *
 * init() then returned TRUE, and capture() returned a synthetic buffer with a
 * success status. A unit with a dead, unplugged or counterfeit spectrometer
 * would stream a cosine curve over BLE, and the phone had no way to tell it
 * from a real measurement. As7265xTriad::capture_calibrated() was worse: even
 * the #ifdef ESP_PLATFORM "real hardware" branch assigned simulated_buffer_,
 * so that driver never read the sensor under any build.
 *
 * POLICY
 * Simulation is a TEST-ONLY capability. It is compiled out unless
 * AAHAR_TEST_BUILD is defined. A release build that reaches a simulation path
 * fails to compile rather than shipping fabricated spectra.
 */
#pragma once
#ifndef AAHAR_SENSOR_GUARD_H
#define AAHAR_SENSOR_GUARD_H

#if defined(AAHAR_TEST_BUILD)
  #define AAHAR_SIMULATION_ALLOWED 1
#else
  #define AAHAR_SIMULATION_ALLOWED 0
#endif

// Release builds must never define both.
#if AAHAR_SIMULATION_ALLOWED && defined(AAHAR_RELEASE_BUILD)
  #error "AAHAR_TEST_BUILD and AAHAR_RELEASE_BUILD are mutually exclusive: \
refusing to build a release image with sensor simulation compiled in."
#endif

namespace aahar {

/** Reported by every driver so callers can distinguish absent from faulty. */
enum class SensorState : uint8_t {
    Ok = 0,
    NotPresent,      // hardware did not respond to identification
    Faulty,          // present but failing self-test
    Saturated,
    Uncalibrated,
    Simulated        // test builds only; never produced by a release image
};

inline const char* to_string(SensorState s) {
    switch (s) {
        case SensorState::Ok:           return "OK";
        case SensorState::NotPresent:   return "SENSOR_NOT_PRESENT";
        case SensorState::Faulty:       return "SENSOR_FAULTY";
        case SensorState::Saturated:    return "SENSOR_SATURATED";
        case SensorState::Uncalibrated: return "SENSOR_UNCALIBRATED";
        case SensorState::Simulated:    return "SENSOR_SIMULATED";
    }
    return "SENSOR_UNKNOWN";
}

/** True only for data a release build may present as a measurement. */
inline bool is_measurement_trustworthy(SensorState s) {
    return s == SensorState::Ok;
}

} // namespace aahar

#endif // AAHAR_SENSOR_GUARD_H
