/**
 * AAHAR Silage Probe — BME688 Head Environmental & Gas Sensor
 * Measures VOC index, ethanol/ammonia spikes, and silo atmospheric conditions.
 */

#pragma once
#ifndef AAHAR_BME688_PROBE_H
#define AAHAR_BME688_PROBE_H

#include <cstdint>
#include "probe_config.h"
#include "probe_error_codes.h"

namespace aahar::probe::sensors {

struct HeadEnvData {
    float temp_c           = 28.5f;
    float humidity_pct     = 82.0f;
    float pressure_hpa     = 1008.5f;
    float voc_index        = 75.0f;
    float gas_res_kohm     = 35.0f;
};

class Bme688ProbeSensor {
public:
    Bme688ProbeSensor(uint8_t i2c_addr = 0x76);
    ~Bme688ProbeSensor();

    bool init();
    HeadEnvData read(errors::ProbeErrorCode* err_out = nullptr);

    // Simulation hook
    void set_simulated_data(const HeadEnvData& data);

private:
    uint8_t i2c_addr_;
    bool is_simulated_ = false;
    HeadEnvData current_data_;
};

} // namespace aahar::probe::sensors

#endif // AAHAR_BME688_PROBE_H
