/**
 * AAHAR Silage Probe — Semtech SX1262 LoRa Radio SPI Driver
 * Implements command set, RF frequency (IN865 / EU868), SF7-SF10, +14dBm TX.
 */

#pragma once
#ifndef AAHAR_SX1262_DRIVER_H
#define AAHAR_SX1262_DRIVER_H

#include <cstdint>
#include <vector>
#include "probe_config.h"
#include "probe_error_codes.h"

namespace aahar::probe::lora {

class Sx1262Driver {
public:
    Sx1262Driver(
        int nss_pin  = config::PIN_SX1262_NSS,
        int busy_pin = config::PIN_SX1262_BUSY,
        int dio1_pin = config::PIN_SX1262_DIO1,
        int rst_pin  = config::PIN_SX1262_RESET
    );
    ~Sx1262Driver();

    bool init();
    bool configure_rf(
        uint32_t freq_hz = config::LORA_FREQUENCY_HZ,
        uint8_t sf = config::LORA_SPREADING_FACTOR,
        uint32_t bw_hz = config::LORA_BANDWIDTH_HZ,
        int8_t power_dbm = config::LORA_TX_POWER_DBM
    );

    bool transmit_packet(const uint8_t* payload, size_t len, uint32_t timeout_ms = 2000);

    // Simulation hook
    std::vector<uint8_t> get_last_transmitted_payload() const { return last_transmitted_; }

private:
    int nss_pin_;
    int busy_pin_;
    int dio1_pin_;
    int rst_pin_;
    bool is_simulated_ = false;
    std::vector<uint8_t> last_transmitted_;

    void wait_busy();
    void write_command(uint8_t opcode, const uint8_t* data, size_t len);
    void read_command(uint8_t opcode, uint8_t* data, size_t len);
};

} // namespace aahar::probe::lora

#endif // AAHAR_SX1262_DRIVER_H
