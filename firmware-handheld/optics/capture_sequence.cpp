#include "capture_sequence.h"

#ifdef ESP_PLATFORM
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
static const char* TAG = "CAPTURE_SEQUENCE";
#endif

namespace aahar::optics {

CaptureSequenceCoordinator::CaptureSequenceCoordinator(
    drivers::ChamberSensor& chamber,
    drivers::IlluminationController& illumination,
    drivers::BatteryManager& battery,
    drivers::LedRingController& led_ring,
    drivers::Buzzer& buzzer,
    drivers::Bme688Sensor& env_sensor,
    drivers::MacroCamera& camera,
    ISpectralSensor& spectral_sensor,
    SpectralCalibrator& calibrator
) : chamber_(chamber), illumination_(illumination), battery_(battery),
    led_ring_(led_ring), buzzer_(buzzer), env_sensor_(env_sensor),
    camera_(camera), spectral_sensor_(spectral_sensor), calibrator_(calibrator) {

    // Wire chamber interlock directly to abort handler
    chamber_.register_open_callback([this]() {
        if (scanning_) {
            abort();
        }
    });
}

CaptureSequenceCoordinator::~CaptureSequenceCoordinator() {
    abort();
}

void CaptureSequenceCoordinator::abort() {
    abort_requested_ = true;
    illumination_.emergency_cutoff();
    led_ring_.set_color(drivers::RgbColor::Red(), drivers::LedRingMode::SOLID);
    buzzer_.play_effect(drivers::SoundEffect::ERROR_ALERT);
}

ScanResult CaptureSequenceCoordinator::execute_scan(ProgressCallback progress_cb) {
    ScanResult result;
    result.wavelengths = SpectralCalibrator::get_standard_wavelengths();
    abort_requested_ = false;
    scanning_ = true;

    // 1. Pre-flight checks
    if (!chamber_.is_closed()) {
        scanning_ = false;
        result.status = errors::ERR_CHAMBER_OPEN;
        led_ring_.set_color(drivers::RgbColor::Red());
        buzzer_.play_effect(drivers::SoundEffect::ERROR_ALERT);
        return result;
    }

    if (!battery_.can_start_scan()) {
        scanning_ = false;
        result.status = errors::ERR_BATTERY_LOW;
        led_ring_.set_color(drivers::RgbColor::Amber());
        buzzer_.play_effect(drivers::SoundEffect::ERROR_ALERT);
        return result;
    }

    // Visual & auditory scan begin notification
    led_ring_.set_color(drivers::RgbColor::Blue(), drivers::LedRingMode::BREATHING);
    buzzer_.play_effect(drivers::SoundEffect::SCAN_START);

    // 2. Lamp warm-up (3.5s soft-start ramp)
    if (progress_cb) progress_cb(5, 3.5f);
    if (!illumination_.start_halogen_ramp(config::LAMP_WARMUP_TIME_MS)) {
        scanning_ = false;
        result.status = errors::ERR_LAMP_FAILURE;
        abort();
        return result;
    }

    if (abort_requested_) {
        scanning_ = false;
        result.status = errors::ERR_CHAMBER_OPEN;
        return result;
    }

    // 3. Perform 3 repeat sweeps
    std::vector<float> raw_intensities;
    std::vector<float> raw_wavelengths;

    for (uint8_t rep = 0; rep < config::NUM_SCAN_REPEATS; ++rep) {
        if (abort_requested_) {
            scanning_ = false;
            result.status = errors::ERR_CHAMBER_OPEN;
            return result;
        }

        uint8_t progress = 10 + rep * 25; // 10%, 35%, 60%
        if (progress_cb) progress_cb(progress, static_cast<float>(rep * 25));

        bool ok = spectral_sensor_.capture_raw(raw_intensities, raw_wavelengths);
        if (!ok) {
            scanning_ = false;
            result.status = errors::ERR_SENSOR_TIMEOUT;
            abort();
            return result;
        }

        std::array<float, config::NUM_SPECTRAL_BANDS> rep_spectrum{};
        errors::ErrorCode err = calibrator_.process_spectrum(raw_intensities, raw_wavelengths, rep_spectrum);
        if (err != errors::ERR_NONE) {
            scanning_ = false;
            result.status = err;
            abort();
            return result;
        }

        result.repeats[rep] = rep_spectrum;
    }

    // Compute mean across repeats
    for (size_t b = 0; b < config::NUM_SPECTRAL_BANDS; ++b) {
        float sum = 0.0f;
        for (uint8_t rep = 0; rep < config::NUM_SCAN_REPEATS; ++rep) {
            sum += result.repeats[rep][b];
        }
        result.mean_intensities[b] = sum / config::NUM_SCAN_REPEATS;
    }

    // 4. UV Fluorescence Pass (365nm excitation for Aflatoxin B1)
    if (progress_cb) progress_cb(75, 70.0f);
    illumination_.set_mode(drivers::LightSourceMode::UV_FLUORESCENCE);
    
    // Capture fluorescence emission
    spectral_sensor_.capture_raw(raw_intensities, raw_wavelengths);
    float fluor_sum = 0.0f;
    for (float v : raw_intensities) fluor_sum += v;
    result.uv_fluorescence_intensity = raw_intensities.empty() ? 0.0f : (fluor_sum / raw_intensities.size());

    // 5. Environmental sampling
    if (progress_cb) progress_cb(85, 80.0f);
    env_sensor_.trigger_measurement();
    result.env_data = env_sensor_.read();

    // 6. Macro photo burst (4 angles)
    if (progress_cb) progress_cb(92, 85.0f);
    camera_.capture_quad_burst(nullptr);

    // 7. Cool down & shutdown illumination
    illumination_.emergency_cutoff();

    if (progress_cb) progress_cb(100, 90.0f);
    result.status = errors::ERR_NONE;
    result.duration_ms = 90000;

    scanning_ = false;
    led_ring_.set_color(drivers::RgbColor::Green(), drivers::LedRingMode::SOLID);
    buzzer_.play_effect(drivers::SoundEffect::SCAN_COMPLETE);

    return result;
}

} // namespace aahar::optics
