#include "ble_probe_relay.h"

#ifdef ESP_PLATFORM
#include "esp_log.h"
static const char* TAG = "BLE_RELAY";
#endif

namespace aahar::probe::lora {

BleProbeRelay::BleProbeRelay(const std::string& probe_id) : probe_id_(probe_id) {}
BleProbeRelay::~BleProbeRelay() = default;

bool BleProbeRelay::init() {
#ifdef ESP_PLATFORM
    ESP_LOGI(TAG, "BLE Probe Relay initialized for %s", probe_id_.c_str());
#else
    is_simulated_ = true;
#endif
    return true;
}

void BleProbeRelay::start_advertising() {
#ifdef ESP_PLATFORM
    // Start BLE advertisement with manufacturer specific data containing latest pH and temp
#endif
}

void BleProbeRelay::stop_advertising() {
#ifdef ESP_PLATFORM
    // Stop BLE advertising to conserve energy in deep sleep
#endif
}

void BleProbeRelay::queue_reading_for_relay(const ProbeTelemetryPacket& pkt) {
    // Keep up to 96 readings (24 hours of 15-minute readings)
    if (pending_readings_.size() >= 96) {
        pending_readings_.erase(pending_readings_.begin());
    }
    pending_readings_.push_back(pkt);
}

void BleProbeRelay::simulate_phone_sync_download(std::vector<ProbeTelemetryPacket>& downloaded) {
    downloaded = pending_readings_;
    pending_readings_.clear();
}

} // namespace aahar::probe::lora
