/**
 * AAHAR Handheld — Chamber Interlock Sensor Driver
 * Monitors mechanical chamber cover via Hall effect sensor / microswitch.
 */

#pragma once
#ifndef AAHAR_CHAMBER_SENSOR_H
#define AAHAR_CHAMBER_SENSOR_H

#include <cstdint>
#include <functional>
#include "aahar_config.h"

namespace aahar::drivers {

class ChamberSensor {
public:
    using OpenCallback = std::function<void()>;

    ChamberSensor(int gpio_pin = config::PIN_CHAMBER_INTERLOCK);
    ~ChamberSensor();

    bool init();
    bool is_closed() const;
    void register_open_callback(OpenCallback cb);

    // Simulation / testing hook
    void set_simulated_closed(bool closed);

private:
    int pin_;
    bool is_simulated_ = false;
    bool simulated_state_ = true;
    OpenCallback open_callback_ = nullptr;

    static void IRAM_ATTR gpio_isr_handler(void* arg);
};

} // namespace aahar::drivers

#endif // AAHAR_CHAMBER_SENSOR_H
