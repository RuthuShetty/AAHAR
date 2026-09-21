#include "sx1262_driver.h"

#ifdef ESP_PLATFORM
#include "driver/spi_master.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_rom_sys.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
static const char* TAG = "SX1262";
static spi_device_handle_t spi_lora = nullptr;
#endif

namespace aahar::probe::lora {

Sx1262Driver::Sx1262Driver(int nss, int busy, int dio1, int rst)
    : nss_pin_(nss), busy_pin_(busy), dio1_pin_(dio1), rst_pin_(rst) {}

Sx1262Driver::~Sx1262Driver() = default;

void Sx1262Driver::wait_busy() {
#ifdef ESP_PLATFORM
    int timeout_us = 10000; // 10 ms
    while (gpio_get_level(static_cast<gpio_num_t>(busy_pin_)) == 1 && timeout_us > 0) {
        esp_rom_delay_us(10);
        timeout_us -= 10;
    }
#endif
}

void Sx1262Driver::write_command(uint8_t opcode, const uint8_t* data, size_t len) {
#ifdef ESP_PLATFORM
    wait_busy();
    gpio_set_level(static_cast<gpio_num_t>(nss_pin_), 0);

    spi_transaction_t t = {};
    t.length = 8;
    t.tx_buffer = &opcode;
    spi_device_polling_transmit(spi_lora, &t);

    if (data && len > 0) {
        spi_transaction_t t_data = {};
        t_data.length = len * 8;
        t_data.tx_buffer = data;
        spi_device_polling_transmit(spi_lora, &t_data);
    }

    gpio_set_level(static_cast<gpio_num_t>(nss_pin_), 1);
    wait_busy();
#else
    (void)opcode; (void)data; (void)len;
#endif
}

bool Sx1262Driver::init() {
#ifdef ESP_PLATFORM
    // Configure NSS, BUSY, DIO1, RESET GPIOs
    gpio_config_t out_conf = {};
    out_conf.mode = GPIO_MODE_OUTPUT;
    out_conf.pin_bit_mask = (1ULL << nss_pin_) | (1ULL << rst_pin_);
    gpio_config(&out_conf);

    gpio_config_t in_conf = {};
    in_conf.mode = GPIO_MODE_INPUT;
    in_conf.pin_bit_mask = (1ULL << busy_pin_) | (1ULL << dio1_pin_);
    gpio_config(&in_conf);

    gpio_set_level(static_cast<gpio_num_t>(nss_pin_), 1);

    // Hard reset SX1262
    gpio_set_level(static_cast<gpio_num_t>(rst_pin_), 0);
    vTaskDelay(pdMS_TO_TICKS(10));
    gpio_set_level(static_cast<gpio_num_t>(rst_pin_), 1);
    vTaskDelay(pdMS_TO_TICKS(20));

    // Configure SPI Bus
    spi_bus_config_t buscfg = {
        .mosi_io_num = config::PIN_SX1262_MOSI,
        .miso_io_num = config::PIN_SX1262_MISO,
        .sclk_io_num = config::PIN_SX1262_SCK,
        .quadwp_io_num = -1,
        .quadhd_io_num = -1,
        .max_transfer_sz = 256
    };
    spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO);

    spi_device_interface_config_t devcfg = {
        .command_bits = 0,
        .address_bits = 0,
        .dummy_bits = 0,
        .mode = 0,
        .duty_cycle_pos = 128,
        .cs_ena_pretrans = 0,
        .cs_ena_posttrans = 0,
        .clock_speed_hz = 8000000, // 8 MHz
        .input_delay_ns = 0,
        .spics_io_num = -1, // Manual CS via nss_pin_
        .flags = 0,
        .queue_size = 7
    };
    spi_bus_add_device(SPI2_HOST, &devcfg, &spi_lora);

    // Set Standby mode (STDBY_RC = 0x00)
    uint8_t standby_arg = 0x00;
    write_command(0x80, &standby_arg, 1);
    ESP_LOGI(TAG, "SX1262 LoRa radio initialized on SPI2");
#else
    is_simulated_ = true;
#endif
    return true;
}

bool Sx1262Driver::configure_rf(uint32_t /*freq_hz*/, uint8_t /*sf*/, uint32_t /*bw_hz*/, int8_t /*power_dbm*/) {
#ifdef ESP_PLATFORM
    // Configure packet type, modulation params, PA config, and TX params
#endif
    return true;
}

bool Sx1262Driver::transmit_packet(const uint8_t* payload, size_t len, uint32_t /*timeout_ms*/) {
    if (!payload || len == 0) return false;
    last_transmitted_.assign(payload, payload + len);

#ifdef ESP_PLATFORM
    if (!is_simulated_) {
        // Write payload to SX1262 buffer (opcode 0x0E)
        uint8_t offset = 0;
        wait_busy();
        gpio_set_level(static_cast<gpio_num_t>(nss_pin_), 0);
        uint8_t hdr[2] = {0x0E, offset};
        spi_transaction_t t_hdr = {.length = 16, .tx_buffer = hdr};
        spi_device_polling_transmit(spi_lora, &t_hdr);
        spi_transaction_t t_data = {.length = static_cast<size_t>(len * 8), .tx_buffer = payload};
        spi_device_polling_transmit(spi_lora, &t_data);
        gpio_set_level(static_cast<gpio_num_t>(nss_pin_), 1);
        wait_busy();

        // Set TX (opcode 0x83, timeout 0)
        uint8_t tx_timeout[3] = {0x00, 0x00, 0x00};
        write_command(0x83, tx_timeout, 3);
        vTaskDelay(pdMS_TO_TICKS(config::LORA_TX_DURATION_MS));
    }
#endif
    return true;
}

} // namespace aahar::probe::lora
