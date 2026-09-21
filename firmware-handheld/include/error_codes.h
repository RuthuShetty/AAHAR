/**
 * AAHAR Handheld Scanner — System Error Codes
 */

#pragma once
#ifndef AAHAR_ERROR_CODES_H
#define AAHAR_ERROR_CODES_H

#include <cstdint>

namespace aahar::errors {

enum ErrorCode : uint16_t {
    ERR_NONE                     = 0x0000,
    ERR_CHAMBER_OPEN             = 0x0001, // Chamber switch opened during scan
    ERR_LAMP_FAILURE             = 0x0002, // Halogen lamp open circuit or degraded output
    ERR_SENSOR_TIMEOUT           = 0x0003, // Optical sensor readout timeout
    ERR_BATTERY_LOW              = 0x0004, // Battery < 10%, cannot safely strike lamp
    ERR_CALIBRATION_FAILED       = 0x0005, // Dark reference saturation or white tile SNR < threshold
    ERR_BLE_TRANSFER_FAILED      = 0x0006, // Packet transfer error / retry limit exceeded
    ERR_OVER_TEMPERATURE         = 0x0007, // Lamp housing or ambient temperature > 65 deg C
    ERR_CAMERA_CAPTURE_FAILED    = 0x0008, // OV5640 DVP capture timeout
    ERR_STORAGE_CORRUPT          = 0x0009, // NVS or calibration partition read/write error
    ERR_OTA_VERIFICATION_FAILED  = 0x000A, // Firmware chunk hash or Ed25519 signature invalid
    ERR_OPTICAL_SATURATION       = 0x000B, // Detector ADC saturated (integration time too high)
    ERR_SIGNAL_TOO_WEAK          = 0x000C, // Detector signal-to-noise ratio too low (< 15 dB)
    ERR_SENSOR_NOT_PRESENT       = 0x000D, // Optical/env sensor did not respond to ID read
    ERR_SENSOR_SIMULATED         = 0x000E  // Simulated data reached a release path (must never occur)
};

inline const char* to_string(ErrorCode code) {
    switch (code) {
        case ERR_NONE:                    return "NO_ERROR";
        case ERR_CHAMBER_OPEN:            return "CHAMBER_OPEN";
        case ERR_LAMP_FAILURE:            return "LAMP_FAILURE";
        case ERR_SENSOR_TIMEOUT:          return "SENSOR_TIMEOUT";
        case ERR_BATTERY_LOW:             return "BATTERY_LOW";
        case ERR_CALIBRATION_FAILED:      return "CALIBRATION_FAILED";
        case ERR_BLE_TRANSFER_FAILED:     return "BLE_TRANSFER_FAILED";
        case ERR_OVER_TEMPERATURE:        return "OVER_TEMPERATURE";
        case ERR_CAMERA_CAPTURE_FAILED:   return "CAMERA_CAPTURE_FAILED";
        case ERR_SENSOR_NOT_PRESENT:      return "SENSOR_NOT_PRESENT";
        case ERR_SENSOR_SIMULATED:        return "SENSOR_SIMULATED";
        case ERR_STORAGE_CORRUPT:         return "STORAGE_CORRUPT";
        case ERR_OTA_VERIFICATION_FAILED: return "OTA_VERIFICATION_FAILED";
        case ERR_OPTICAL_SATURATION:      return "OPTICAL_SATURATION";
        case ERR_SIGNAL_TOO_WEAK:         return "SIGNAL_TOO_WEAK";
        default:                          return "UNKNOWN_ERROR";
    }
}

} // namespace aahar::errors

#endif // AAHAR_ERROR_CODES_H
