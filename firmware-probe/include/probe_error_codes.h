/**
 * AAHAR Silage Probe — Error Codes
 */

#pragma once
#ifndef AAHAR_PROBE_ERROR_CODES_H
#define AAHAR_PROBE_ERROR_CODES_H

#include <cstdint>

namespace aahar::probe::errors {

enum ProbeErrorCode : uint16_t {
    PROBE_OK                   = 0x0000,
    ERR_ONEWIRE_SENSOR_MISSING = 0x0001, // Less than 4 DS18B20 sensors found on bus
    ERR_ISFET_PH_OUT_OF_RANGE  = 0x0002, // pH reading < 2.0 or > 9.0
    ERR_MOISTURE_DISCONNECTED  = 0x0003, // Moisture ADC open circuit
    ERR_MHZ19_NO_RESPONSE      = 0x0004, // NDIR CO2 UART timeout
    ERR_BME688_I2C_FAULT       = 0x0005, // BME688 ACK missing
    ERR_SX1262_SPI_TIMEOUT     = 0x0006, // LoRa radio BUSY pin timeout
    ERR_LORA_TX_FAILED         = 0x0007, // LoRa packet transmission failure
    ERR_BATTERY_DEPLETED       = 0x0008, // Battery voltage < 3.0V
    ERR_SENSOR_NOT_PRESENT     = 0x0009, // Sensor did not respond; NO value produced
    ERR_SENSOR_SIMULATED       = 0x000A  // Simulated value reached a release path
};

inline const char* to_string(ProbeErrorCode code) {
    switch (code) {
        case PROBE_OK:                   return "PROBE_OK";
        case ERR_ONEWIRE_SENSOR_MISSING: return "ONEWIRE_SENSOR_MISSING";
        case ERR_ISFET_PH_OUT_OF_RANGE:  return "ISFET_PH_OUT_OF_RANGE";
        case ERR_MOISTURE_DISCONNECTED:  return "MOISTURE_DISCONNECTED";
        case ERR_MHZ19_NO_RESPONSE:      return "MHZ19_NO_RESPONSE";
        case ERR_BME688_I2C_FAULT:       return "BME688_I2C_FAULT";
        case ERR_SX1262_SPI_TIMEOUT:     return "SX1262_SPI_TIMEOUT";
        case ERR_LORA_TX_FAILED:         return "LORA_TX_FAILED";
        case ERR_SENSOR_NOT_PRESENT:     return "SENSOR_NOT_PRESENT";
        case ERR_SENSOR_SIMULATED:       return "SENSOR_SIMULATED";
        case ERR_BATTERY_DEPLETED:       return "BATTERY_DEPLETED";
        default:                         return "UNKNOWN_PROBE_ERROR";
    }
}

} // namespace aahar::probe::errors

#endif // AAHAR_PROBE_ERROR_CODES_H
