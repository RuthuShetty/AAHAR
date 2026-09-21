"""Security hardening: token denylist, media sessions, artifact registry,
OTP hashing, org scoping, nullable probe channels.

Revision ID: 0002_security_hardening
Revises: 0001_initial_schema

MIGRATION RISK — READ BEFORE RUNNING:
  * otp_verifications.code (plaintext) is DROPPED and replaced by code_hash.
    Outstanding OTPs are invalidated; users mid-login must request a new code.
    This is intentional: plaintext OTPs must not be retained.
  * probe_readings sensor columns become NULLABLE. This widens the constraint,
    so it is safe and reversible only if no NULLs have been written yet.
  * No measurement or farm data is deleted by this migration.
"""
import sqlalchemy as sa
from alembic import op

revision = "0002_security_hardening"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "revoked_tokens",
        sa.Column("jti", sa.String(36), primary_key=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(50), nullable=False, server_default="rotated"),
    )

    op.create_table(
        "media_uploads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_user_id", sa.String(36), nullable=False, index=True),
        sa.Column("farm_id", sa.String(36), nullable=False, index=True),
        sa.Column("measurement_id", sa.String(36), nullable=True, index=True),
        sa.Column("file_name", sa.String(120), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("media_category", sa.String(20), nullable=False),
        sa.Column("declared_size_bytes", sa.Integer(), nullable=False),
        sa.Column("declared_sha256", sa.String(64), nullable=False),
        sa.Column("total_parts", sa.Integer(), nullable=False),
        sa.Column("parts_received", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("stored_path", sa.String(500), nullable=True),
        sa.Column("state", sa.String(20), nullable=False, server_default="pending", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "artifact_releases",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("version", sa.String(30), nullable=False),
        sa.Column("target", sa.String(80), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("signature_ed25519", sa.String(256), nullable=True),
        sa.Column("signing_key_id", sa.String(64), nullable=True),
        sa.Column("stored_path", sa.String(500), nullable=True),
        sa.Column("state", sa.String(20), nullable=False, server_default="draft", index=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Tenancy boundary.
    op.add_column("users", sa.Column("org_id", sa.String(36), nullable=True))
    op.create_index("ix_users_org_id", "users", ["org_id"])
    op.add_column("farms", sa.Column("org_id", sa.String(36), nullable=True))
    op.create_index("ix_farms_org_id", "farms", ["org_id"])

    # OTP: drop plaintext, add hash + single-use flag.
    op.add_column("otp_verifications", sa.Column("code_hash", sa.String(64), nullable=True))
    op.add_column(
        "otp_verifications",
        sa.Column("consumed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # Invalidate every outstanding code rather than attempting to migrate it.
    op.execute("UPDATE otp_verifications SET consumed = TRUE, code_hash = ''")
    op.alter_column("otp_verifications", "code_hash", nullable=False)
    op.drop_column("otp_verifications", "code")
    op.create_index("ix_otp_phone_created", "otp_verifications", ["phone", "created_at"])

    # Probe channels become nullable so a missing sensor is NULL, not a
    # fabricated constant.
    for column in (
        "ph", "core_temp_c", "moisture_pct",
        "co2_ppm", "o2_pct", "voc_index", "fermentation_quality",
    ):
        op.alter_column("probe_readings", column, existing_type=sa.Float(), nullable=True)


def downgrade() -> None:
    for column in (
        "ph", "core_temp_c", "moisture_pct",
        "co2_ppm", "o2_pct", "voc_index", "fermentation_quality",
    ):
        op.alter_column("probe_readings", column, existing_type=sa.Float(), nullable=False)
    op.drop_index("ix_otp_phone_created", table_name="otp_verifications")
    op.add_column("otp_verifications", sa.Column("code", sa.String(10), nullable=True))
    op.drop_column("otp_verifications", "consumed")
    op.drop_column("otp_verifications", "code_hash")
    op.drop_index("ix_farms_org_id", table_name="farms")
    op.drop_column("farms", "org_id")
    op.drop_index("ix_users_org_id", table_name="users")
    op.drop_column("users", "org_id")
    op.drop_table("artifact_releases")
    op.drop_table("media_uploads")
    op.drop_table("revoked_tokens")
