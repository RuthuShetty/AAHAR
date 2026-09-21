/**
 * AAHAR Silage Probe — BLE Fallback Relay Service
 * Advertises probe status and streams cached readings to phone
 * when no LoRaWAN gateway is within RF range on the farm.
 */

#pragma once
#ifndef AAHAR_BLE_PROBE_RELAY_H
#define AAHAR_BLE_PROBE_RELAY_H

#include <cstdint>
#include <string>
#include <vector>
#include "lorawan_node.h"

namespace aahar::probe::lora {

class BleProbeRelay {
public:
    BleProbeRelay(const std::string& probe_id = config::DEFAULT_PROBE_ID);
    ~BleProbeRelay();

    bool init();
    void start_advertising();
    void stop_advertising();

    void queue_reading_for_relay(const ProbeTelemetryPacket& pkt);
    bool has_pending_readings() const { return !pending_readings_.empty(); }
    size_t get_pending_count() const { return pending_readings_.size(); }

    // Simulation / testing hook
    void simulate_phone_sync_download(std::vector<ProbeTelemetryPacket>& downloaded);

private:
    std::string probe_id_;
    bool is_simulated_ = false;
    std::vector<ProbeTelemetryPacket> pending_readings_;
};

} // namespace aahar::probe::lora

#endif // AAHAR_BLE_PROBE_RELAY_H
