#include "chamber_sensor.h"
#include "sensor_guard.h"

#ifdef ESP_PLATFORM
#include "driver/gpio.h"
#include "esp_log.h"
static const char* TAG = "CHAMBER_SENSOR";
#endif

namespace aahar::drivers {

ChamberSensor::ChamberSensor(int gpio_pin)
    : pin_(gpio_pin) {}

ChamberSensor::~ChamberSensor() {
#ifdef ESP_PLATFORM
    gpio_isr_handler_remove(static_cast<gpio_num_t>(pin_));
#endif
}

bool ChamberSensor::init() {
#ifdef ESP_PLATFORM
    gpio_config_t io_conf = {};
    io_conf.intr_type = GPIO_INTR_POSEDGE; // Trigger interrupt on chamber OPEN (pin pulled HIGH)
    io_conf.mode = GPIO_MODE_INPUT;
    io_conf.pin_bit_mask = (1ULL << pin_);
    io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
    io_conf.pull_up_en = GPIO_PULLUP_ENABLE; // Active LOW when magnet closes switch
    esp_err_t ret = gpio_config(&io_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure chamber GPIO: %d", ret);
        return false;
    }

    gpio_install_isr_service(0);
    gpio_isr_handler_add(static_cast<gpio_num_t>(pin_), gpio_isr_handler, this);
    ESP_LOGI(TAG, "Chamber sensor initialized on GPIO %d (State: %s)", pin_, is_closed() ? "CLOSED" : "OPEN");
    return true;
#else
    is_simulated_ = true;
    return true;
#endif
}

bool ChamberSensor::is_closed() const {
    if (is_simulated_) {
#if AAHAR_SIMULATION_ALLOWED
        return simulated_state_;
#else
        // Fail closed: an unreadable chamber switch must read as OPEN so the
        // scan aborts. Defaulting to "closed" allowed a capture with the lid
        // open, flooding the detector with ambient light.
        return false;
#endif
    }
#ifdef ESP_PLATFORM
    // Active LOW: 0 means magnet is in place (closed), 1 means open
    return gpio_get_level(static_cast<gpio_num_t>(pin_)) == 0;
#else
    return simulated_state_;
#endif
}

void ChamberSensor::register_open_callback(OpenCallback cb) {
    open_callback_ = cb;
}

void ChamberSensor::set_simulated_closed(bool closed) {
    simulated_state_ = closed;
    if (!closed && open_callback_) {
        open_callback_();
    }
}

void IRAM_ATTR ChamberSensor::gpio_isr_handler(void* arg) {
    auto* sensor = static_cast<ChamberSensor*>(arg);
    if (sensor && sensor->open_callback_) {
        sensor->open_callback_();
    }
}

} // namespace aahar::drivers
