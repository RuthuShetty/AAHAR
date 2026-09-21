/**
 * AAHAR Handheld — Battery & PMIC Driver (BQ24074 + ADC Fuel Gauge)
 * Manages dual 18650 Li-ion cells (6800 mAh total).
 */

#pragma once
#ifndef AAHAR_PMIC_BQ24074_H
#define AAHAR_PMIC_BQ24074_H

#include <cstdint>
#include "aahar_config.h"

namespace aahar::drivers {

enum class ChargingState {
    NOT_CHARGING,
    CHARGING,
    CHARGE_COMPLETE,
    FAULT
};

struct BatteryStatus {
    float voltage_v          = 3.85f;
    uint8_t percentage       = 85;
    ChargingState charging   = ChargingState::NOT_CHARGING;
    bool usb_power_connected = false;
    bool is_low_battery      = false;
    bool is_critical         = false;
};

class BatteryManager {
public:
    BatteryManager();
    ~BatteryManager();

    bool init();
    BatteryStatus read_status();
    float get_voltage() const { return status_.voltage_v; }
    uint8_t get_percentage() const { return status_.percentage; }
    bool can_start_scan() const { return !status_.is_critical; }

    // Simulation / testing injection
    void set_simulated_voltage(float v);

private:
    BatteryStatus status_;
    bool is_simulated_ = false;

    float sample_adc_voltage();
    static uint8_t voltage_to_soc_pct(float voltage);
};

} // namespace aahar::drivers

#endif // AAHAR_PMIC_BQ24074_H
