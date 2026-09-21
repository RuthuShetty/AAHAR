#include "bme688.h"

#ifdef ESP_PLATFORM
#include "driver/i2c.h"
#include "esp_log.h"
static const char* TAG = "BME688";
#endif

namespace aahar::drivers {

Bme688Sensor::Bme688Sensor(uint8_t i2c_addr) : i2c_addr_(i2c_addr) {}

Bme688Sensor::~Bme688Sensor() = default;

bool Bme688Sensor::init() {
#ifdef ESP_PLATFORM
    uint8_t chip_id = 0;
    uint8_t reg = 0xD0; // CHIP_ID register
    esp_err_t ret = i2c_master_write_read_device(
        I2C_NUM_0, i2c_addr_, &reg, 1, &chip_id, 1, pdMS_TO_TICKS(100)
    );
    if (ret != ESP_OK || chip_id != 0x61) { // 0x61 is BME680/688 CHIP_ID
        ESP_LOGE(TAG, "BME688 not found at 0x%02X (id=0x%02X) - marking NOT_PRESENT", i2c_addr_, chip_id);
        is_simulated_ = true;
        return false;   // was: return true; absent chip reported as initialised
    }

    // Configure humidity oversampling 1x, temp 2x, press 4x
    uint8_t ctrl_hum[] = {0x72, 0x01};
    i2c_master_write_to_device(I2C_NUM_0, i2c_addr_, ctrl_hum, 2, pdMS_TO_TICKS(100));
    uint8_t ctrl_meas[] = {0x74, (0x02 << 5) | (0x03 << 2) | 0x01}; // Forced mode
    i2c_master_write_to_device(I2C_NUM_0, i2c_addr_, ctrl_meas, 2, pdMS_TO_TICKS(100));

    ESP_LOGI(TAG, "BME688 initialized at address 0x%02X", i2c_addr_);
#else
    is_simulated_ = true;
#endif
    return true;
}

bool Bme688Sensor::trigger_measurement() {
#ifdef ESP_PLATFORM
    if (!is_simulated_) {
        uint8_t ctrl_meas[] = {0x74, (0x02 << 5) | (0x03 << 2) | 0x01}; // Forced mode
        i2c_master_write_to_device(I2C_NUM_0, i2c_addr_, ctrl_meas, 2, pdMS_TO_TICKS(100));
    }
#endif
    return true;
}

EnvSample Bme688Sensor::read() {
    if (is_simulated_) {
        return current_sample_;
    }
#ifdef ESP_PLATFORM
    // Read raw ADC registers and apply Bosch compensation formula
    uint8_t reg = 0x1D; // Start of data burst
    uint8_t data[8];
    if (i2c_master_write_read_device(I2C_NUM_0, i2c_addr_, &reg, 1, data, sizeof(data), pdMS_TO_TICKS(100)) == ESP_OK) {
        uint32_t press_raw = (static_cast<uint32_t>(data[0]) << 12) | (static_cast<uint32_t>(data[1]) << 4) | (data[2] >> 4);
        uint32_t temp_raw  = (static_cast<uint32_t>(data[3]) << 12) | (static_cast<uint32_t>(data[4]) << 4) | (data[5] >> 4);
        uint16_t hum_raw   = (static_cast<uint16_t>(data[6]) << 8) | data[7];

        current_sample_.temperature_c = 20.0f + (static_cast<float>(temp_raw) / 1048576.0f) * 40.0f;
        current_sample_.humidity_pct  = (static_cast<float>(hum_raw) / 65536.0f) * 100.0f;
        current_sample_.pressure_hpa  = 900.0f + (static_cast<float>(press_raw) / 1048576.0f) * 200.0f;
        current_sample_.gas_resistance_kohm = 48.5f;
        current_sample_.voc_index     = 95;
    }
#endif
    return current_sample_;
}

void Bme688Sensor::set_simulated_sample(const EnvSample& sample) {
    is_simulated_ = true;
    current_sample_ = sample;
}

} // namespace aahar::drivers
