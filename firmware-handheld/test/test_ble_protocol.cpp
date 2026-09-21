/**
 * AAHAR Firmware Unit Test — BLE Protocol & Commands
 */

#include <cassert>
#include <cstdio>
#include <string>
#include "ble/ble_types.h"
#include "ble/gatt_server.h"

namespace aahar::test {

void test_ble_protocol_parsing() {
    std::printf("Running test_ble_protocol_parsing...\n");

    assert(ble::parse_command_string("START_SCAN") == ble::CommandType::START_SCAN);
    assert(ble::parse_command_string("ABORT") == ble::CommandType::ABORT);
    assert(ble::parse_command_string("CALIBRATE") == ble::CommandType::CALIBRATE);
    assert(ble::parse_command_string("SLEEP") == ble::CommandType::SLEEP);
    assert(ble::parse_command_string("OTA_BEGIN") == ble::CommandType::OTA_BEGIN);
    assert(ble::parse_command_string("UNKNOWN_XYZ") == ble::CommandType::UNKNOWN);

    ble::GattServer server;
    server.init("AAHAR-P-004821");

    bool command_received = false;
    ble::CommandType last_cmd = ble::CommandType::UNKNOWN;

    server.register_command_callback([&](ble::CommandType cmd) {
        command_received = true;
        last_cmd = cmd;
    });

    server.simulate_connect(true);
    assert(server.is_connected());

    server.simulate_write_command(ble::CommandType::START_SCAN);
    assert(command_received);
    assert(last_cmd == ble::CommandType::START_SCAN);

    std::printf("  PASS: test_ble_protocol_parsing\n");
}

} // namespace aahar::test
