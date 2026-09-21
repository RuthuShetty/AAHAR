/**
 * AAHAR Handheld — AS7265x Triad Optical Sensor Driver (AAHAR Lite SKU).
 *
 * REWRITTEN. The previous implementation:
 *   - returned true from init() when the sensor did not respond, setting an
 *     is_simulated_ flag;
 *   - returned simulated_buffer_ from capture_calibrated() on ALL THREE
 *     branches, including the "#ifdef ESP_PLATFORM real hardware" branch, so
 *     it never performed an I2C read under any build;
 *   - reported success in every case.
 * The AAHAR Lite spectrometer therefore emitted a cosine curve as a
 * measurement. That is fixed here: absent hardware is reported as absent and
 * no data is produced.
 */
#include "as7265x.h"
#include "sensor_guard.h"
#include <cmath>
#include <cstring>

#ifdef ESP_PLATFORM
#include "driver/i2c.h"
#include "esp_log.h"
#include "rom/ets_sys.h"
static const char* TAG = "AS7265X";
#else
#define ESP_LOGW(tag, fmt, ...) ((void)0)
#define ESP_LOGI(tag, fmt, ...) ((void)0)
#define ESP_LOGE(tag, fmt, ...) ((void)0)
#endif

namespace aahar::drivers {

namespace {
// AS7265x virtual-register protocol constants (datasheet Table 8).
constexpr uint8_t REG_STATUS      = 0x00;
constexpr uint8_t REG_WRITE       = 0x01;
constexpr uint8_t REG_READ        = 0x02;
constexpr uint8_t STATUS_TX_VALID = 0x02;
constexpr uint8_t STATUS_RX_VALID = 0x01;
constexpr uint8_t HW_TYPE_EXPECTED = 0x40;
constexpr int     VIRTUAL_REG_TIMEOUT_ITERS = 100;
// Calibrated float registers: 0x14..0x2B, 4 bytes each, 6 channels per device.
constexpr uint8_t REG_CAL_BASE = 0x14;
constexpr uint8_t DEV_SELECT_REG = 0x4F;
}  // namespace

As7265xTriad::As7265xTriad(uint8_t i2c_addr) : i2c_addr_(i2c_addr) {}
As7265xTriad::~As7265xTriad() = default;

#ifdef ESP_PLATFORM
static bool i2c_read_u8(uint8_t addr, uint8_t reg, uint8_t* out) {
    return i2c_master_write_read_device(I2C_NUM_0, addr, &reg, 1, out, 1,
                                        pdMS_TO_TICKS(50)) == ESP_OK;
}
static bool i2c_write_u8(uint8_t addr, uint8_t reg, uint8_t val) {
    uint8_t buf[2] = {reg, val};
    return i2c_master_write_to_device(I2C_NUM_0, addr, buf, 2,
                                      pdMS_TO_TICKS(50)) == ESP_OK;
}
#endif

bool As7265xTriad::virtual_reg_read(uint8_t reg, uint8_t* out) {
#ifdef ESP_PLATFORM
    uint8_t status = 0;
    for (int i = 0; i < VIRTUAL_REG_TIMEOUT_ITERS; ++i) {
        if (!i2c_read_u8(i2c_addr_, REG_STATUS, &status)) return false;
        if ((status & STATUS_TX_VALID) == 0) break;
        ets_delay_us(5000);
        if (i == VIRTUAL_REG_TIMEOUT_ITERS - 1) return false;
    }
    if (!i2c_write_u8(i2c_addr_, REG_WRITE, reg)) return false;

    for (int i = 0; i < VIRTUAL_REG_TIMEOUT_ITERS; ++i) {
        if (!i2c_read_u8(i2c_addr_, REG_STATUS, &status)) return false;
        if (status & STATUS_RX_VALID) break;
        ets_delay_us(5000);
        if (i == VIRTUAL_REG_TIMEOUT_ITERS - 1) return false;
    }
    return i2c_read_u8(i2c_addr_, REG_READ, out);
#else
    (void)reg; (void)out;
    return false;   // No I2C bus off-target. Absent, not simulated.
#endif
}

bool As7265xTriad::virtual_reg_write(uint8_t reg, uint8_t val) {
#ifdef ESP_PLATFORM
    uint8_t status = 0;
    for (int i = 0; i < VIRTUAL_REG_TIMEOUT_ITERS; ++i) {
        if (!i2c_read_u8(i2c_addr_, REG_STATUS, &status)) return false;
        if ((status & STATUS_TX_VALID) == 0) break;
        ets_delay_us(5000);
        if (i == VIRTUAL_REG_TIMEOUT_ITERS - 1) return false;
    }
    if (!i2c_write_u8(i2c_addr_, REG_WRITE, reg | 0x80)) return false;

    for (int i = 0; i < VIRTUAL_REG_TIMEOUT_ITERS; ++i) {
        if (!i2c_read_u8(i2c_addr_, REG_STATUS, &status)) return false;
        if ((status & STATUS_TX_VALID) == 0) break;
        ets_delay_us(5000);
        if (i == VIRTUAL_REG_TIMEOUT_ITERS - 1) return false;
    }
    return i2c_write_u8(i2c_addr_, REG_WRITE, val);
#else
    (void)reg; (void)val;
    return false;
#endif
}

bool As7265xTriad::init() {
    if (state_ == SensorState::Simulated) {
        return AAHAR_SIMULATION_ALLOWED;   // only reachable in test builds
    }

    uint8_t hw_type = 0;
    if (!virtual_reg_read(REG_STATUS, &hw_type) || hw_type != HW_TYPE_EXPECTED) {
        ESP_LOGE(TAG, "AS7265x not detected (ID 0x%02X) - marking NOT_PRESENT", hw_type);
        state_ = SensorState::NotPresent;
        return false;     // was: is_simulated_ = true; return true;
    }

    if (!set_gain(2) || !set_integration_time(40)) {
        state_ = SensorState::Faulty;
        return false;
    }
    ESP_LOGI(TAG, "AS7265x initialised at 0x%02X", i2c_addr_);
    state_ = SensorState::Ok;
    return true;
}

bool As7265xTriad::set_gain(uint8_t gain_level) {
    return virtual_reg_write(0x05, static_cast<uint8_t>(gain_level & 0x03));
}

bool As7265xTriad::set_integration_time(uint8_t int_cycles) {
    return virtual_reg_write(0x04, int_cycles);
}

SensorState As7265xTriad::capture_calibrated(
    std::array<float, AS7265X_NUM_CHANNELS>& channels_out) {

    if (state_ == SensorState::Simulated) {
#if AAHAR_SIMULATION_ALLOWED
        channels_out = simulated_buffer_;
        return SensorState::Simulated;   // caller MUST reject this in release
#else
        return SensorState::NotPresent;
#endif
    }

    if (state_ != SensorState::Ok) {
        channels_out.fill(0.0f);
        return state_;
    }

    // Read the 18 calibrated floats: 6 per device across the 3 dies.
    for (uint8_t dev = 0; dev < 3; ++dev) {
        if (!virtual_reg_write(DEV_SELECT_REG, dev)) {
            channels_out.fill(0.0f);
            state_ = SensorState::Faulty;
            return state_;
        }
        for (uint8_t ch = 0; ch < 6; ++ch) {
            uint8_t raw[4] = {0, 0, 0, 0};
            for (uint8_t b = 0; b < 4; ++b) {
                if (!virtual_reg_read(
                        static_cast<uint8_t>(REG_CAL_BASE + ch * 4 + b), &raw[b])) {
                    channels_out.fill(0.0f);
                    state_ = SensorState::Faulty;
                    return state_;
                }
            }
            uint32_t bits = (static_cast<uint32_t>(raw[0]) << 24) |
                            (static_cast<uint32_t>(raw[1]) << 16) |
                            (static_cast<uint32_t>(raw[2]) << 8) |
                            static_cast<uint32_t>(raw[3]);
            float value = 0.0f;
            std::memcpy(&value, &bits, sizeof(value));
            if (!std::isfinite(value) || value < 0.0f) {
                channels_out.fill(0.0f);
                state_ = SensorState::Faulty;
                return state_;
            }
            channels_out[dev * 6 + ch] = value;
        }
    }
    return SensorState::Ok;
}

#if AAHAR_SIMULATION_ALLOWED
void As7265xTriad::set_simulated_channels(
    const std::array<float, AS7265X_NUM_CHANNELS>& simulated) {
    state_ = SensorState::Simulated;
    simulated_buffer_ = simulated;
}
#endif

}  // namespace aahar::drivers
