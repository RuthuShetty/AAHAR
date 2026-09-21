"""
AAHAR SQLAlchemy 2.0 ORM Models
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from cloud.app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    role = Column(String(30), default="farmer", nullable=False)  # farmer, fpo_supervisor, mill_qc, vet, admin
    # Tenancy boundary. Elevated roles may only reach farms in their own org.
    org_id = Column(String(36), nullable=True, index=True)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    farm = relationship("Farm", back_populates="users", foreign_keys=[farm_id])


class Farm(Base):
    __tablename__ = "farms"

    id = Column(String(36), primary_key=True)
    org_id = Column(String(36), nullable=True, index=True)
    name = Column(String(120), nullable=False)
    village = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pin_code = Column(String(10), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    device_id = Column(String(50), nullable=True)
    lamport_counter = Column(Integer, default=0, nullable=False)
    field_clocks = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    users = relationship("User", back_populates="farm", cascade="all, delete-orphan")
    herds = relationship("Herd", back_populates="farm", cascade="all, delete-orphan")
    bunkers = relationship("Bunker", back_populates="farm", cascade="all, delete-orphan")
    measurements = relationship("Measurement", back_populates="farm", cascade="all, delete-orphan")


class Herd(Base):
    __tablename__ = "herds"

    id = Column(String(36), primary_key=True)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    total_milking = Column(Integer, default=0, nullable=False)
    total_dry = Column(Integer, default=0, nullable=False)
    total_heifers = Column(Integer, default=0, nullable=False)
    total_calves = Column(Integer, default=0, nullable=False)
    breeds = Column(JSON, default=list, nullable=False)
    average_daily_yield_litres = Column(Float, default=0.0, nullable=False)
    ration_on_hand = Column(JSON, default=list, nullable=False)
    lamport_counter = Column(Integer, default=0, nullable=False)
    field_clocks = Column(JSON, default=dict, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    farm = relationship("Farm", back_populates="herds")


class Bunker(Base):
    __tablename__ = "bunkers"

    id = Column(String(36), primary_key=True)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    bunker_type = Column(String(50), nullable=False)  # pit, bunker, bag, pile, tower
    dimensions = Column(JSON, default=dict, nullable=False)  # length_m, width_m, height_m, volume_m3
    crop_type = Column(String(50), nullable=False)
    ensiled_at = Column(DateTime(timezone=True), nullable=True)
    probe_positions = Column(JSON, default=list, nullable=False)
    lamport_counter = Column(Integer, default=0, nullable=False)
    field_clocks = Column(JSON, default=dict, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    farm = relationship("Farm", back_populates="bunkers")
    probe_readings = relationship("ProbeReading", back_populates="bunker", cascade="all, delete-orphan")


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(String(36), primary_key=True)  # UUIDv7
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(50), nullable=False, index=True)
    feed_type = Column(String(50), nullable=False, index=True)
    sample_temperature_c = Column(Float, nullable=True)
    ambient_temperature_c = Column(Float, nullable=True)
    ambient_humidity_pct = Column(Float, nullable=True)
    proximates = Column(JSON, nullable=False)  # moisture, cp, adf, ndf, etc.
    safety = Column(JSON, nullable=False)      # urea, silica, aflatoxin, etc.
    derived = Column(JSON, nullable=False)     # me_mj_per_kg, etc.
    grade = Column(String(10), nullable=False) # A, B, C, REJECT
    in_distribution = Column(Boolean, default=True, nullable=False)
    captured_at = Column(DateTime(timezone=True), nullable=False, index=True)
    server_received_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    raw_spectrum_id = Column(String(36), nullable=True)
    image_keys = Column(JSON, default=list, nullable=False)
    clock = Column(JSON, nullable=False)
    sync_state = Column(String(20), default="synced", nullable=False)
    payload_hash = Column(String(64), nullable=False, index=True)

    farm = relationship("Farm", back_populates="measurements")
    advisories = relationship("Advisory", back_populates="measurement", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_measurement_farm_captured", "farm_id", "captured_at"),
    )


class Spectrum(Base):
    __tablename__ = "spectra"

    id = Column(String(36), primary_key=True)  # UUIDv7
    measurement_id = Column(String(36), ForeignKey("measurements.id", ondelete="CASCADE"), nullable=False, index=True)
    wavelengths = Column(JSON, nullable=False)  # 228 bands float array
    intensities = Column(JSON, nullable=False)  # array of repeats
    repeats = Column(Integer, default=3, nullable=False)
    dark_reference = Column(JSON, nullable=True)
    white_reference = Column(JSON, nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=False)
    server_received_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class ProbeReading(Base):
    __tablename__ = "probe_readings"

    id = Column(String(36), primary_key=True)  # UUIDv7
    bunker_id = Column(String(36), ForeignKey("bunkers.id", ondelete="CASCADE"), nullable=False, index=True)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    probe_id = Column(String(50), nullable=False, index=True)
    reading_time = Column(DateTime(timezone=True), nullable=False, index=True)
    ph = Column(Float, nullable=True)
    core_temp_c = Column(Float, nullable=True)
    moisture_pct = Column(Float, nullable=True)
    co2_ppm = Column(Float, nullable=True)
    o2_pct = Column(Float, nullable=True)
    voc_index = Column(Float, nullable=True)
    fermentation_quality = Column(Float, nullable=True)
    server_received_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    bunker = relationship("Bunker", back_populates="probe_readings")

    __table_args__ = (
        Index("ix_probe_bunker_time", "bunker_id", "reading_time"),
    )


class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(String(36), primary_key=True)
    measurement_id = Column(String(36), ForeignKey("measurements.id", ondelete="CASCADE"), nullable=False, index=True)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    grade = Column(String(10), nullable=False)
    value_for_money = Column(JSON, nullable=False)
    safety_actions = Column(JSON, default=list, nullable=False)
    ration_actions = Column(JSON, default=list, nullable=False)
    storage_actions = Column(JSON, default=list, nullable=False)
    silage_actions = Column(JSON, default=list, nullable=False)
    herd_impacts = Column(JSON, default=list, nullable=False)
    local_text = Column(JSON, nullable=False)  # 8 locales text + voice string
    is_authoritative = Column(Boolean, default=True, nullable=False)
    generated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    measurement = relationship("Measurement", back_populates="advisories")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True)
    qr_code = Column(String(100), unique=True, nullable=False, index=True)
    mill_id = Column(String(36), nullable=False, index=True)
    mill_name = Column(String(120), nullable=False)
    feed_type = Column(String(50), nullable=False)
    batch_number = Column(String(50), nullable=False)
    manufactured_date = Column(String(10), nullable=False)
    expiry_date = Column(String(10), nullable=False)
    declared_profile = Column(JSON, nullable=False)
    actual_measurements = Column(JSON, default=list, nullable=False)
    disputes = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class SyncEnvelopeRecord(Base):
    """
    Append-only raw envelope store for every incoming sync record.
    Preserves raw envelope + payload for auditing and delta pull.
    """
    __tablename__ = "sync_envelopes"

    id = Column(String(36), primary_key=True)
    entity = Column(String(50), nullable=False, index=True)
    schema_version = Column(Integer, nullable=False)
    farm_id = Column(String(36), nullable=False, index=True)
    device_id = Column(String(50), nullable=False, index=True)
    captured_at = Column(DateTime(timezone=True), nullable=False)
    clock = Column(JSON, nullable=False)
    server_received_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    sync_state = Column(String(20), default="synced", nullable=False)
    payload_hash = Column(String(64), nullable=False)
    payload = Column(JSON, nullable=False)

    __table_args__ = (
        Index("ix_sync_farm_server_received", "farm_id", "server_received_at"),
    )


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(50), nullable=False)
    farm_id = Column(String(36), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    records_pushed = Column(Integer, default=0, nullable=False)
    records_pulled = Column(Integer, default=0, nullable=False)
    bytes_up = Column(Integer, default=0, nullable=False)
    bytes_down = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="completed", nullable=False)
    error_details = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(36), nullable=False, index=True)
    farm_id = Column(String(36), nullable=False, index=True)
    target_farm_id = Column(String(36), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # read, write, export, delete
    entity = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String(20), nullable=False, index=True)
    # HMAC-SHA256 of (phone, code). The plaintext OTP is never persisted.
    code_hash = Column(String(64), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    __table_args__ = (
        Index("ix_otp_phone_created", "phone", "created_at"),
    )


class RegisteredProbe(Base):
    """
    Device registry binding a probe to exactly one farm and bunker.
    Without this, MQTT ingestion trusted the farm_id embedded in the topic
    string, and the broker ACL allowed any client to publish to
    aahar/+/+/reading.
    """
    __tablename__ = "registered_probes"

    id = Column(String(64), primary_key=True)          # probe_id / client id
    farm_id = Column(String(36), nullable=False, index=True)
    bunker_id = Column(String(36), nullable=True, index=True)
    hardware_revision = Column(String(30), nullable=True)
    client_cert_fingerprint = Column(String(95), nullable=True, unique=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class ArtifactRelease(Base):
    """
    Registry of signed, downloadable ML model bundles and firmware images.
    Replaces the hardcoded manifest whose digests were public test vectors.
    """
    __tablename__ = "artifact_releases"

    id = Column(String(64), primary_key=True)
    kind = Column(String(20), nullable=False, index=True)       # model | firmware
    name = Column(String(120), nullable=False)
    version = Column(String(30), nullable=False)
    target = Column(String(80), nullable=True)                   # SKU or MCU
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False)
    signature_ed25519 = Column(String(256), nullable=True)
    signing_key_id = Column(String(64), nullable=True)
    stored_path = Column(String(500), nullable=True)
    state = Column(String(20), default="draft", nullable=False, index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class MediaUpload(Base):
    """
    Durable record of a resumable upload session. Previously this lived in a
    process-local dict, so sessions vanished on restart and were invisible to
    other workers, and nothing tied an upload to an owner.
    """
    __tablename__ = "media_uploads"

    id = Column(String(36), primary_key=True)
    owner_user_id = Column(String(36), nullable=False, index=True)
    farm_id = Column(String(36), nullable=False, index=True)
    measurement_id = Column(String(36), nullable=True, index=True)
    file_name = Column(String(120), nullable=False)
    content_type = Column(String(100), nullable=False)
    media_category = Column(String(20), nullable=False)
    declared_size_bytes = Column(Integer, nullable=False)
    declared_sha256 = Column(String(64), nullable=False)
    total_parts = Column(Integer, nullable=False)
    parts_received = Column(Integer, default=0, nullable=False)
    size_bytes = Column(Integer, nullable=True)
    stored_path = Column(String(500), nullable=True)
    state = Column(String(20), default="pending", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class RevokedToken(Base):
    """
    Denylist for refresh-token jtis. Rows are purged once `expires_at` has
    passed, so the table stays bounded by the refresh-token TTL.
    """
    __tablename__ = "revoked_tokens"

    jti = Column(String(36), primary_key=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    reason = Column(String(50), nullable=False, default="rotated")
