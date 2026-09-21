"""
╔══════════════════════════════════════════════════════════════╗
║  AAHAR — AUTO-GENERATED FROM /contracts — DO NOT EDIT       ║
║  Source: contracts/codegen/gen_py.py                        ║
║  To change models, edit the JSON Schema and re-run codegen. ║
╚══════════════════════════════════════════════════════════════╝

Generated at: 2026-09-18T15:51:03.017793
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

# ─── Enumerations ────────────────────────────────────────────────────────────

class FeedType(str, Enum):
    """Standardised feed categories supported by the AAHAR NIR models."""
    MAIZE_SILAGE = "MAIZE_SILAGE"
    WHEAT_STRAW = "WHEAT_STRAW"
    COTTONSEED_CAKE = "COTTONSEED_CAKE"
    MUSTARD_CAKE = "MUSTARD_CAKE"
    TMR = "TMR"
    GREEN_FODDER = "GREEN_FODDER"
    CONCENTRATE_MIX = "CONCENTRATE_MIX"
    BERSEEM = "BERSEEM"
    NAPIER = "NAPIER"
    SORGHUM_SILAGE = "SORGHUM_SILAGE"
    GROUNDNUT_CAKE = "GROUNDNUT_CAKE"
    RICE_STRAW = "RICE_STRAW"
    SOYBEAN_MEAL = "SOYBEAN_MEAL"
    MAIZE_GRAIN = "MAIZE_GRAIN"
    OTHER = "OTHER"

class FeedGrade(str, Enum):
    """Overall quality grade assigned to a tested feed sample."""
    A = "A"
    B = "B"
    C = "C"
    REJECT = "REJECT"

class SyncState(str, Enum):
    """Lifecycle state of a record's synchronisation with the cloud."""
    pending = "pending"
    in_flight = "in_flight"
    synced = "synced"
    conflict = "conflict"
    rejected = "rejected"

class ScanStatus(str, Enum):
    """Real-time status of an active NIR scan on the handheld device."""
    idle = "idle"
    chamber_open = "chamber_open"
    warming_up = "warming_up"
    scanning = "scanning"
    transferring = "transferring"
    complete = "complete"
    error = "error"
    calibrating = "calibrating"

class AdulterantType(str, Enum):
    """Detected or screened adulterant types."""
    UREA = "UREA"
    SAND_SILICA = "SAND_SILICA"
    MELAMINE = "MELAMINE"
    NONE = "NONE"

class ToxinBand(str, Enum):
    """Screening result band for mycotoxin risk. Never a quantitative claim."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    UNKNOWN = "UNKNOWN"

class Language(str, Enum):
    """Supported languages for UI, voice, and advisory content."""
    en = "en"
    hi = "hi"
    pa = "pa"
    mr = "mr"
    gu = "gu"
    te = "te"
    kn = "kn"
    bn = "bn"

class DeviceSKU(str, Enum):
    """Hardware SKU determines which parameters are available in the app."""
    AAHAR_PRO = "AAHAR_PRO"
    AAHAR_LITE = "AAHAR_LITE"

class ProbeStatus(str, Enum):
    """Connection and operational status of a silage probe node."""
    ONLINE_LORA = "ONLINE_LORA"
    ONLINE_BLE = "ONLINE_BLE"
    OFFLINE = "OFFLINE"
    LOW_BATTERY = "LOW_BATTERY"
    FAULT = "FAULT"
    CALIBRATING = "CALIBRATING"

class FermentationPhase(str, Enum):
    """Silage fermentation phase derived from probe readings."""
    AEROBIC = "AEROBIC"
    ACTIVE_ANAEROBIC = "ACTIVE_ANAEROBIC"
    STABLE = "STABLE"
    AEROBIC_SPOILAGE = "AEROBIC_SPOILAGE"
    CLOSTRIDIAL = "CLOSTRIDIAL"

class HerdBreed(str, Enum):
    """Common dairy cattle breeds in India. Used for nutrition requirement lookup."""
    HF = "HF"
    JERSEY = "JERSEY"
    HF_CROSS = "HF_CROSS"
    JERSEY_CROSS = "JERSEY_CROSS"
    SAHIWAL = "SAHIWAL"
    GIR = "GIR"
    THARPARKAR = "THARPARKAR"
    MURRAH = "MURRAH"
    SURTI = "SURTI"
    NILI_RAVI = "NILI_RAVI"
    OTHER = "OTHER"

class LactationStage(str, Enum):
    """Stage of the lactation cycle. Used for nutritional requirement calculation."""
    EARLY = "EARLY"
    PEAK = "PEAK"
    MID = "MID"
    LATE = "LATE"
    DRY = "DRY"
    PREGNANT = "PREGNANT"
    HEIFER = "HEIFER"

class AlertSeverity(str, Enum):
    """Severity level for push/SMS alerts."""
    INFO = "INFO"
    CAUTION = "CAUTION"
    CRITICAL = "CRITICAL"


# ─── Shared Types ────────────────────────────────────────────────────────────

class LamportClock(BaseModel):
    device: str = Field(..., description="device_id that owns this counter")
    counter: int = Field(..., ge=0)


class NumericResult(BaseModel):
    """Every measurement value ships with a confidence interval. Never display without CI."""
    model_config = ConfigDict(frozen=True)
    value:      float
    ci_low:     float = Field(..., description="Lower bound of 95% CI")
    ci_high:    float = Field(..., description="Upper bound of 95% CI")
    confidence: float = Field(..., ge=0.0, le=1.0)
    unit:       str   = Field(..., description="Key from units.json")


# ── SyncEnvelope (schema v1) ──
class SyncEnvelope(BaseModel):
    """Universal record envelope for every syncable entity across all AAHAR surfaces. All mutable and immutable records are wrapped in this envelope before sync."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description='UUIDv7 — time-ordered, generated offline, globally collision-free. Encodes millisecond timestamp in first 48 bits.')
    entity: Literal['measurement', 'spectrum', 'farm', 'herd', 'bunker', 'probe_reading', 'advisory', 'batch', 'sync_run', 'device_calibration', 'ota_event'] = Field(..., description='Discriminator for the payload type. Determines which schema validates the payload.')
    schema_version: int = Field(..., description='Schema version of the payload. CI fails if the generated code does not match the current version.')
    farm_id: str = Field(..., description='The farm this record belongs to. Used for row-level security on the server.')
    device_id: str = Field(..., description='Canonical device identifier. P=Pro handheld, L=Lite handheld, S=Silage probe, G=Gateway. e.g. AAHAR-P-004821')
    captured_at: datetime = Field(..., description='ISO 8601 timestamp from the device clock at moment of capture. May differ from server_received_at when offline.')
    server_received_at: Optional[Optional[datetime]] = Field(None, description='Set by the server on first receipt. Null until synced. Never modified after first set.')
    clock: Dict[str, Any] = Field(..., description='Lamport logical clock for causal ordering across offline devices.')
    sync_state: Literal['pending', 'in_flight', 'synced', 'conflict', 'rejected'] = Field(..., description="Local sync lifecycle state. 'pending'=queued for upload, 'in_flight'=upload attempted, 'synced'=server confirmed, 'conflict'=server returned conflict (mutable entities only), 'rejected'=server rejected with reason.")
    sync_reject_reason: Optional[Optional[str]] = Field(None, description="Human-readable rejection reason from server. Only set when sync_state='rejected'.")
    payload_hash: str = Field(..., description='SHA-256 of the canonical JSON-serialised payload. Used for idempotent upsert and corruption detection.')
    payload: Dict[str, Any] = Field(..., description="The actual entity data. Validated against the entity-specific schema determined by the 'entity' discriminator.")
    tags: Optional[List[str]] = Field(None, description="Optional free-form tags for filtering and organisation. e.g. ['pilot', 'suspect-batch', 'calibration']")


class NumericResult(BaseModel):
    """A numeric measurement with confidence interval. Never display value without ci_low/ci_high."""
    model_config = ConfigDict(populate_by_name=True)

    value: float = Field(..., description='Point estimate from the model.')
    ci_low: float = Field(..., description='Lower bound of the 95% confidence interval.')
    ci_high: float = Field(..., description='Upper bound of the 95% confidence interval.')
    confidence: float = Field(..., description='Model confidence in this prediction. < 0.6 = low confidence.')
    unit: str = Field(..., description="Unit key from units.json, e.g. 'pct_dm', 'mj_per_kg_dm'")


# ── MeasurementPayload (schema v3) ──
class MeasurementPayload(BaseModel):
    """Immutable record of a single feed quality test. Contains all 15 parameters from Table 4.1, confidence intervals, and derived outputs. Append-only — never updated after creation."""
    model_config = ConfigDict(populate_by_name=True)

    feed_type: str = Field(..., description='FeedType enum key. Determines which sub-model was active during inference.')
    device_sku: str = Field(..., description='DeviceSKU enum key. Determines which parameters are populated vs null.')
    scan_duration_ms: int = Field(..., description='Wall-clock time from scan start to spectrum transfer complete, in milliseconds.')
    inference_duration_ms: Optional[int] = Field(None, description='Total on-device ML inference time across all models, in milliseconds.')
    environment: Optional[Dict[str, Any]] = Field(None, description='Ambient conditions from BME688 at time of scan. Used for spectral compensation.')
    proximates: Dict[str, Any] = Field(..., description='Proximate analysis results. All values on dry-matter basis unless noted.')
    safety: Dict[str, Any] = Field(..., description='Food safety and adulteration screening results.')
    derived: Dict[str, Any] = Field(..., description='Derived outputs computed from proximate + safety results.')
    herd_context_id: Optional[Optional[str]] = Field(None, description='The herd record used for ration balancing at time of test. Null if no herd profile set up.')
    advisory_id: Optional[Optional[str]] = Field(None, description='UUIDv7 of the advisory record generated from this measurement.')
    price_paid_inr_per_kg: Optional[Optional[float]] = Field(None, description='Optional: price the farmer paid. Enables value-for-money calculation.')
    spectrum_id: Optional[Optional[str]] = Field(None, description='UUIDv7 of the raw spectrum record stored separately (large payload).')
    macro_image_ids: Optional[List[str]] = Field(None, description='UUIDv7s of the 4-angle macro photo records stored separately.')
    confidence_overall: float = Field(..., description="Ensemble confidence across all active models. < 0.6 triggers 'low confidence' UI warning.")
    in_distribution: bool = Field(..., description="False if Mahalanobis distance of the spectrum from training manifold exceeds threshold. If false, UI must show 'unusual sample — send to lab' and refuse to print a grade.")
    model_versions: Optional[Dict[str, str]] = Field(None, description='Version string of each model bundle active during inference. For audit and retraining queue.')
    local_advisory_text: Optional[Optional[Dict[str, str]]] = Field(None, description='Keyed by Language enum. Pre-rendered advisory text stored with the record for offline display.')
    qr_batch_id: Optional[Optional[str]] = Field(None, description='If this test was triggered by scanning a QR batch, the batch UUID. Enables declared-vs-measured diff.')


# ── SpectrumPayload (schema v2) ──
class SpectrumPayload(BaseModel):
    """Raw NIR spectrum payload. Immutable, large — stored separately from measurement. 228 bands × 3 repeats. Wi-Fi only sync by default."""
    model_config = ConfigDict(populate_by_name=True)

    measurement_id: str = Field(..., description='UUIDv7 of the parent measurement record.')
    device_sku: str = Field(..., description='DeviceSKU enum key.')
    sensor_model: Literal['C12880MA', 'AS7265x'] = Field(..., description='Physical sensor model. Determines wavelength grid and calibration polynomial.')
    wavelengths_nm: List[float] = Field(..., description='Wavelength axis in nanometres. Length determines number of bands. Hamamatsu: 228 bands 340–850nm. AS7265x: 18 bands 410–940nm.')
    intensities_raw: List[List[int]] = Field(..., description='Outer array = repeats (3 for production scan). Inner array = counts per wavelength band.')
    intensities_corrected: List[List[float]] = Field(..., description='Corrected reflectance: (raw - dark) / (white - dark). Same shape as intensities_raw.')
    dark_reference: List[int] = Field(..., description='Dark reference counts captured with shutter closed. Same length as wavelengths_nm.')
    white_reference: List[int] = Field(..., description='White reference counts from Spectralon tile. Captured at scan start. Same length as wavelengths_nm.')
    repeats: int = Field(..., description='Number of spectral sweeps in this capture. Production: 3.')
    integration_time_us: Optional[int] = Field(None, description='Sensor integration time in microseconds. Auto-selected to avoid saturation.')
    gain: Optional[float] = Field(None, description='Sensor gain setting. Sensor-dependent.')
    snr_db: Optional[Optional[float]] = Field(None, description='Estimated signal-to-noise ratio in dB. Computed from repeat variance. < 20 dB triggers a retake prompt.')
    saturation_bands: Optional[List[int]] = Field(None, description='Indices of any saturated bands (count at max ADC). Should be empty for a good scan.')
    temperature_compensation_applied: Optional[bool] = Field(None, description='Whether temperature drift correction was applied using BME688 reading.')
    calibration_id: Optional[str] = Field(None, description='ID of the calibration file that was active when this spectrum was captured.')
    transfer_stats: Optional[Dict[str, Any]] = Field(None, description='BLE transfer quality metrics.')
    preprocessing_applied: Optional[List[str]] = Field(None, description="Ordered list of preprocessing steps applied before inference. e.g. ['snv', 'savitzky_golay_11_2']")


# ── FarmPayload (schema v2) ──
class FarmPayload(BaseModel):
    """Mutable farm profile. Uses field-level Lamport clocks for offline conflict resolution: two offline edits to different fields both survive; same field follows last-write-wins."""
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., description='Farm name or owner name as used locally.')
    owner_phone: str = Field(..., description='Verified phone number (E.164, India only for v1). Used for OTP auth and SMS alerts.')
    owner_name: Optional[str] = None
    location: Dict[str, Any] = Field(..., description='Farm location for regional analytics and lab directory lookup.')
    language_preference: Optional[str] = Field(None, description='Language enum key. App switches to this language on farm profile load.')
    fpo_id: Optional[Optional[str]] = Field(None, description='Linked FPO/co-operative for dashboard aggregation and device sharing.')
    device_ids: Optional[List[str]] = Field(None, description='Devices registered to this farm.')
    photo_url: Optional[Optional[str]] = Field(None, description='Optional farm photo stored in MinIO.')
    consent: Optional[Dict[str, Any]] = Field(None, description='DPDP Act 2023 consent record. Must be obtained before any data leaves the device.')
    fields: Dict[str, Dict[str, Any]] = Field(..., description="Field-level Lamport clock map. Every top-level mutable field has an entry here. Format: { 'field_name': { 'device': 'AAHAR-P-004821', 'counter': 42 } }. Used by sync engine for conflict resolution.")
    notes: Optional[Optional[str]] = Field(None, description='Optional notes by the FPO supervisor or vet.')


# ── HerdPayload (schema v2) ──
class HerdPayload(BaseModel):
    """Mutable herd composition record for a farm. Used by the advisory engine to compute ration correction. Field-level Lamport clocks for offline merge."""
    model_config = ConfigDict(populate_by_name=True)

    farm_id: str
    animals: List[Dict[str, Any]] = Field(..., description='Individual or group animal records. Groups share the same breed/stage.')
    feed_on_hand: Optional[List[Dict[str, Any]]] = Field(None, description='Current feed stocks. Used by ration balancer to work with what the farmer actually has.')
    total_animals: Optional[int] = Field(None, description='Denormalised count. Must equal sum of animals[].count. Validated on write.')
    fields: Dict[str, Dict[str, Any]] = Field(..., description='Field-level Lamport clocks for offline merge.')


# ── BunkerPayload (schema v2) ──
class BunkerPayload(BaseModel):
    """Silage bunker / bag registration. Mutable geometry and metadata. Drives the 3D digital twin (S4). Field-level Lamport clocks for offline merge."""
    model_config = ConfigDict(populate_by_name=True)

    farm_id: str
    name: str = Field(..., description="Farmer-assigned name, e.g. 'North Bunker' or 'Bag #3'.")
    type: Literal['BUNKER', 'PILE', 'BAG', 'TOWER', 'PIT'] = Field(..., description='Silage storage structure type. Determines 3D twin geometry.')
    dimensions: Dict[str, Any] = Field(..., description='True-scale dimensions for 3D twin. All in metres.')
    capacity_tonnes: Optional[Optional[float]] = None
    fill_pct: Optional[Optional[float]] = Field(None, description='Estimated current fill level as % of capacity. Updated by farmer or FPO supervisor.')
    crop_type: str = Field(..., description="FeedType enum key for the ensiled crop. e.g. 'MAIZE_SILAGE', 'SORGHUM_SILAGE'.")
    ensiling_date: str = Field(..., description='Date the bunker was sealed / ensiling started. Used for fermentation phase calculation.')
    opening_date: Optional[Optional[str]] = Field(None, description='Date the face was first opened for feedout. Triggers aerobic spoilage risk model.')
    face_direction: Optional[Optional[Literal['NORTH', 'SOUTH', 'EAST', 'WEST', 'UNKNOWN']]] = Field(None, description='Cardinal direction of the feed-out face. For feedout planning in the 3D twin.')
    probe_positions: List[Dict[str, Any]] = Field(..., description='Registered probe lance positions in the bunker coordinate system. Origin = NW corner, +X = East, +Y = Up, +Z = South.')
    photo_ids: Optional[List[str]] = Field(None, description='UUIDv7s of bunker photos stored in MinIO.')
    cover_material: Optional[Optional[Literal['PLASTIC_FILM', 'SOIL', 'TYRES', 'MIXED']]] = Field(None, description='Sealing material type. Affects O₂ ingress model.')
    fermentation_phase: Optional[Optional[str]] = Field(None, description='FermentationPhase enum key. Derived from probe readings, updated by the cloud on each sync.')
    latest_fqi: Optional[Optional[float]] = Field(None, description='Latest Fermentation Quality Index (0–100). Derived on the cloud, synced back.')
    feedout_recommendation: Optional[Optional[Dict[str, Any]]] = Field(None, description='Latest feedout recommendation from the spoilage forecast model.')
    fields: Dict[str, Dict[str, Any]] = Field(..., description='Field-level Lamport clocks.')


# ── ProbeReadingPayload (schema v2) ──
class ProbeReadingPayload(BaseModel):
    """Immutable time-series reading from a silage probe node. Append-only. 9 parameters from Table 4.2. Ingested via MQTT or BLE relay."""
    model_config = ConfigDict(populate_by_name=True)

    bunker_id: str
    probe_device_id: str
    reading_sequence: Optional[int] = Field(None, description='Monotonically increasing sequence number per probe. Used to detect gaps.')
    ph: Dict[str, Any] = Field(..., description='ISFET pH probe reading. Range 3.0–7.5, accuracy ±0.1.')
    temperatures_c: List[Dict[str, Any]] = Field(..., description='Temperature readings from DS18B20 array at 4 depths. Index 0=surface, 3=deepest.')
    moisture_pct: Dict[str, Any]
    co2_ppm: Dict[str, Any] = Field(..., description='NDIR CO₂ reading. MH-Z19C. Range 0–10000 ppm, accuracy ±50 ppm.')
    o2_pct: Dict[str, Any] = Field(..., description='Electrochemical O₂ sensor. Range 0–25%, accuracy ±0.2%.')
    voc: Optional[Optional[Dict[str, Any]]] = Field(None, description='BME688 MOS array VOC / gas index readings. Relative, indexed.')
    fermentation_quality_index: float = Field(..., description='Composite score derived from pH trajectory, temp delta, CO₂, VOC. 80–100=excellent, 60–79=good, 40–59=fair, <40=poor.')
    mould_probability: Optional[Optional[float]] = Field(None, description='Derived mould growth probability. AUC ≥ 0.86. Null until forecast model has enough history (min 24 h).')
    spoilage_front_m: Optional[Optional[float]] = Field(None, description='Estimated aerobic spoilage front position in metres from the feed-out face. Null if face not yet opened.')
    alert_flags: Optional[List[Literal['HIGH_PH', 'TEMP_SPIKE', 'O2_INGRESS', 'NH3_SPIKE', 'LOW_BATTERY', 'MOULD_RISK', 'CLOSTRIDIAL_RISK']]] = Field(None, description='Active alert conditions at time of reading. Each triggers push/SMS if AlertSeverity=CRITICAL.')
    battery_pct: Optional[int] = None
    solar_charging: Optional[Optional[bool]] = None
    signal: Optional[Dict[str, Any]] = Field(None, description='Radio link quality.')


# ── AdvisoryPayload (schema v2) ──
class AdvisoryPayload(BaseModel):
    """Derived advisory record generated from a measurement + herd context. A local version is stored on-device. Server may recompute an authoritative version after sync. Both versions are kept."""
    model_config = ConfigDict(populate_by_name=True)

    measurement_id: str
    herd_id: Optional[Optional[str]] = None
    is_server_authoritative: Optional[bool] = Field(None, description='True = computed by cloud with full model context. False = computed on-device from local rule engine.')
    computed_at: Optional[datetime] = None
    feed_grade: Literal['A', 'B', 'C', 'REJECT']
    actions: List[Dict[str, Any]] = Field(..., description='Ordered list of actions the farmer should take, highest priority first.')
    ration_correction: Optional[Dict[str, Any]] = Field(..., description='Specific ration adjustment for this herd + this feed result. Null if no herd profile set.')
    herd_impacts: List[Dict[str, Any]] = Field(..., description='Body system impacts for the S5 Herd Impact 3D scene. Each entry maps to a highlighted region on the cow model.')
    value_for_money_summary_key: Optional[Optional[str]] = Field(None, description="e.g. 'overpriced_protein'. Resolved to locale string with params.")
    value_for_money_params: Optional[Optional[Dict[str, Any]]] = None
    text: Dict[str, Any] = Field(..., description='Pre-rendered advisory text keyed by Language enum key. All 8 languages populated before the record is stored.')
    tts_ids: Optional[Dict[str, str]] = Field(None, description='UUIDv7s of pre-generated TTS audio files, keyed by language. Bundled offline.')


# ── BatchPayload (schema v2) ──
class BatchPayload(BaseModel):
    """Feed mill batch record for QR traceability. A mill registers a batch with its declared profile. Farmers scan the QR to compare declared vs measured. Mismatches trigger dispute records."""
    model_config = ConfigDict(populate_by_name=True)

    mill_id: str = Field(..., description='UUID of the registered feed mill organisation.')
    batch_code: str = Field(..., description="Mill's own batch/lot code. Displayed on the QR scan result.")
    feed_type: str = Field(..., description='FeedType enum key.')
    production_date: str
    expiry_date: Optional[Optional[str]] = None
    quantity_tonnes: Optional[Optional[float]] = None
    declared_profile: Dict[str, Any] = Field(..., description="Mill's declared nutritional profile. Compared against farmer's measurement.")
    qr_payload: str = Field(..., description="The exact string encoded in the QR code. Format: 'aahar://batch/{uuid}'. Scanned by farmer app.")
    qr_signed: Optional[str] = Field(None, description='Ed25519 signature of qr_payload. Verified on-device with bundled public key.')
    disputes: Optional[List[Dict[str, Any]]] = Field(None, description='Dispute records created when farmer measurements deviate beyond tolerance from declared profile.')
    aggregate_stats: Optional[Optional[Dict[str, Any]]] = Field(None, description='Cloud-computed aggregate from all farmer tests against this batch. Updated on sync.')



# ─── Discriminated Union ──────────────────────────────────────────────────────

AnyPayload = Union[
    MeasurementPayload,
    SpectrumPayload,
    FarmPayload,
    HerdPayload,
    BunkerPayload,
    ProbeReadingPayload,
    AdvisoryPayload,
    BatchPayload,
]

# ─── Sync API Models ──────────────────────────────────────────────────────────

class SyncPushRequest(BaseModel):
    model_config = ConfigDict(frozen=True)
    records: List[SyncEnvelope]
    idempotency_key: str = Field(..., description="sha256 of sorted record IDs")

class SyncPushResult(BaseModel):
    id: str
    status: Literal["accepted", "duplicate", "conflict", "rejected"]
    reject_reason: Optional[str] = None
    server_received_at: Optional[datetime] = None

class SyncPushResponse(BaseModel):
    results: List[SyncPushResult]
    server_time: datetime

class SyncPullResponse(BaseModel):
    records: List[SyncEnvelope]
    cursor: str
    has_more: bool
    server_time: datetime

class SyncHandshake(BaseModel):
    server_time: datetime
    schema_version: int
    model_version: str
    firmware_version: str
    cursor: str
    thresholds_hash: str  # sha256 of thresholds.json
