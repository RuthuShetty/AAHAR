/**
 * AAHAR Handheld — OV5640 5MP Macro Camera Driver
 * Captures 4-angle macro photo burst with diffuser ring lighting.
 */

#pragma once
#ifndef AAHAR_CAMERA_OV5640_H
#define AAHAR_CAMERA_OV5640_H

#include <cstdint>
#include <vector>
#include <functional>
#include "aahar_config.h"

namespace aahar::drivers {

struct CameraFrame {
    uint8_t frame_index = 0; // 0, 1, 2, 3
    uint16_t width      = 512;
    uint16_t height     = 512;
    size_t length_bytes = 0;
    const uint8_t* jpeg_data = nullptr;
};

class MacroCamera {
public:
    using FrameCallback = std::function<void(const CameraFrame&)>;

    MacroCamera();
    ~MacroCamera();

    bool init();
    bool capture_quad_burst(FrameCallback on_frame_ready);

private:
    bool initialized_ = false;
    bool is_simulated_ = false;
    std::vector<uint8_t> dummy_jpeg_;
};

} // namespace aahar::drivers

#endif // AAHAR_CAMERA_OV5640_H
