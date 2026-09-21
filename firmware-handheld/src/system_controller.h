/**
 * AAHAR Handheld — Master System Controller
 * Coordinates drivers, optics engine, BLE GATT server, and power management.
 */

#pragma once
#ifndef AAHAR_SYSTEM_CONTROLLER_H
#define AAHAR_SYSTEM_CONTROLLER_H

#include <memory>
#include "aahar_config.h"
#include "error_codes.h"

// Drivers
#include "drivers/chamber_sensor.h"
#include "drivers/illumination.h"
#include "drivers/pmic_bq24074.h"
#include "drivers/led_ring.h"
#include "drivers/buzzer.h"
#include "drivers/oled_display.h"
#include "drivers/bme688.h"
#include "drivers/camera_ov5640.h"

#if defined(AAHAR_SKU_LITE)
#include "drivers/as7265x.h"
#include "optics/as7265x_adapter.h"
#else
#include "drivers/c12880ma.h"
#include "optics/c12880ma_adapter.h"
#endif

// Optics
#include "optics/sensor_interface.h"
#include "optics/spectral_calibrator.h"
#include "optics/capture_sequence.h"

// BLE
#include "ble/ble_types.h"
#include "ble/gatt_server.h"
#include "ble/spectrum_streamer.h"
#include "ble/ota_service.h"

// Power
#include "power/power_budget.h"
#include "power/power_manager.h"

namespace aahar {

class SystemController {
public:
    SystemController();
    ~SystemController();

    bool init();
    void update(uint32_t delta_ms);

    // Operations
    bool start_scan();
    void abort_scan();
    bool run_white_dark_calibration();

    // Accessors for testing & status
    ble::DeviceState get_state() const { return current_state_; }
    const drivers::BatteryStatus& get_battery_status() const { return last_battery_status_; }
    const drivers::EnvSample& get_env_sample() const { return last_env_sample_; }

    // Direct handles for testing
    drivers::ChamberSensor& chamber() { return chamber_; }
    drivers::IlluminationController& illumination() { return illumination_; }
    drivers::BatteryManager& battery() { return battery_; }
    drivers::LedRingController& led_ring() { return led_ring_; }
    drivers::Buzzer& buzzer() { return buzzer_; }
    drivers::OledDisplay& display() { return display_; }
    drivers::Bme688Sensor& env_sensor() { return env_sensor_; }
    optics::SpectralCalibrator& calibrator() { return calibrator_; }
    ble::GattServer& ble_server() { return ble_server_; }
    ble::SpectrumStreamer& streamer() { return streamer_; }
    power::PowerBudgetTracker& power_budget() { return power_budget_; }

private:
    drivers::ChamberSensor chamber_;
    drivers::IlluminationController illumination_;
    drivers::BatteryManager battery_;
    drivers::LedRingController led_ring_;
    drivers::Buzzer buzzer_;
    drivers::OledDisplay display_;
    drivers::Bme688Sensor env_sensor_;
    drivers::MacroCamera camera_;

#if defined(AAHAR_SKU_LITE)
    drivers::As7265xTriad as7265x_driver_;
    std::unique_ptr<optics::As7265xSensorAdapter> sensor_adapter_;
#else
    drivers::HamamatsuC12880MA c12880_driver_;
    std::unique_ptr<optics::C12880MASensorAdapter> sensor_adapter_;
#endif

    optics::SpectralCalibrator calibrator_;
    std::unique_ptr<optics::CaptureSequenceCoordinator> capture_coordinator_;

    ble::GattServer ble_server_;
    ble::SpectrumStreamer streamer_;
    ble::OtaService ota_service_;

    power::PowerBudgetTracker power_budget_;
    power::PowerManager power_manager_;

    ble::DeviceState current_state_ = ble::DeviceState::IDLE;
    errors::ErrorCode last_error_ = errors::ERR_NONE;
    drivers::BatteryStatus last_battery_status_;
    drivers::EnvSample last_env_sample_;

    uint32_t status_notify_timer_ms_ = 0;
    uint32_t env_notify_timer_ms_ = 0;

    void handle_ble_command(ble::CommandType cmd);
    void broadcast_status();
    void broadcast_env();
    void update_oled();
};

} // namespace aahar

#endif // AAHAR_SYSTEM_CONTROLLER_H
