"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-18 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Farms
    op.create_table(
        "farms",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("village", sa.String(length=100), nullable=True),
        sa.Column("district", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("pin_code", sa.String(length=10), nullable=True),
        sa.Column("contact_phone", sa.String(length=20), nullable=True),
        sa.Column("device_id", sa.String(length=50), nullable=True),
        sa.Column("lamport_counter", sa.Integer(), nullable=False, default=0),
        sa.Column("field_clocks", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 2. Users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=True),
        sa.Column("role", sa.String(length=30), nullable=False, default="farmer"),
        sa.Column("farm_id", sa.String(length=36), sa.ForeignKey("farms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)
    op.create_index("ix_users_farm_id", "users", ["farm_id"])

    # 3. Herds
    op.create_table(
        "herds",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("farm_id", sa.String(length=36), sa.ForeignKey("farms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_milking", sa.Integer(), nullable=False, default=0),
        sa.Column("total_dry", sa.Integer(), nullable=False, default=0),
        sa.Column("total_heifers", sa.Integer(), nullable=False, default=0),
        sa.Column("total_calves", sa.Integer(), nullable=False, default=0),
        sa.Column("breeds", sa.JSON(), nullable=False),
        sa.Column("average_daily_yield_litres", sa.Float(), nullable=False, default=0.0),
        sa.Column("ration_on_hand", sa.JSON(), nullable=False),
        sa.Column("lamport_counter", sa.Integer(), nullable=False, default=0),
        sa.Column("field_clocks", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_herds_farm_id", "herds", ["farm_id"])

    # 4. Bunkers
    op.create_table(
        "bunkers",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("farm_id", sa.String(length=36), sa.ForeignKey("farms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("bunker_type", sa.String(length=50), nullable=False),
        sa.Column("dimensions", sa.JSON(), nullable=False),
        sa.Column("crop_type", sa.String(length=50), nullable=False),
        sa.Column("ensiled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("probe_positions", sa.JSON(), nullable=False),
        sa.Column("lamport_counter", sa.Integer(), nullable=False, default=0),
        sa.Column("field_clocks", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_bunkers_farm_id", "bunkers", ["farm_id"])

    # 5. Measurements
    op.create_table(
        "measurements",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("farm_id", sa.String(length=36), sa.ForeignKey("farms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_id", sa.String(length=50), nullable=False),
        sa.Column("feed_type", sa.String(length=50), nullable=False),
        sa.Column("sample_temperature_c", sa.Float(), nullable=True),
        sa.Column("ambient_temperature_c", sa.Float(), nullable=True),
        sa.Column("ambient_humidity_pct", sa.Float(), nullable=True),
        sa.Column("proximates", sa.JSON(), nullable=False),
        sa.Column("safety", sa.JSON(), nullable=False),
        sa.Column("derived", sa.JSON(), nullable=False),
        sa.Column("grade", sa.String(length=10), nullable=False),
        sa.Column("in_distribution", sa.Boolean(), nullable=False, default=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("server_received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_spectrum_id", sa.String(length=36), nullable=True),
        sa.Column("image_keys", sa.JSON(), nullable=False),
        sa.Column("clock", sa.JSON(), nullable=False),
        sa.Column("sync_state", sa.String(length=20), nullable=False, default="synced"),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
    )
    op.create_index("ix_measurements_farm_id", "measurements", ["farm_id"])
    op.create_index("ix_measurements_captured_at", "measurements", ["captured_at"])
    op.create_index("ix_measurement_farm_captured", "measurements", ["farm_id", "captured_at"])

    # 6. Spectra
    op.create_table(
        "spectra",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("measurement_id", sa.String(length=36), sa.ForeignKey("measurements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("wavelengths", sa.JSON(), nullable=False),
        sa.Column("intensities", sa.JSON(), nullable=False),
        sa.Column("repeats", sa.Integer(), nullable=False, default=3),
        sa.Column("dark_reference", sa.JSON(), nullable=True),
        sa.Column("white_reference", sa.JSON(), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("server_received_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_spectra_measurement_id", "spectra", ["measurement_id"])

    # 7. Probe Readings
    op.create_table(
        "probe_readings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("bunker_id", sa.String(length=36), sa.ForeignKey("bunkers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("farm_id", sa.String(length=36), sa.ForeignKey("farms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("probe_id", sa.String(length=50), nullable=False),
        sa.Column("reading_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ph", sa.Float(), nullable=False),
        sa.Column("core_temp_c", sa.Float(), nullable=False),
        sa.Column("moisture_pct", sa.Float(), nullable=False),
        sa.Column("co2_ppm", sa.Float(), nullable=False),
        sa.Column("o2_pct", sa.Float(), nullable=False),
        sa.Column("voc_index", sa.Float(), nullable=False),
        sa.Column("fermentation_quality", sa.Float(), nullable=False),
        sa.Column("server_received_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_probe_readings_bunker_id", "probe_readings", ["bunker_id"])
    op.create_index("ix_probe_readings_reading_time", "probe_readings", ["reading_time"])
    op.create_index("ix_probe_bunker_time", "probe_readings", ["bunker_id", "reading_time"])

    # 8. Advisories
    op.create_table(
        "advisories",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("measurement_id", sa.String(length=36), sa.ForeignKey("measurements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("farm_id", sa.String(length=36), sa.ForeignKey("farms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("grade", sa.String(length=10), nullable=False),
        sa.Column("value_for_money", sa.JSON(), nullable=False),
        sa.Column("safety_actions", sa.JSON(), nullable=False),
        sa.Column("ration_actions", sa.JSON(), nullable=False),
        sa.Column("storage_actions", sa.JSON(), nullable=False),
        sa.Column("silage_actions", sa.JSON(), nullable=False),
        sa.Column("herd_impacts", sa.JSON(), nullable=False),
        sa.Column("local_text", sa.JSON(), nullable=False),
        sa.Column("is_authoritative", sa.Boolean(), nullable=False, default=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 9. Batches
    op.create_table(
        "batches",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("qr_code", sa.String(length=100), unique=True, nullable=False),
        sa.Column("mill_id", sa.String(length=36), nullable=False),
        sa.Column("mill_name", sa.String(length=120), nullable=False),
        sa.Column("feed_type", sa.String(length=50), nullable=False),
        sa.Column("batch_number", sa.String(length=50), nullable=False),
        sa.Column("manufactured_date", sa.String(length=10), nullable=False),
        sa.Column("expiry_date", sa.String(length=10), nullable=False),
        sa.Column("declared_profile", sa.JSON(), nullable=False),
        sa.Column("actual_measurements", sa.JSON(), nullable=False),
        sa.Column("disputes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_batches_qr_code", "batches", ["qr_code"], unique=True)

    # 10. Sync Envelopes
    op.create_table(
        "sync_envelopes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("entity", sa.String(length=50), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("farm_id", sa.String(length=36), nullable=False),
        sa.Column("device_id", sa.String(length=50), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("clock", sa.JSON(), nullable=False),
        sa.Column("server_received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sync_state", sa.String(length=20), nullable=False, default="synced"),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
    )
    op.create_index("ix_sync_farm_server_received", "sync_envelopes", ["farm_id", "server_received_at"])

    # 11. Sync Runs
    op.create_table(
        "sync_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("device_id", sa.String(length=50), nullable=False),
        sa.Column("farm_id", sa.String(length=36), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("records_pushed", sa.Integer(), nullable=False, default=0),
        sa.Column("records_pulled", sa.Integer(), nullable=False, default=0),
        sa.Column("bytes_up", sa.Integer(), nullable=False, default=0),
        sa.Column("bytes_down", sa.Integer(), nullable=False, default=0),
        sa.Column("status", sa.String(length=20), nullable=False, default="completed"),
        sa.Column("error_details", sa.Text(), nullable=True),
    )

    # 12. Audit Logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("actor_id", sa.String(length=36), nullable=False),
        sa.Column("farm_id", sa.String(length=36), nullable=False),
        sa.Column("target_farm_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("entity", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=50), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
    )

    # 13. OTP Verifications
    op.create_table(
        "otp_verifications",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified", sa.Boolean(), nullable=False, default=False),
        sa.Column("attempts", sa.Integer(), nullable=False, default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_otp_phone", "otp_verifications", ["phone"])

    # TimescaleDB Hypertables (if Timescale extension is available)
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        try:
            conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            conn.execute(sa.text("SELECT create_hypertable('probe_readings', 'reading_time', if_not_exists => TRUE);"))
            conn.execute(sa.text("SELECT create_hypertable('measurements', 'captured_at', if_not_exists => TRUE);"))
        except Exception:
            pass


def downgrade() -> None:
    op.drop_table("otp_verifications")
    op.drop_table("audit_logs")
    op.drop_table("sync_runs")
    op.drop_table("sync_envelopes")
    op.drop_table("batches")
    op.drop_table("advisories")
    op.drop_table("probe_readings")
    op.drop_table("spectra")
    op.drop_table("measurements")
    op.drop_table("bunkers")
    op.drop_table("herds")
    op.drop_table("users")
    op.drop_table("farms")
