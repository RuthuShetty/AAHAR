/**
 * AAHAR Silage Probe — Master Probe Task Coordinator
 * Sequences 15-minute wake-measure-transmit-sleep cycles.
 */

#pragma once
#ifndef AAHAR_PROBE_CONTROLLER_H
#define AAHAR_PROBE_CONTROLLER_H

#include <memory>
#include <string>
#include "probe_config.h"
#include "probe_error_codes.h"
#include "sensors/isfet_ph.h"
#include "sensors/ds18b20_array.h"
#include "sensors/capacitive_moisture.h"
#include "sensors/mhz19c_co2.h"
#include "sensors/bme688_probe.h"
#include "lora/sx1262_driver.h"
#include "lora/lorawan_node.h"
#include "lora/ble_probe_relay.h"
#include "power/probe_power.h"

namespace aahar::probe {

struct ProbeReadingSnapshot {
    float ph = 4.0f;
    sensors::TemperatureProfile temps;
    float moisture_pct = 65.0f;
    uint16_t co2_ppm = 1200;
    float o2_pct = 0.8f;
    float voc_index = 60.0f;
    uint8_t battery_pct = 95;
    uint16_t error_flags = 0;
};

class ProbeController {
public:
    ProbeController();
    ~ProbeController();

    bool init();
    
    // Executes single measurement and LoRaWAN uplink cycle
    ProbeReadingSnapshot execute_cycle(uint16_t sequence_num);

    // Direct sensor access for testing
    sensors::IsfetPhSensor& ph_sensor() { return ph_sensor_; }
    sensors::Ds18b20Array& temp_array() { return temp_array_; }
    sensors::CapacitiveMoistureSensor& moisture_sensor() { return moisture_sensor_; }
    sensors::MhZ19cCo2Sensor& co2_sensor() { return co2_sensor_; }
    sensors::Bme688ProbeSensor& env_sensor() { return env_sensor_; }
    lora::LoRaWanNode& lorawan() { return lorawan_; }
    lora::BleProbeRelay& ble_relay() { return ble_relay_; }
    power::ProbePowerManager& power_manager() { return power_manager_; }

private:
    sensors::IsfetPhSensor ph_sensor_;
    sensors::Ds18b20Array temp_array_;
    sensors::CapacitiveMoistureSensor moisture_sensor_;
    sensors::MhZ19cCo2Sensor co2_sensor_;
    sensors::Bme688ProbeSensor env_sensor_;
    lora::Sx1262Driver radio_;
    lora::LoRaWanNode lorawan_;
    lora::BleProbeRelay ble_relay_;
    power::ProbePowerManager power_manager_;
};

} // namespace aahar::probe

#endif // AAHAR_PROBE_CONTROLLER_H
