/**
 * AAHAR Silage Probe — MH-Z19C NDIR CO2 Sensor Driver
 * Range: 0 to 10,000 ppm (accuracy ±50 ppm).
 * UART protocol: command 0x86, 9-byte packet with checksum.
 */

#pragma once
#ifndef AAHAR_MHZ19C_CO2_H
#define AAHAR_MHZ19C_CO2_H

#include <cstdint>
#include "sensor_guard.h"
#include "probe_config.h"
#include "probe_error_codes.h"

namespace aahar::probe::sensors {

using aahar::SensorState;
constexpr uint16_t CO2_INVALID = 0;

class MhZ19cCo2Sensor {
public:
    MhZ19cCo2Sensor(int tx_pin = config::PIN_MHZ19_TX, int rx_pin = config::PIN_MHZ19_RX);
    ~MhZ19cCo2Sensor();

    bool init();
    uint16_t read_co2_ppm(errors::ProbeErrorCode* err_out = nullptr);

    // Testing simulation hook
    void set_simulated_co2(uint16_t ppm);

    static uint8_t calculate_checksum(const uint8_t* packet);

private:
    int tx_pin_;
    int rx_pin_;
    bool is_simulated_ = false;
    SensorState state_ = SensorState::NotPresent;
    uint16_t simulated_co2_ = 1450;
};

} // namespace aahar::probe::sensors

#endif // AAHAR_MHZ19C_CO2_H
