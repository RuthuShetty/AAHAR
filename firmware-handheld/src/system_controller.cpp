#include "system_controller.h"

#ifdef ESP_PLATFORM
#include "esp_log.h"
static const char* TAG = "SYS_CONTROLLER";
#endif

namespace aahar {

SystemController::SystemController()
    : power_manager_(battery_, power_budget_) {

#if defined(AAHAR_SKU_LITE)
    sensor_adapter_ = std::make_unique<optics::As7265xSensorAdapter>(as7265x_driver_);
#else
    sensor_adapter_ = std::make_unique<optics::C12880MASensorAdapter>(c12880_driver_);
#endif

    capture_coordinator_ = std::make_unique<optics::CaptureSequenceCoordinator>(
        chamber_, illumination_, battery_, led_ring_, buzzer_,
        env_sensor_, camera_, *sensor_adapter_, calibrator_
    );
}

SystemController::~SystemController() = default;

bool SystemController::init() {
    chamber_.init();
    illumination_.init();
    battery_.init();
    led_ring_.init();
    buzzer_.init();
    display_.init();
    env_sensor_.init();
    camera_.init();
    sensor_adapter_->init();
    power_manager_.init();

    // Setup BLE
    ble_server_.init(config::DEFAULT_SERIAL);
    ble_server_.register_command_callback([this](ble::CommandType cmd) {
        handle_ble_command(cmd);
    });
    ble_server_.register_connection_callback([this](bool connected) {
        if (connected) {
            led_ring_.set_color(drivers::RgbColor::Blue(), drivers::LedRingMode::SOLID);
            buzzer_.play_tone(2500, 80);
        } else {
            led_ring_.set_color(drivers::RgbColor::Green(), drivers::LedRingMode::SOLID);
        }
        update_oled();
    });
    ble_server_.start_advertising();

    last_battery_status_ = battery_.read_status();
    last_env_sample_ = env_sensor_.read();

    current_state_ = ble::DeviceState::IDLE;
    update_oled();
    broadcast_status();

    return true;
}

void SystemController::handle_ble_command(ble::CommandType cmd) {
    power_manager_.feed_inactivity_timer();

    switch (cmd) {
        case ble::CommandType::START_SCAN:
            start_scan();
            break;
        case ble::CommandType::ABORT:
            abort_scan();
            break;
        case ble::CommandType::CALIBRATE:
            run_white_dark_calibration();
            break;
        case ble::CommandType::SLEEP:
            power_manager_.set_state(power::PowerState::LIGHT_SLEEP);
            current_state_ = ble::DeviceState::SLEEP;
            broadcast_status();
            break;
        case ble::CommandType::OTA_BEGIN:
            current_state_ = ble::DeviceState::IDLE;
            broadcast_status();
            break;
        default:
            break;
    }
}

bool SystemController::start_scan() {
    if (current_state_ == ble::DeviceState::SCANNING) {
        return false;
    }

    current_state_ = ble::DeviceState::SCANNING;
    power_manager_.set_state(power::PowerState::ACTIVE_SCAN);
    broadcast_status();

    auto scan_res = capture_coordinator_->execute_scan([this](uint8_t progress_pct, float elapsed_s) {
        display_.show_scanning(progress_pct, elapsed_s);
        led_ring_.set_progress(progress_pct, drivers::RgbColor::Blue());
    });

    if (scan_res.status != errors::ERR_NONE) {
        current_state_ = ble::DeviceState::ERROR;
        last_error_ = scan_res.status;
        display_.show_error(errors::to_string(scan_res.status));
        broadcast_status();
        return false;
    }

    // Packetize spectrum and stream to phone over BLE GATT
    auto packets = streamer_.prepare_packets(
        scan_res.wavelengths,
        scan_res.mean_intensities,
        scan_res.repeats
    );

    streamer_.stream(packets, [this](const ble::SpectrumPacket& pkt) {
        return ble_server_.notify_spectrum_packet(pkt);
    });

    // Notify final environmental reading
    ble_server_.notify_env_data(scan_res.env_data);

    power_budget_.record_scan_completed();
    current_state_ = ble::DeviceState::IDLE;
    last_error_ = errors::ERR_NONE;
    power_manager_.set_state(power::PowerState::IDLE);

    broadcast_status();
    update_oled();
    return true;
}

void SystemController::abort_scan() {
    if (capture_coordinator_) {
        capture_coordinator_->abort();
    }
    current_state_ = ble::DeviceState::IDLE;
    power_manager_.set_state(power::PowerState::IDLE);
    broadcast_status();
    update_oled();
}

bool SystemController::run_white_dark_calibration() {
    current_state_ = ble::DeviceState::CALIBRATING;
    led_ring_.set_color(drivers::RgbColor::Amber(), drivers::LedRingMode::BREATHING);
    buzzer_.play_effect(drivers::SoundEffect::CALIBRATION_TONE);
    display_.show_calibrating();
    broadcast_status();

    // 1. Dark reading (shutter closed, lights off)
    illumination_.emergency_cutoff();
    std::vector<float> dark_raw;
    std::vector<float> dark_wls;
    sensor_adapter_->capture_raw(dark_raw, dark_wls);
    calibrator_.set_dark_reference(dark_raw);

    // 2. White reference reading (white tile illuminated)
    illumination_.start_halogen_ramp(1000);
    std::vector<float> white_raw;
    std::vector<float> white_wls;
    sensor_adapter_->capture_raw(white_raw, white_wls);
    calibrator_.set_white_reference(white_raw);
    illumination_.emergency_cutoff();

    current_state_ = ble::DeviceState::IDLE;
    led_ring_.set_color(drivers::RgbColor::Green(), drivers::LedRingMode::SOLID);
    buzzer_.play_effect(drivers::SoundEffect::CLICK);
    broadcast_status();
    update_oled();
    return true;
}

void SystemController::broadcast_status() {
    ble::DeviceStatusPayload status;
    status.state = current_state_;
    status.battery_pct = last_battery_status_.percentage;
    status.chamber_closed = chamber_.is_closed();
    status.lamp_temperature_c = illumination_.get_lamp_heatsink_temp_c();
    status.error_code = last_error_;
    status.led_ring_color = led_ring_.get_active_hex_color();

    ble_server_.notify_status(status);
}

void SystemController::broadcast_env() {
    last_env_sample_ = env_sensor_.read();
    ble_server_.notify_env_data(last_env_sample_);
}

void SystemController::update_oled() {
    if (current_state_ == ble::DeviceState::IDLE) {
        display_.show_idle(
            last_battery_status_.percentage,
            ble_server_.is_connected(),
            chamber_.is_closed()
        );
    }
}

void SystemController::update(uint32_t delta_ms) {
    power_manager_.update(delta_ms);
    led_ring_.update_animation(delta_ms);

    // 1-second status broadcast timer
    status_notify_timer_ms_ += delta_ms;
    if (status_notify_timer_ms_ >= 1000) {
        status_notify_timer_ms_ = 0;
        last_battery_status_ = battery_.read_status();
        broadcast_status();
    }

    // 5-second environmental sample broadcast timer
    env_notify_timer_ms_ += delta_ms;
    if (env_notify_timer_ms_ >= 5000) {
        env_notify_timer_ms_ = 0;
        broadcast_env();
    }
}

} // namespace aahar
