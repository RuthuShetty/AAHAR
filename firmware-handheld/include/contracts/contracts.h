/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AAHAR — AUTO-GENERATED FROM /contracts — DO NOT EDIT       ║
 * ║  Source: contracts/codegen/gen_cpp.py                       ║
 * ║  To change types, edit the JSON Schema and re-run codegen.  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Generated at: 2026-09-18T15:43:09.592571
 *
 * Dependencies:
 *   - nlohmann/json (included via idf_component_manager or platformio lib)
 *   - C++17 or later
 */

#pragma once
#ifndef AAHAR_CONTRACTS_H
#define AAHAR_CONTRACTS_H

#include <cstdint>
#include <optional>
#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>

namespace aahar::contracts {

using json = nlohmann::json;

// ─── Enumerations ─────────────────────────────────────────────────────────────

/** Standardised feed categories supported by the AAHAR NIR models. */
enum class FeedType : uint8_t {
    MAIZE_SILAGE,
    WHEAT_STRAW,
    COTTONSEED_CAKE,
    MUSTARD_CAKE,
    TMR,
    GREEN_FODDER,
    CONCENTRATE_MIX,
    BERSEEM,
    NAPIER,
    SORGHUM_SILAGE,
    GROUNDNUT_CAKE,
    RICE_STRAW,
    SOYBEAN_MEAL,
    MAIZE_GRAIN,
    OTHER
};

inline const char* to_string(FeedType v) {
    switch (v) {
        case FeedType::MAIZE_SILAGE: return "MAIZE_SILAGE";
        case FeedType::WHEAT_STRAW: return "WHEAT_STRAW";
        case FeedType::COTTONSEED_CAKE: return "COTTONSEED_CAKE";
        case FeedType::MUSTARD_CAKE: return "MUSTARD_CAKE";
        case FeedType::TMR: return "TMR";
        case FeedType::GREEN_FODDER: return "GREEN_FODDER";
        case FeedType::CONCENTRATE_MIX: return "CONCENTRATE_MIX";
        case FeedType::BERSEEM: return "BERSEEM";
        case FeedType::NAPIER: return "NAPIER";
        case FeedType::SORGHUM_SILAGE: return "SORGHUM_SILAGE";
        case FeedType::GROUNDNUT_CAKE: return "GROUNDNUT_CAKE";
        case FeedType::RICE_STRAW: return "RICE_STRAW";
        case FeedType::SOYBEAN_MEAL: return "SOYBEAN_MEAL";
        case FeedType::MAIZE_GRAIN: return "MAIZE_GRAIN";
        case FeedType::OTHER: return "OTHER";
        default: return "UNKNOWN";
    }
}

inline FeedType FeedType_from_string(const std::string& s) {
    if (s == "MAIZE_SILAGE") return FeedType::MAIZE_SILAGE;
    if (s == "WHEAT_STRAW") return FeedType::WHEAT_STRAW;
    if (s == "COTTONSEED_CAKE") return FeedType::COTTONSEED_CAKE;
    if (s == "MUSTARD_CAKE") return FeedType::MUSTARD_CAKE;
    if (s == "TMR") return FeedType::TMR;
    if (s == "GREEN_FODDER") return FeedType::GREEN_FODDER;
    if (s == "CONCENTRATE_MIX") return FeedType::CONCENTRATE_MIX;
    if (s == "BERSEEM") return FeedType::BERSEEM;
    if (s == "NAPIER") return FeedType::NAPIER;
    if (s == "SORGHUM_SILAGE") return FeedType::SORGHUM_SILAGE;
    if (s == "GROUNDNUT_CAKE") return FeedType::GROUNDNUT_CAKE;
    if (s == "RICE_STRAW") return FeedType::RICE_STRAW;
    if (s == "SOYBEAN_MEAL") return FeedType::SOYBEAN_MEAL;
    if (s == "MAIZE_GRAIN") return FeedType::MAIZE_GRAIN;
    if (s == "OTHER") return FeedType::OTHER;
    return FeedType::MAIZE_SILAGE; // default
}

/** Overall quality grade assigned to a tested feed sample. */
enum class FeedGrade : uint8_t {
    A,
    B,
    C,
    REJECT
};

inline const char* to_string(FeedGrade v) {
    switch (v) {
        case FeedGrade::A: return "A";
        case FeedGrade::B: return "B";
        case FeedGrade::C: return "C";
        case FeedGrade::REJECT: return "REJECT";
        default: return "UNKNOWN";
    }
}

inline FeedGrade FeedGrade_from_string(const std::string& s) {
    if (s == "A") return FeedGrade::A;
    if (s == "B") return FeedGrade::B;
    if (s == "C") return FeedGrade::C;
    if (s == "REJECT") return FeedGrade::REJECT;
    return FeedGrade::A; // default
}

/** Lifecycle state of a record's synchronisation with the cloud. */
enum class SyncState : uint8_t {
    pending,
    in_flight,
    synced,
    conflict,
    rejected
};

inline const char* to_string(SyncState v) {
    switch (v) {
        case SyncState::pending: return "pending";
        case SyncState::in_flight: return "in_flight";
        case SyncState::synced: return "synced";
        case SyncState::conflict: return "conflict";
        case SyncState::rejected: return "rejected";
        default: return "UNKNOWN";
    }
}

inline SyncState SyncState_from_string(const std::string& s) {
    if (s == "pending") return SyncState::pending;
    if (s == "in_flight") return SyncState::in_flight;
    if (s == "synced") return SyncState::synced;
    if (s == "conflict") return SyncState::conflict;
    if (s == "rejected") return SyncState::rejected;
    return SyncState::pending; // default
}

/** Real-time status of an active NIR scan on the handheld device. */
enum class ScanStatus : uint8_t {
    idle,
    chamber_open,
    warming_up,
    scanning,
    transferring,
    complete,
    error,
    calibrating
};

inline const char* to_string(ScanStatus v) {
    switch (v) {
        case ScanStatus::idle: return "idle";
        case ScanStatus::chamber_open: return "chamber_open";
        case ScanStatus::warming_up: return "warming_up";
        case ScanStatus::scanning: return "scanning";
        case ScanStatus::transferring: return "transferring";
        case ScanStatus::complete: return "complete";
        case ScanStatus::error: return "error";
        case ScanStatus::calibrating: return "calibrating";
        default: return "UNKNOWN";
    }
}

inline ScanStatus ScanStatus_from_string(const std::string& s) {
    if (s == "idle") return ScanStatus::idle;
    if (s == "chamber_open") return ScanStatus::chamber_open;
    if (s == "warming_up") return ScanStatus::warming_up;
    if (s == "scanning") return ScanStatus::scanning;
    if (s == "transferring") return ScanStatus::transferring;
    if (s == "complete") return ScanStatus::complete;
    if (s == "error") return ScanStatus::error;
    if (s == "calibrating") return ScanStatus::calibrating;
    return ScanStatus::idle; // default
}

/** Detected or screened adulterant types. */
enum class AdulterantType : uint8_t {
    UREA,
    SAND_SILICA,
    MELAMINE,
    NONE
};

inline const char* to_string(AdulterantType v) {
    switch (v) {
        case AdulterantType::UREA: return "UREA";
        case AdulterantType::SAND_SILICA: return "SAND_SILICA";
        case AdulterantType::MELAMINE: return "MELAMINE";
        case AdulterantType::NONE: return "NONE";
        default: return "UNKNOWN";
    }
}

inline AdulterantType AdulterantType_from_string(const std::string& s) {
    if (s == "UREA") return AdulterantType::UREA;
    if (s == "SAND_SILICA") return AdulterantType::SAND_SILICA;
    if (s == "MELAMINE") return AdulterantType::MELAMINE;
    if (s == "NONE") return AdulterantType::NONE;
    return AdulterantType::UREA; // default
}

/** Screening result band for mycotoxin risk. Never a quantitative claim. */
enum class ToxinBand : uint8_t {
    LOW,
    MEDIUM,
    HIGH,
    UNKNOWN
};

inline const char* to_string(ToxinBand v) {
    switch (v) {
        case ToxinBand::LOW: return "LOW";
        case ToxinBand::MEDIUM: return "MEDIUM";
        case ToxinBand::HIGH: return "HIGH";
        case ToxinBand::UNKNOWN: return "UNKNOWN";
        default: return "UNKNOWN";
    }
}

inline ToxinBand ToxinBand_from_string(const std::string& s) {
    if (s == "LOW") return ToxinBand::LOW;
    if (s == "MEDIUM") return ToxinBand::MEDIUM;
    if (s == "HIGH") return ToxinBand::HIGH;
    if (s == "UNKNOWN") return ToxinBand::UNKNOWN;
    return ToxinBand::LOW; // default
}

/** Supported languages for UI, voice, and advisory content. */
enum class Language : uint8_t {
    en,
    hi,
    pa,
    mr,
    gu,
    te,
    kn,
    bn
};

inline const char* to_string(Language v) {
    switch (v) {
        case Language::en: return "en";
        case Language::hi: return "hi";
        case Language::pa: return "pa";
        case Language::mr: return "mr";
        case Language::gu: return "gu";
        case Language::te: return "te";
        case Language::kn: return "kn";
        case Language::bn: return "bn";
        default: return "UNKNOWN";
    }
}

inline Language Language_from_string(const std::string& s) {
    if (s == "en") return Language::en;
    if (s == "hi") return Language::hi;
    if (s == "pa") return Language::pa;
    if (s == "mr") return Language::mr;
    if (s == "gu") return Language::gu;
    if (s == "te") return Language::te;
    if (s == "kn") return Language::kn;
    if (s == "bn") return Language::bn;
    return Language::en; // default
}

/** Hardware SKU determines which parameters are available in the app. */
enum class DeviceSKU : uint8_t {
    AAHAR_PRO,
    AAHAR_LITE
};

inline const char* to_string(DeviceSKU v) {
    switch (v) {
        case DeviceSKU::AAHAR_PRO: return "AAHAR_PRO";
        case DeviceSKU::AAHAR_LITE: return "AAHAR_LITE";
        default: return "UNKNOWN";
    }
}

inline DeviceSKU DeviceSKU_from_string(const std::string& s) {
    if (s == "AAHAR_PRO") return DeviceSKU::AAHAR_PRO;
    if (s == "AAHAR_LITE") return DeviceSKU::AAHAR_LITE;
    return DeviceSKU::AAHAR_PRO; // default
}

/** Connection and operational status of a silage probe node. */
enum class ProbeStatus : uint8_t {
    ONLINE_LORA,
    ONLINE_BLE,
    OFFLINE,
    LOW_BATTERY,
    FAULT,
    CALIBRATING
};

inline const char* to_string(ProbeStatus v) {
    switch (v) {
        case ProbeStatus::ONLINE_LORA: return "ONLINE_LORA";
        case ProbeStatus::ONLINE_BLE: return "ONLINE_BLE";
        case ProbeStatus::OFFLINE: return "OFFLINE";
        case ProbeStatus::LOW_BATTERY: return "LOW_BATTERY";
        case ProbeStatus::FAULT: return "FAULT";
        case ProbeStatus::CALIBRATING: return "CALIBRATING";
        default: return "UNKNOWN";
    }
}

inline ProbeStatus ProbeStatus_from_string(const std::string& s) {
    if (s == "ONLINE_LORA") return ProbeStatus::ONLINE_LORA;
    if (s == "ONLINE_BLE") return ProbeStatus::ONLINE_BLE;
    if (s == "OFFLINE") return ProbeStatus::OFFLINE;
    if (s == "LOW_BATTERY") return ProbeStatus::LOW_BATTERY;
    if (s == "FAULT") return ProbeStatus::FAULT;
    if (s == "CALIBRATING") return ProbeStatus::CALIBRATING;
    return ProbeStatus::ONLINE_LORA; // default
}

/** Silage fermentation phase derived from probe readings. */
enum class FermentationPhase : uint8_t {
    AEROBIC,
    ACTIVE_ANAEROBIC,
    STABLE,
    AEROBIC_SPOILAGE,
    CLOSTRIDIAL
};

inline const char* to_string(FermentationPhase v) {
    switch (v) {
        case FermentationPhase::AEROBIC: return "AEROBIC";
        case FermentationPhase::ACTIVE_ANAEROBIC: return "ACTIVE_ANAEROBIC";
        case FermentationPhase::STABLE: return "STABLE";
        case FermentationPhase::AEROBIC_SPOILAGE: return "AEROBIC_SPOILAGE";
        case FermentationPhase::CLOSTRIDIAL: return "CLOSTRIDIAL";
        default: return "UNKNOWN";
    }
}

inline FermentationPhase FermentationPhase_from_string(const std::string& s) {
    if (s == "AEROBIC") return FermentationPhase::AEROBIC;
    if (s == "ACTIVE_ANAEROBIC") return FermentationPhase::ACTIVE_ANAEROBIC;
    if (s == "STABLE") return FermentationPhase::STABLE;
    if (s == "AEROBIC_SPOILAGE") return FermentationPhase::AEROBIC_SPOILAGE;
    if (s == "CLOSTRIDIAL") return FermentationPhase::CLOSTRIDIAL;
    return FermentationPhase::AEROBIC; // default
}

/** Common dairy cattle breeds in India. Used for nutrition requirement lookup. */
enum class HerdBreed : uint8_t {
    HF,
    JERSEY,
    HF_CROSS,
    JERSEY_CROSS,
    SAHIWAL,
    GIR,
    THARPARKAR,
    MURRAH,
    SURTI,
    NILI_RAVI,
    OTHER
};

inline const char* to_string(HerdBreed v) {
    switch (v) {
        case HerdBreed::HF: return "HF";
        case HerdBreed::JERSEY: return "JERSEY";
        case HerdBreed::HF_CROSS: return "HF_CROSS";
        case HerdBreed::JERSEY_CROSS: return "JERSEY_CROSS";
        case HerdBreed::SAHIWAL: return "SAHIWAL";
        case HerdBreed::GIR: return "GIR";
        case HerdBreed::THARPARKAR: return "THARPARKAR";
        case HerdBreed::MURRAH: return "MURRAH";
        case HerdBreed::SURTI: return "SURTI";
        case HerdBreed::NILI_RAVI: return "NILI_RAVI";
        case HerdBreed::OTHER: return "OTHER";
        default: return "UNKNOWN";
    }
}

inline HerdBreed HerdBreed_from_string(const std::string& s) {
    if (s == "HF") return HerdBreed::HF;
    if (s == "JERSEY") return HerdBreed::JERSEY;
    if (s == "HF_CROSS") return HerdBreed::HF_CROSS;
    if (s == "JERSEY_CROSS") return HerdBreed::JERSEY_CROSS;
    if (s == "SAHIWAL") return HerdBreed::SAHIWAL;
    if (s == "GIR") return HerdBreed::GIR;
    if (s == "THARPARKAR") return HerdBreed::THARPARKAR;
    if (s == "MURRAH") return HerdBreed::MURRAH;
    if (s == "SURTI") return HerdBreed::SURTI;
    if (s == "NILI_RAVI") return HerdBreed::NILI_RAVI;
    if (s == "OTHER") return HerdBreed::OTHER;
    return HerdBreed::HF; // default
}

/** Stage of the lactation cycle. Used for nutritional requirement calculation. */
enum class LactationStage : uint8_t {
    EARLY,
    PEAK,
    MID,
    LATE,
    DRY,
    PREGNANT,
    HEIFER
};

inline const char* to_string(LactationStage v) {
    switch (v) {
        case LactationStage::EARLY: return "EARLY";
        case LactationStage::PEAK: return "PEAK";
        case LactationStage::MID: return "MID";
        case LactationStage::LATE: return "LATE";
        case LactationStage::DRY: return "DRY";
        case LactationStage::PREGNANT: return "PREGNANT";
        case LactationStage::HEIFER: return "HEIFER";
        default: return "UNKNOWN";
    }
}

inline LactationStage LactationStage_from_string(const std::string& s) {
    if (s == "EARLY") return LactationStage::EARLY;
    if (s == "PEAK") return LactationStage::PEAK;
    if (s == "MID") return LactationStage::MID;
    if (s == "LATE") return LactationStage::LATE;
    if (s == "DRY") return LactationStage::DRY;
    if (s == "PREGNANT") return LactationStage::PREGNANT;
    if (s == "HEIFER") return LactationStage::HEIFER;
    return LactationStage::EARLY; // default
}

/** Severity level for push/SMS alerts. */
enum class AlertSeverity : uint8_t {
    INFO,
    CAUTION,
    CRITICAL
};

inline const char* to_string(AlertSeverity v) {
    switch (v) {
        case AlertSeverity::INFO: return "INFO";
        case AlertSeverity::CAUTION: return "CAUTION";
        case AlertSeverity::CRITICAL: return "CRITICAL";
        default: return "UNKNOWN";
    }
}

inline AlertSeverity AlertSeverity_from_string(const std::string& s) {
    if (s == "INFO") return AlertSeverity::INFO;
    if (s == "CAUTION") return AlertSeverity::CAUTION;
    if (s == "CRITICAL") return AlertSeverity::CRITICAL;
    return AlertSeverity::INFO; // default
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

struct LamportClock {
    std::string device;
    uint64_t    counter{0};

    json to_json() const { return {{"device", device}, {"counter", counter}}; }
    static LamportClock from_json(const json& j) {
        return {j["device"].get<std::string>(), j["counter"].get<uint64_t>()};
    }
};

/** Every numeric measurement — always carry CI and confidence. Never transmit bare value. */
struct NumericResult {
    float value{0.0f};
    float ci_low{0.0f};
    float ci_high{0.0f};
    float confidence{0.0f}; // 0–1
    std::string unit;

    json to_json() const {
        return {{"value", value}, {"ci_low", ci_low}, {"ci_high", ci_high},
                {"confidence", confidence}, {"unit", unit}};
    }
    static NumericResult from_json(const json& j) {
        return {j["value"], j["ci_low"], j["ci_high"], j["confidence"], j["unit"]};
    }
};

// ── SyncEnvelope (schema v1) ──
/** Universal record envelope for every syncable entity across all AAHAR surfaces. All mutable and immutable records are wra */
struct SyncEnvelope {
    /** UUIDv7 — time-ordered, generated offline, globally collision-free. Encodes millisecond timestamp in  */
    std::string id{};
    /** Discriminator for the payload type. Determines which schema validates the payload. */
    std::string entity{};
    /** Schema version of the payload. CI fails if the generated code does not match the current version. */
    uint32_t schema_version{};
    /** The farm this record belongs to. Used for row-level security on the server. */
    std::string farm_id{};
    /** Canonical device identifier. P=Pro handheld, L=Lite handheld, S=Silage probe, G=Gateway. e.g. AAHAR- */
    std::string device_id{};
    /** ISO 8601 timestamp from the device clock at moment of capture. May differ from server_received_at wh */
    std::string captured_at{};
    /** Set by the server on first receipt. Null until synced. Never modified after first set. */
    std::optional<std::string> server_received_at{};
    /** Lamport logical clock for causal ordering across offline devices. */
    json clock{};
    /** Local sync lifecycle state. 'pending'=queued for upload, 'in_flight'=upload attempted, 'synced'=serv */
    std::string sync_state{};
    /** Human-readable rejection reason from server. Only set when sync_state='rejected'. */
    std::optional<std::string> sync_reject_reason{};
    /** SHA-256 of the canonical JSON-serialised payload. Used for idempotent upsert and corruption detectio */
    std::string payload_hash{};
    /** The actual entity data. Validated against the entity-specific schema determined by the 'entity' disc */
    json payload{};
    /** Optional free-form tags for filtering and organisation. e.g. ['pilot', 'suspect-batch', 'calibration */
    std::optional<std::vector<std::string>> tags{};

    static SyncEnvelope from_json(const json& j) {
        SyncEnvelope s;
        if (j.contains("id")) s.id = j["id"].get<decltype(s.id)>();
        if (j.contains("entity")) s.entity = j["entity"].get<decltype(s.entity)>();
        if (j.contains("schema_version")) s.schema_version = j["schema_version"].get<decltype(s.schema_version)>();
        if (j.contains("farm_id")) s.farm_id = j["farm_id"].get<decltype(s.farm_id)>();
        if (j.contains("device_id")) s.device_id = j["device_id"].get<decltype(s.device_id)>();
        if (j.contains("captured_at")) s.captured_at = j["captured_at"].get<decltype(s.captured_at)>();
        if (j.contains("server_received_at") && !j["server_received_at"].is_null()) s.server_received_at = j["server_received_at"].get<std::remove_reference_t<decltype(*s.server_received_at)>>();
        if (j.contains("clock")) s.clock = j["clock"].get<decltype(s.clock)>();
        if (j.contains("sync_state")) s.sync_state = j["sync_state"].get<decltype(s.sync_state)>();
        if (j.contains("sync_reject_reason") && !j["sync_reject_reason"].is_null()) s.sync_reject_reason = j["sync_reject_reason"].get<std::remove_reference_t<decltype(*s.sync_reject_reason)>>();
        if (j.contains("payload_hash")) s.payload_hash = j["payload_hash"].get<decltype(s.payload_hash)>();
        if (j.contains("payload")) s.payload = j["payload"].get<decltype(s.payload)>();
        if (j.contains("tags") && !j["tags"].is_null()) s.tags = j["tags"].get<std::remove_reference_t<decltype(*s.tags)>>();
        return s;
    }

    json to_json() const {
        json j;
        j["id"] = id;
        j["entity"] = entity;
        j["schema_version"] = schema_version;
        j["farm_id"] = farm_id;
        j["device_id"] = device_id;
        j["captured_at"] = captured_at;
        if (server_received_at.has_value()) j["server_received_at"] = *server_received_at; else j["server_received_at"] = nullptr;
        j["clock"] = clock;
        j["sync_state"] = sync_state;
        if (sync_reject_reason.has_value()) j["sync_reject_reason"] = *sync_reject_reason; else j["sync_reject_reason"] = nullptr;
        j["payload_hash"] = payload_hash;
        j["payload"] = payload;
        if (tags.has_value()) j["tags"] = *tags; else j["tags"] = nullptr;
        return j;
    }
};

// ── NumericResult ──
/** A numeric measurement with confidence interval. Never display value without ci_low/ci_high. */
struct NumericResult {
    /** Point estimate from the model. */
    float value{};
    /** Lower bound of the 95% confidence interval. */
    float ci_low{};
    /** Upper bound of the 95% confidence interval. */
    float ci_high{};
    /** Model confidence in this prediction. < 0.6 = low confidence. */
    float confidence{};
    /** Unit key from units.json, e.g. 'pct_dm', 'mj_per_kg_dm' */
    std::string unit{};

    static NumericResult from_json(const json& j) {
        NumericResult s;
        if (j.contains("value")) s.value = j["value"].get<decltype(s.value)>();
        if (j.contains("ci_low")) s.ci_low = j["ci_low"].get<decltype(s.ci_low)>();
        if (j.contains("ci_high")) s.ci_high = j["ci_high"].get<decltype(s.ci_high)>();
        if (j.contains("confidence")) s.confidence = j["confidence"].get<decltype(s.confidence)>();
        if (j.contains("unit")) s.unit = j["unit"].get<decltype(s.unit)>();
        return s;
    }

    json to_json() const {
        json j;
        j["value"] = value;
        j["ci_low"] = ci_low;
        j["ci_high"] = ci_high;
        j["confidence"] = confidence;
        j["unit"] = unit;
        return j;
    }
};

// ── MeasurementPayload (schema v3) ──
/** Immutable record of a single feed quality test. Contains all 15 parameters from Table 4.1, confidence intervals, and der */
struct MeasurementPayload {
    /** FeedType enum key. Determines which sub-model was active during inference. */
    std::string feed_type{};
    /** DeviceSKU enum key. Determines which parameters are populated vs null. */
    std::string device_sku{};
    /** Wall-clock time from scan start to spectrum transfer complete, in milliseconds. */
    uint32_t scan_duration_ms{};
    /** Total on-device ML inference time across all models, in milliseconds. */
    std::optional<uint32_t> inference_duration_ms{};
    /** Ambient conditions from BME688 at time of scan. Used for spectral compensation. */
    std::optional<json> environment{};
    /** Proximate analysis results. All values on dry-matter basis unless noted. */
    json proximates{};
    /** Food safety and adulteration screening results. */
    json safety{};
    /** Derived outputs computed from proximate + safety results. */
    json derived{};
    /** The herd record used for ration balancing at time of test. Null if no herd profile set up. */
    std::optional<std::string> herd_context_id{};
    /** UUIDv7 of the advisory record generated from this measurement. */
    std::optional<std::string> advisory_id{};
    /** Optional: price the farmer paid. Enables value-for-money calculation. */
    std::optional<float> price_paid_inr_per_kg{};
    /** UUIDv7 of the raw spectrum record stored separately (large payload). */
    std::optional<std::string> spectrum_id{};
    /** UUIDv7s of the 4-angle macro photo records stored separately. */
    std::optional<std::vector<std::string>> macro_image_ids{};
    /** Ensemble confidence across all active models. < 0.6 triggers 'low confidence' UI warning. */
    float confidence_overall{};
    /** False if Mahalanobis distance of the spectrum from training manifold exceeds threshold. If false, UI */
    bool in_distribution{};
    /** Version string of each model bundle active during inference. For audit and retraining queue. */
    std::optional<std::unordered_map<std::string, std::string>> model_versions{};
    /** Keyed by Language enum. Pre-rendered advisory text stored with the record for offline display. */
    std::optional<std::unordered_map<std::string, std::string>> local_advisory_text{};
    /** If this test was triggered by scanning a QR batch, the batch UUID. Enables declared-vs-measured diff */
    std::optional<std::string> qr_batch_id{};

    static MeasurementPayload from_json(const json& j) {
        MeasurementPayload s;
        if (j.contains("feed_type")) s.feed_type = j["feed_type"].get<decltype(s.feed_type)>();
        if (j.contains("device_sku")) s.device_sku = j["device_sku"].get<decltype(s.device_sku)>();
        if (j.contains("scan_duration_ms")) s.scan_duration_ms = j["scan_duration_ms"].get<decltype(s.scan_duration_ms)>();
        if (j.contains("inference_duration_ms") && !j["inference_duration_ms"].is_null()) s.inference_duration_ms = j["inference_duration_ms"].get<std::remove_reference_t<decltype(*s.inference_duration_ms)>>();
        if (j.contains("environment") && !j["environment"].is_null()) s.environment = j["environment"].get<std::remove_reference_t<decltype(*s.environment)>>();
        if (j.contains("proximates")) s.proximates = j["proximates"].get<decltype(s.proximates)>();
        if (j.contains("safety")) s.safety = j["safety"].get<decltype(s.safety)>();
        if (j.contains("derived")) s.derived = j["derived"].get<decltype(s.derived)>();
        if (j.contains("herd_context_id") && !j["herd_context_id"].is_null()) s.herd_context_id = j["herd_context_id"].get<std::remove_reference_t<decltype(*s.herd_context_id)>>();
        if (j.contains("advisory_id") && !j["advisory_id"].is_null()) s.advisory_id = j["advisory_id"].get<std::remove_reference_t<decltype(*s.advisory_id)>>();
        if (j.contains("price_paid_inr_per_kg") && !j["price_paid_inr_per_kg"].is_null()) s.price_paid_inr_per_kg = j["price_paid_inr_per_kg"].get<std::remove_reference_t<decltype(*s.price_paid_inr_per_kg)>>();
        if (j.contains("spectrum_id") && !j["spectrum_id"].is_null()) s.spectrum_id = j["spectrum_id"].get<std::remove_reference_t<decltype(*s.spectrum_id)>>();
        if (j.contains("macro_image_ids") && !j["macro_image_ids"].is_null()) s.macro_image_ids = j["macro_image_ids"].get<std::remove_reference_t<decltype(*s.macro_image_ids)>>();
        if (j.contains("confidence_overall")) s.confidence_overall = j["confidence_overall"].get<decltype(s.confidence_overall)>();
        if (j.contains("in_distribution")) s.in_distribution = j["in_distribution"].get<decltype(s.in_distribution)>();
        if (j.contains("model_versions") && !j["model_versions"].is_null()) s.model_versions = j["model_versions"].get<std::remove_reference_t<decltype(*s.model_versions)>>();
        if (j.contains("local_advisory_text") && !j["local_advisory_text"].is_null()) s.local_advisory_text = j["local_advisory_text"].get<std::remove_reference_t<decltype(*s.local_advisory_text)>>();
        if (j.contains("qr_batch_id") && !j["qr_batch_id"].is_null()) s.qr_batch_id = j["qr_batch_id"].get<std::remove_reference_t<decltype(*s.qr_batch_id)>>();
        return s;
    }

    json to_json() const {
        json j;
        j["feed_type"] = feed_type;
        j["device_sku"] = device_sku;
        j["scan_duration_ms"] = scan_duration_ms;
        if (inference_duration_ms.has_value()) j["inference_duration_ms"] = *inference_duration_ms; else j["inference_duration_ms"] = nullptr;
        if (environment.has_value()) j["environment"] = *environment; else j["environment"] = nullptr;
        j["proximates"] = proximates;
        j["safety"] = safety;
        j["derived"] = derived;
        if (herd_context_id.has_value()) j["herd_context_id"] = *herd_context_id; else j["herd_context_id"] = nullptr;
        if (advisory_id.has_value()) j["advisory_id"] = *advisory_id; else j["advisory_id"] = nullptr;
        if (price_paid_inr_per_kg.has_value()) j["price_paid_inr_per_kg"] = *price_paid_inr_per_kg; else j["price_paid_inr_per_kg"] = nullptr;
        if (spectrum_id.has_value()) j["spectrum_id"] = *spectrum_id; else j["spectrum_id"] = nullptr;
        if (macro_image_ids.has_value()) j["macro_image_ids"] = *macro_image_ids; else j["macro_image_ids"] = nullptr;
        j["confidence_overall"] = confidence_overall;
        j["in_distribution"] = in_distribution;
        if (model_versions.has_value()) j["model_versions"] = *model_versions; else j["model_versions"] = nullptr;
        if (local_advisory_text.has_value()) j["local_advisory_text"] = *local_advisory_text; else j["local_advisory_text"] = nullptr;
        if (qr_batch_id.has_value()) j["qr_batch_id"] = *qr_batch_id; else j["qr_batch_id"] = nullptr;
        return j;
    }
};

// ── SpectrumPayload (schema v2) ──
/** Raw NIR spectrum payload. Immutable, large — stored separately from measurement. 228 bands × 3 repeats. Wi-Fi only sync  */
struct SpectrumPayload {
    /** UUIDv7 of the parent measurement record. */
    std::string measurement_id{};
    /** DeviceSKU enum key. */
    std::string device_sku{};
    /** Physical sensor model. Determines wavelength grid and calibration polynomial. */
    std::string sensor_model{};
    /** Wavelength axis in nanometres. Length determines number of bands. Hamamatsu: 228 bands 340–850nm. AS */
    std::vector<float> wavelengths_nm{};
    /** Outer array = repeats (3 for production scan). Inner array = counts per wavelength band. */
    std::vector<std::vector<uint16_t>> intensities_raw{};
    /** Corrected reflectance: (raw - dark) / (white - dark). Same shape as intensities_raw. */
    std::vector<std::vector<float>> intensities_corrected{};
    /** Dark reference counts captured with shutter closed. Same length as wavelengths_nm. */
    std::vector<uint16_t> dark_reference{};
    /** White reference counts from Spectralon tile. Captured at scan start. Same length as wavelengths_nm. */
    std::vector<uint16_t> white_reference{};
    /** Number of spectral sweeps in this capture. Production: 3. */
    uint8_t repeats{};
    /** Sensor integration time in microseconds. Auto-selected to avoid saturation. */
    std::optional<uint32_t> integration_time_us{};
    /** Sensor gain setting. Sensor-dependent. */
    std::optional<float> gain{};
    /** Estimated signal-to-noise ratio in dB. Computed from repeat variance. < 20 dB triggers a retake prom */
    std::optional<float> snr_db{};
    /** Indices of any saturated bands (count at max ADC). Should be empty for a good scan. */
    std::optional<std::vector<uint32_t>> saturation_bands{};
    /** Whether temperature drift correction was applied using BME688 reading. */
    std::optional<bool> temperature_compensation_applied{};
    /** ID of the calibration file that was active when this spectrum was captured. */
    std::optional<std::string> calibration_id{};
    /** BLE transfer quality metrics. */
    std::optional<json> transfer_stats{};
    /** Ordered list of preprocessing steps applied before inference. e.g. ['snv', 'savitzky_golay_11_2'] */
    std::optional<std::vector<std::string>> preprocessing_applied{};

    static SpectrumPayload from_json(const json& j) {
        SpectrumPayload s;
        if (j.contains("measurement_id")) s.measurement_id = j["measurement_id"].get<decltype(s.measurement_id)>();
        if (j.contains("device_sku")) s.device_sku = j["device_sku"].get<decltype(s.device_sku)>();
        if (j.contains("sensor_model")) s.sensor_model = j["sensor_model"].get<decltype(s.sensor_model)>();
        if (j.contains("wavelengths_nm")) s.wavelengths_nm = j["wavelengths_nm"].get<decltype(s.wavelengths_nm)>();
        if (j.contains("intensities_raw")) s.intensities_raw = j["intensities_raw"].get<decltype(s.intensities_raw)>();
        if (j.contains("intensities_corrected")) s.intensities_corrected = j["intensities_corrected"].get<decltype(s.intensities_corrected)>();
        if (j.contains("dark_reference")) s.dark_reference = j["dark_reference"].get<decltype(s.dark_reference)>();
        if (j.contains("white_reference")) s.white_reference = j["white_reference"].get<decltype(s.white_reference)>();
        if (j.contains("repeats")) s.repeats = j["repeats"].get<decltype(s.repeats)>();
        if (j.contains("integration_time_us") && !j["integration_time_us"].is_null()) s.integration_time_us = j["integration_time_us"].get<std::remove_reference_t<decltype(*s.integration_time_us)>>();
        if (j.contains("gain") && !j["gain"].is_null()) s.gain = j["gain"].get<std::remove_reference_t<decltype(*s.gain)>>();
        if (j.contains("snr_db") && !j["snr_db"].is_null()) s.snr_db = j["snr_db"].get<std::remove_reference_t<decltype(*s.snr_db)>>();
        if (j.contains("saturation_bands") && !j["saturation_bands"].is_null()) s.saturation_bands = j["saturation_bands"].get<std::remove_reference_t<decltype(*s.saturation_bands)>>();
        if (j.contains("temperature_compensation_applied") && !j["temperature_compensation_applied"].is_null()) s.temperature_compensation_applied = j["temperature_compensation_applied"].get<std::remove_reference_t<decltype(*s.temperature_compensation_applied)>>();
        if (j.contains("calibration_id") && !j["calibration_id"].is_null()) s.calibration_id = j["calibration_id"].get<std::remove_reference_t<decltype(*s.calibration_id)>>();
        if (j.contains("transfer_stats") && !j["transfer_stats"].is_null()) s.transfer_stats = j["transfer_stats"].get<std::remove_reference_t<decltype(*s.transfer_stats)>>();
        if (j.contains("preprocessing_applied") && !j["preprocessing_applied"].is_null()) s.preprocessing_applied = j["preprocessing_applied"].get<std::remove_reference_t<decltype(*s.preprocessing_applied)>>();
        return s;
    }

    json to_json() const {
        json j;
        j["measurement_id"] = measurement_id;
        j["device_sku"] = device_sku;
        j["sensor_model"] = sensor_model;
        j["wavelengths_nm"] = wavelengths_nm;
        j["intensities_raw"] = intensities_raw;
        j["intensities_corrected"] = intensities_corrected;
        j["dark_reference"] = dark_reference;
        j["white_reference"] = white_reference;
        j["repeats"] = repeats;
        if (integration_time_us.has_value()) j["integration_time_us"] = *integration_time_us; else j["integration_time_us"] = nullptr;
        if (gain.has_value()) j["gain"] = *gain; else j["gain"] = nullptr;
        if (snr_db.has_value()) j["snr_db"] = *snr_db; else j["snr_db"] = nullptr;
        if (saturation_bands.has_value()) j["saturation_bands"] = *saturation_bands; else j["saturation_bands"] = nullptr;
        if (temperature_compensation_applied.has_value()) j["temperature_compensation_applied"] = *temperature_compensation_applied; else j["temperature_compensation_applied"] = nullptr;
        if (calibration_id.has_value()) j["calibration_id"] = *calibration_id; else j["calibration_id"] = nullptr;
        if (transfer_stats.has_value()) j["transfer_stats"] = *transfer_stats; else j["transfer_stats"] = nullptr;
        if (preprocessing_applied.has_value()) j["preprocessing_applied"] = *preprocessing_applied; else j["preprocessing_applied"] = nullptr;
        return j;
    }
};

// ── ProbeReadingPayload (schema v2) ──
/** Immutable time-series reading from a silage probe node. Append-only. 9 parameters from Table 4.2. Ingested via MQTT or B */
struct ProbeReadingPayload {
    std::string bunker_id{};
    std::string probe_device_id{};
    /** Monotonically increasing sequence number per probe. Used to detect gaps. */
    std::optional<uint32_t> reading_sequence{};
    /** ISFET pH probe reading. Range 3.0–7.5, accuracy ±0.1. */
    json ph{};
    /** Temperature readings from DS18B20 array at 4 depths. Index 0=surface, 3=deepest. */
    std::vector<json> temperatures_c{};
    json moisture_pct{};
    /** NDIR CO₂ reading. MH-Z19C. Range 0–10000 ppm, accuracy ±50 ppm. */
    json co2_ppm{};
    /** Electrochemical O₂ sensor. Range 0–25%, accuracy ±0.2%. */
    json o2_pct{};
    /** BME688 MOS array VOC / gas index readings. Relative, indexed. */
    std::optional<json> voc{};
    /** Composite score derived from pH trajectory, temp delta, CO₂, VOC. 80–100=excellent, 60–79=good, 40–5 */
    float fermentation_quality_index{};
    /** Derived mould growth probability. AUC ≥ 0.86. Null until forecast model has enough history (min 24 h */
    std::optional<float> mould_probability{};
    /** Estimated aerobic spoilage front position in metres from the feed-out face. Null if face not yet ope */
    std::optional<float> spoilage_front_m{};
    /** Active alert conditions at time of reading. Each triggers push/SMS if AlertSeverity=CRITICAL. */
    std::optional<std::vector<std::string>> alert_flags{};
    std::optional<uint8_t> battery_pct{};
    std::optional<bool> solar_charging{};
    /** Radio link quality. */
    std::optional<json> signal{};

    static ProbeReadingPayload from_json(const json& j) {
        ProbeReadingPayload s;
        if (j.contains("bunker_id")) s.bunker_id = j["bunker_id"].get<decltype(s.bunker_id)>();
        if (j.contains("probe_device_id")) s.probe_device_id = j["probe_device_id"].get<decltype(s.probe_device_id)>();
        if (j.contains("reading_sequence") && !j["reading_sequence"].is_null()) s.reading_sequence = j["reading_sequence"].get<std::remove_reference_t<decltype(*s.reading_sequence)>>();
        if (j.contains("ph")) s.ph = j["ph"].get<decltype(s.ph)>();
        if (j.contains("temperatures_c")) s.temperatures_c = j["temperatures_c"].get<decltype(s.temperatures_c)>();
        if (j.contains("moisture_pct")) s.moisture_pct = j["moisture_pct"].get<decltype(s.moisture_pct)>();
        if (j.contains("co2_ppm")) s.co2_ppm = j["co2_ppm"].get<decltype(s.co2_ppm)>();
        if (j.contains("o2_pct")) s.o2_pct = j["o2_pct"].get<decltype(s.o2_pct)>();
        if (j.contains("voc") && !j["voc"].is_null()) s.voc = j["voc"].get<std::remove_reference_t<decltype(*s.voc)>>();
        if (j.contains("fermentation_quality_index")) s.fermentation_quality_index = j["fermentation_quality_index"].get<decltype(s.fermentation_quality_index)>();
        if (j.contains("mould_probability") && !j["mould_probability"].is_null()) s.mould_probability = j["mould_probability"].get<std::remove_reference_t<decltype(*s.mould_probability)>>();
        if (j.contains("spoilage_front_m") && !j["spoilage_front_m"].is_null()) s.spoilage_front_m = j["spoilage_front_m"].get<std::remove_reference_t<decltype(*s.spoilage_front_m)>>();
        if (j.contains("alert_flags") && !j["alert_flags"].is_null()) s.alert_flags = j["alert_flags"].get<std::remove_reference_t<decltype(*s.alert_flags)>>();
        if (j.contains("battery_pct") && !j["battery_pct"].is_null()) s.battery_pct = j["battery_pct"].get<std::remove_reference_t<decltype(*s.battery_pct)>>();
        if (j.contains("solar_charging") && !j["solar_charging"].is_null()) s.solar_charging = j["solar_charging"].get<std::remove_reference_t<decltype(*s.solar_charging)>>();
        if (j.contains("signal") && !j["signal"].is_null()) s.signal = j["signal"].get<std::remove_reference_t<decltype(*s.signal)>>();
        return s;
    }

    json to_json() const {
        json j;
        j["bunker_id"] = bunker_id;
        j["probe_device_id"] = probe_device_id;
        if (reading_sequence.has_value()) j["reading_sequence"] = *reading_sequence; else j["reading_sequence"] = nullptr;
        j["ph"] = ph;
        j["temperatures_c"] = temperatures_c;
        j["moisture_pct"] = moisture_pct;
        j["co2_ppm"] = co2_ppm;
        j["o2_pct"] = o2_pct;
        if (voc.has_value()) j["voc"] = *voc; else j["voc"] = nullptr;
        j["fermentation_quality_index"] = fermentation_quality_index;
        if (mould_probability.has_value()) j["mould_probability"] = *mould_probability; else j["mould_probability"] = nullptr;
        if (spoilage_front_m.has_value()) j["spoilage_front_m"] = *spoilage_front_m; else j["spoilage_front_m"] = nullptr;
        if (alert_flags.has_value()) j["alert_flags"] = *alert_flags; else j["alert_flags"] = nullptr;
        if (battery_pct.has_value()) j["battery_pct"] = *battery_pct; else j["battery_pct"] = nullptr;
        if (solar_charging.has_value()) j["solar_charging"] = *solar_charging; else j["solar_charging"] = nullptr;
        if (signal.has_value()) j["signal"] = *signal; else j["signal"] = nullptr;
        return j;
    }
};


}} // namespace aahar::contracts

#endif // AAHAR_CONTRACTS_H
