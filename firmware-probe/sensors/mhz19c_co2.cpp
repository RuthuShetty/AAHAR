#include "mhz19c_co2.h"

#ifdef ESP_PLATFORM
#include "driver/uart.h"
#include "esp_log.h"
static const char* TAG = "MHZ19C_CO2";
#endif

namespace aahar::probe::sensors {

MhZ19cCo2Sensor::MhZ19cCo2Sensor(int tx_pin, int rx_pin)
    : tx_pin_(tx_pin), rx_pin_(rx_pin) {}

MhZ19cCo2Sensor::~MhZ19cCo2Sensor() = default;

uint8_t MhZ19cCo2Sensor::calculate_checksum(const uint8_t* packet) {
    uint8_t sum = 0;
    for (int i = 1; i < 8; ++i) {
        sum += packet[i];
    }
    return static_cast<uint8_t>(0xFF - sum + 1);
}

bool MhZ19cCo2Sensor::init() {
#ifdef ESP_PLATFORM
    uart_config_t uart_config = {
        .baud_rate = static_cast<int>(config::MHZ19_BAUD_RATE),
        .data_bits = UART_DATA_8_BITS,
        .parity    = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    uart_param_config(UART_NUM_1, &uart_config);
    uart_set_pin(UART_NUM_1, tx_pin_, rx_pin_, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
    uart_driver_install(UART_NUM_1, 256, 0, 0, nullptr, 0);
    ESP_LOGI(TAG, "MH-Z19C UART initialized (TX=%d, RX=%d)", tx_pin_, rx_pin_);
#else
    is_simulated_ = true;
#endif
    return true;
}

uint16_t MhZ19cCo2Sensor::read_co2_ppm(errors::ProbeErrorCode* err_out) {
    if (is_simulated_) {
        if (err_out) *err_out = errors::PROBE_OK;
        return CO2_INVALID;  // was: simulated_co2_ reported as a real reading
    }

#ifdef ESP_PLATFORM
    uint8_t cmd[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
    uart_write_bytes(UART_NUM_1, cmd, sizeof(cmd));

    uint8_t resp[9];
    int len = uart_read_bytes(UART_NUM_1, resp, sizeof(resp), pdMS_TO_TICKS(500));
    if (len == 9 && resp[0] == 0xFF && resp[1] == 0x86) {
        uint8_t checksum = calculate_checksum(resp);
        if (checksum == resp[8]) {
            uint16_t ppm = (static_cast<uint16_t>(resp[2]) << 8) | resp[3];
            if (err_out) *err_out = errors::PROBE_OK;
            return ppm;
        }
    }
    if (err_out) *err_out = errors::ERR_MHZ19_NO_RESPONSE;
    return CO2_INVALID;  // was: simulated_co2_ reported as a real reading
#else
    if (err_out) *err_out = errors::PROBE_OK;
    return CO2_INVALID;  // was: simulated_co2_ reported as a real reading
#endif
}

void MhZ19cCo2Sensor::set_simulated_co2(uint16_t ppm) {
    is_simulated_ = true;
    state_ = SensorState::Simulated;
    simulated_co2_ = ppm;
}

} // namespace aahar::probe::sensors
