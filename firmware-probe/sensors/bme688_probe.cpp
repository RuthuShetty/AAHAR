#include "bme688_probe.h"

#ifdef ESP_PLATFORM
#include "driver/i2c.h"
#include "esp_log.h"
static const char* TAG = "BME688_PROBE";
#endif

namespace aahar::probe::sensors {

Bme688ProbeSensor::Bme688ProbeSensor(uint8_t i2c_addr) : i2c_addr_(i2c_addr) {}
Bme688ProbeSensor::~Bme688ProbeSensor() = default;

bool Bme688ProbeSensor::init() {
#ifdef ESP_PLATFORM
    uint8_t chip_id = 0;
    uint8_t reg = 0xD0;
    esp_err_t ret = i2c_master_write_read_device(I2C_NUM_0, i2c_addr_, &reg, 1, &chip_id, 1, pdMS_TO_TICKS(100));
    if (ret != ESP_OK || chip_id != 0x61) {
        is_simulated_ = true;
        return true;
    }
    ESP_LOGI(TAG, "BME688 initialized in probe head at 0x%02X", i2c_addr_);
#else
    is_simulated_ = true;
#endif
    return true;
}

HeadEnvData Bme688ProbeSensor::read(errors::ProbeErrorCode* err_out) {
    if (err_out) *err_out = errors::PROBE_OK;
    return current_data_;
}

void Bme688ProbeSensor::set_simulated_data(const HeadEnvData& data) {
    is_simulated_ = true;
    current_data_ = data;
}

} // namespace aahar::probe::sensors
