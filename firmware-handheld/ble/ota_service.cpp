#include "ota_service.h"
#include <algorithm>

#ifdef ESP_PLATFORM
#include "esp_ota_ops.h"
#include "esp_partition.h"
#include "esp_log.h"
#include "esp_system.h"
#include "mbedtls/sha256.h"
static const char* TAG = "OTA_SERVICE";
static esp_ota_handle_t ota_handle = 0;
static const esp_partition_t* update_partition = nullptr;
static mbedtls_sha256_context sha_ctx;
#endif

namespace aahar::ble {

OtaService::OtaService() = default;
OtaService::~OtaService() {
    abort();
}

void OtaService::reset() {
    state_ = OtaState::IDLE;
    total_size_ = 0;
    bytes_written_ = 0;
    expected_hash_.clear();
}

bool OtaService::begin(size_t image_size, const std::string& expected_sha256) {
    reset();
    total_size_ = image_size;
    expected_hash_ = expected_sha256;

#ifdef ESP_PLATFORM
    update_partition = esp_ota_get_next_update_partition(nullptr);
    if (!update_partition) {
        ESP_LOGE(TAG, "No valid OTA partition found for upgrade");
        state_ = OtaState::ERROR;
        return false;
    }

    esp_err_t err = esp_ota_begin(update_partition, image_size, &ota_handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "esp_ota_begin failed: 0x%x", err);
        state_ = OtaState::ERROR;
        return false;
    }

    mbedtls_sha256_init(&sha_ctx);
    mbedtls_sha256_starts(&sha_ctx, 0); // 0 = SHA-256
    ESP_LOGI(TAG, "OTA started on partition %s (Size: %u bytes)", update_partition->label, (unsigned)image_size);
#else
    is_simulated_ = true;
#endif

    state_ = OtaState::IN_PROGRESS;
    return true;
}

errors::ErrorCode OtaService::write_chunk(const uint8_t* data, size_t len) {
    if (state_ != OtaState::IN_PROGRESS || !data || len == 0) {
        return errors::ERR_OTA_VERIFICATION_FAILED;
    }

#ifdef ESP_PLATFORM
    if (!is_simulated_) {
        esp_err_t err = esp_ota_write(ota_handle, data, len);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "esp_ota_write chunk failed: 0x%x", err);
            state_ = OtaState::ERROR;
            return errors::ERR_STORAGE_CORRUPT;
        }
        mbedtls_sha256_update(&sha_ctx, data, len);
    }
#endif

    bytes_written_ += len;
    return errors::ERR_NONE;
}

errors::ErrorCode OtaService::finalize_and_reboot() {
    if (state_ != OtaState::IN_PROGRESS) {
        return errors::ERR_OTA_VERIFICATION_FAILED;
    }

    state_ = OtaState::VERIFYING;

#ifdef ESP_PLATFORM
    if (!is_simulated_) {
        uint8_t hash_output[32];
        mbedtls_sha256_finish(&sha_ctx, hash_output);
        mbedtls_sha256_free(&sha_ctx);

        esp_err_t err = esp_ota_end(ota_handle);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "esp_ota_end validation failed: 0x%x", err);
            state_ = OtaState::ERROR;
            return errors::ERR_OTA_VERIFICATION_FAILED;
        }

        err = esp_ota_set_boot_partition(update_partition);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "esp_ota_set_boot_partition failed: 0x%x", err);
            state_ = OtaState::ERROR;
            return errors::ERR_STORAGE_CORRUPT;
        }

        ESP_LOGI(TAG, "OTA upgrade successful. Rebooting into new firmware...");
        state_ = OtaState::COMPLETE;
        esp_restart();
    }
#endif

    state_ = OtaState::COMPLETE;
    return errors::ERR_NONE;
}

void OtaService::abort() {
#ifdef ESP_PLATFORM
    if (state_ == OtaState::IN_PROGRESS && ota_handle != 0) {
        esp_ota_abort(ota_handle);
        mbedtls_sha256_free(&sha_ctx);
        ota_handle = 0;
    }
#endif
    reset();
}

float OtaService::get_progress_pct() const {
    if (total_size_ == 0) return 0.0f;
    return std::clamp((static_cast<float>(bytes_written_) / total_size_) * 100.0f, 0.0f, 100.0f);
}

} // namespace aahar::ble
