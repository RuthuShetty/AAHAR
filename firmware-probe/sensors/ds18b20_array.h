/**
 * AAHAR Silage Probe — 4-Depth DS18B20 Temperature Lance Driver
 * Measures temperatures along a 1.2m lance at depths: 0.2m, 0.5m, 0.8m, 1.1m.
 */

#pragma once
#ifndef AAHAR_DS18B20_ARRAY_H
#define AAHAR_DS18B20_ARRAY_H

#include <cstdint>
#include <array>
#include "probe_config.h"
#include "probe_error_codes.h"

namespace aahar::probe::sensors {

struct TemperatureProfile {
    std::array<float, 4> depths_m = {
        config::LANCE_DEPTH_0_M,
        config::LANCE_DEPTH_1_M,
        config::LANCE_DEPTH_2_M,
        config::LANCE_DEPTH_3_M
    };
    std::array<float, 4> temps_c = {24.5f, 25.2f, 26.0f, 26.8f};
    float mean_temp_c = 25.6f;
    float max_temp_c  = 26.8f;
    float min_temp_c  = 24.5f;
    uint8_t sensors_found = 4;
};

class Ds18b20Array {
public:
    Ds18b20Array(int onewire_pin = config::PIN_ONEWIRE_TEMP);
    ~Ds18b20Array();

    bool init();
    TemperatureProfile read(errors::ProbeErrorCode* err_out = nullptr);

    // Testing simulation hook
    void set_simulated_temps(const std::array<float, 4>& temps);

private:
    int onewire_pin_;
    bool is_simulated_ = false;
    std::array<float, 4> simulated_temps_ = {24.5f, 25.2f, 26.0f, 26.8f};
};

} // namespace aahar::probe::sensors

#endif // AAHAR_DS18B20_ARRAY_H
