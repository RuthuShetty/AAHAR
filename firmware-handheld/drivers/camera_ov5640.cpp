#include "camera_ov5640.h"
#include "sensor_guard.h"

#ifdef ESP_PLATFORM
#include "esp_camera.h"
#include "esp_log.h"
static const char* TAG = "OV5640_CAM";
#endif

namespace aahar::drivers {

MacroCamera::MacroCamera() {
    // Standard minimal valid JPEG header stub (SOI, DQT, SOF0, SOS, EOI)
    dummy_jpeg_ = {
        0xFF, 0xD8, // SOI
        0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
        0xFF, 0xDB, 0x00, 0x43, 0x00,
        // Quantization table 64 bytes
        16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55,
        14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
        18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92,
        49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
        0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x02, 0x00, 0x02, 0x00, 0x01, 0x01, 0x11, 0x00, // SOF0 (512x512)
        0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, // SOS
        0x00, 0x00, 0x00, 0x00,
        0xFF, 0xD9  // EOI
    };
}

MacroCamera::~MacroCamera() = default;

bool MacroCamera::init() {
#ifdef ESP_PLATFORM
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0       = config::PIN_CAM_Y2;
    config.pin_d1       = config::PIN_CAM_Y3;
    config.pin_d2       = config::PIN_CAM_Y4;
    config.pin_d3       = config::PIN_CAM_Y5;
    config.pin_d4       = config::PIN_CAM_Y6;
    config.pin_d5       = config::PIN_CAM_Y7;
    config.pin_d6       = config::PIN_CAM_Y8;
    config.pin_d7       = config::PIN_CAM_Y9;
    config.pin_xclk     = config::PIN_CAM_XCLK;
    config.pin_pclk     = config::PIN_CAM_PCLK;
    config.pin_vsync    = config::PIN_CAM_VSYNC;
    config.pin_href     = config::PIN_CAM_HREF;
    config.pin_sccb_sda = config::PIN_CAM_SIOD;
    config.pin_sccb_scl = config::PIN_CAM_SIOC;
    config.pin_pwdn     = config::PIN_CAM_PWDN;
    config.pin_reset    = config::PIN_CAM_RESET;
    config.xclk_freq_hz = 20000000; // 20 MHz
    config.pixel_format = PIXFORMAT_JPEG;
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 12; // High quality
    config.fb_count     = 2;
    config.fb_location  = CAMERA_FB_IN_PSRAM;
    config.grab_mode    = CAMERA_GRAB_LATEST;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "OV5640 init failed (0x%x) - camera NOT_PRESENT, no frames will be produced", err);
        is_simulated_ = true;
        return true;
    }
    ESP_LOGI(TAG, "OV5640 macro camera initialized successfully");
#else
    is_simulated_ = true;
#endif
    initialized_ = true;
    return true;
}

bool MacroCamera::capture_quad_burst(FrameCallback on_frame_ready) {
    if (!initialized_) return false;

    for (uint8_t i = 0; i < 4; ++i) {
        CameraFrame frame;
        frame.frame_index = i;
        frame.width = 512;
        frame.height = 512;

#ifdef ESP_PLATFORM
        if (!is_simulated_) {
            camera_fb_t* fb = esp_camera_fb_get();
            if (!fb) {
                ESP_LOGE(TAG, "Failed to capture frame %d", i);
                return false;
            }
            frame.length_bytes = fb->len;
            frame.jpeg_data = fb->buf;
            if (on_frame_ready) {
                on_frame_ready(frame);
            }
            esp_camera_fb_return(fb);
            continue;
        }
#endif
#if AAHAR_SIMULATION_ALLOWED
        frame.length_bytes = dummy_jpeg_.size();
        frame.jpeg_data = dummy_jpeg_.data();
#else
        // Was: returned a canned 1x1 JPEG that the mould/foreign-matter vision
        // path consumed as a real macro image of the sample.
        frame.length_bytes = 0;
        frame.jpeg_data = nullptr;
        return false;
#endif
        if (on_frame_ready) {
            on_frame_ready(frame);
        }
    }
    return true;
}

} // namespace aahar::drivers
