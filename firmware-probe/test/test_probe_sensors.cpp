/**
 * AAHAR Probe Unit Test — Sensor Drivers & Calibrations
 */

#include <cassert>
#include <cstdio>
#include <cmath>
#include "sensors/isfet_ph.h"
#include "sensors/ds18b20_array.h"
#include "sensors/capacitive_moisture.h"
#include "sensors/mhz19c_co2.h"

namespace aahar::probe::test {

void test_sensors() {
    std::printf("Running probe test_sensors...\n");

    // 1. ISFET pH
    sensors::IsfetPhSensor ph_sensor;
    ph_sensor.init();
    ph_sensor.set_simulated_ph(3.92f);
    errors::ProbeErrorCode err = errors::PROBE_OK;
    float ph = ph_sensor.read_ph(25.0f, &err);
    assert(err == errors::PROBE_OK);
    assert(std::abs(ph - 3.92f) < 0.05f);

    // 2. 4-Depth DS18B20 Array
    sensors::Ds18b20Array temp_array;
    temp_array.init();
    temp_array.set_simulated_temps({23.0f, 24.5f, 25.5f, 27.0f});
    auto profile = temp_array.read(&err);
    assert(err == errors::PROBE_OK);
    assert(profile.sensors_found == 4);
    assert(std::abs(profile.mean_temp_c - 25.0f) < 0.01f);
    assert(profile.min_temp_c == 23.0f);
    assert(profile.max_temp_c == 27.0f);

    // 3. Capacitive Moisture Lance
    sensors::CapacitiveMoistureSensor moisture_sensor;
    moisture_sensor.init();
    moisture_sensor.set_simulated_moisture(68.0f);
    float moist = moisture_sensor.read_moisture_pct(&err);
    assert(err == errors::PROBE_OK);
    assert(std::abs(moist - 68.0f) < 0.1f);

    // 4. MH-Z19C NDIR CO2
    uint8_t dummy_pkt[9] = {0xFF, 0x86, 0x05, 0xAA, 0x00, 0x00, 0x00, 0x00, 0x00};
    uint8_t csum = sensors::MhZ19cCo2Sensor::calculate_checksum(dummy_pkt);
    dummy_pkt[8] = csum;
    assert(sensors::MhZ19cCo2Sensor::calculate_checksum(dummy_pkt) == csum);

    sensors::MhZ19cCo2Sensor co2_sensor;
    co2_sensor.init();
    co2_sensor.set_simulated_co2(1850);
    uint16_t co2 = co2_sensor.read_co2_ppm(&err);
    assert(err == errors::PROBE_OK);
    assert(co2 == 1850);

    std::printf("  PASS: probe test_sensors\n");
}

} // namespace aahar::probe::test
