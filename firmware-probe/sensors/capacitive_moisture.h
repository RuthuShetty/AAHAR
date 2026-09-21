/**
 * AAHAR Silage Probe — Capacitive Moisture Lance Driver
 * Measures dielectric permittivity of silage mass (20% to 85% moisture, ±2%).
 */

#pragma once
#ifndef AAHAR_CAPACITIVE_MOISTURE_H
#define AAHAR_CAPACITIVE_MOISTURE_H

#include <cstdint>
#include "sensor_guard.h"
#include "probe_config.h"
#include "probe_error_codes.h"

namespace aahar::probe::sensors {

using aahar::SensorState;
constexpr float MOISTURE_INVALID = -1.0f;

class CapacitiveMoistureSensor {
public:
    CapacitiveMoistureSensor(int adc_pin = config::PIN_MOISTURE_ADC);
    ~CapacitiveMoistureSensor();

    bool init();
    float read_moisture_pct(errors::ProbeErrorCode* err_out = nullptr);

    // Testing simulation hook
    void set_simulated_moisture(float moisture_pct);

private:
    int adc_pin_;
    bool is_simulated_ = false;
    SensorState state_ = SensorState::NotPresent;
    float simulated_moisture_ = 66.5f;

    float sample_adc_millivolts();
};

} // namespace aahar::probe::sensors

#endif // AAHAR_CAPACITIVE_MOISTURE_H
