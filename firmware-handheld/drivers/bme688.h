/**
 * AAHAR Handheld — Bosch BME688 Environmental Sensor Driver
 * Reads Temperature, Relative Humidity, Barometric Pressure, and VOC Gas Index.
 */

#pragma once
#ifndef AAHAR_BME688_H
#define AAHAR_BME688_H

#include <cstdint>
#include "aahar_config.h"

namespace aahar::drivers {

struct EnvSample {
    float temperature_c     = 25.0f;
    float humidity_pct      = 55.0f;
    float pressure_hpa      = 1013.25f;
    float gas_resistance_kohm = 50.0f;
    uint16_t voc_index      = 100;
    float ambient_light_lux = 350.0f;
};

class Bme688Sensor {
public:
    Bme688Sensor(uint8_t i2c_addr = 0x76);
    ~Bme688Sensor();

    bool init();
    EnvSample read();
    bool trigger_measurement();

    // Testing simulation hook
    void set_simulated_sample(const EnvSample& sample);

private:
    uint8_t i2c_addr_;
    bool is_simulated_ = false;
    EnvSample current_sample_;
};

} // namespace aahar::drivers

#endif // AAHAR_BME688_H
