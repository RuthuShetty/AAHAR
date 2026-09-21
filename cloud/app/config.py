"""
AAHAR Cloud Configuration

Security posture:
  - No secret has a usable default. Production start-up FAILS LOUDLY if a
    required secret is missing or is a known-weak placeholder.
  - DEV_MODE is OFF by default and can never be enabled when
    ENVIRONMENT == "production".
"""
import sys
from pathlib import Path
from typing import List, Literal, Union

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CONTRACTS_DIR = ROOT_DIR / "contracts"

# Placeholder secrets that must never reach a deployed environment.
_BANNED_SECRETS = {
    "aahar-secret-key-change-in-production-must-be-32-chars-long",
    "changeme",
    "secret",
    "minioadmin",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App info ────────────────────────────────────────────────────────────
    APP_NAME: str = "AAHAR Cloud Service"
    APP_VERSION: str = "0.1.0"
    SCHEMA_VERSION: int = 3
    ENVIRONMENT: Literal["development", "test", "staging", "production"] = "development"
    DEBUG: bool = False

    # Model / firmware versions are resolved from the artifact registry at
    # runtime, not pinned in config. Kept only as a reporting default.
    MODEL_VERSION: str = "nir-proximate-v1.2.0"
    FIRMWARE_VERSION: str = "2.1.0-prod"

    # ── Database ────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./aahar_cloud.db"
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # ── Redis (idempotency, rate limiting, OTP throttling) ──────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Object storage ──────────────────────────────────────────────────────
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_MEDIA: str = "aahar-media"
    S3_BUCKET_MODELS: str = "aahar-models"
    S3_BUCKET_FIRMWARE: str = "aahar-firmware"
    S3_SECURE: bool = False

    # Local fallback for media when S3 is not configured. MUST be outside the
    # repository tree so uploads are never committed.
    MEDIA_LOCAL_DIR: Path = Path("/var/lib/aahar/media")
    MEDIA_MAX_PART_BYTES: int = 8 * 1024 * 1024        # 8 MiB per part
    MEDIA_MAX_TOTAL_BYTES: int = 256 * 1024 * 1024     # 256 MiB per upload
    MEDIA_SESSION_TTL_SECONDS: int = 24 * 3600

    # ── MQTT ────────────────────────────────────────────────────────────────
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_PROBE_TOPIC: str = "aahar/+/+/reading"
    # The MQTT ingestion worker runs as its own process. Never in the API.
    MQTT_WORKER_ENABLED: bool = False

    # ── Auth ────────────────────────────────────────────────────────────────
    JWT_SECRET: str = Field(default="", min_length=0)
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "aahar-cloud"
    JWT_AUDIENCE: str = "aahar-clients"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    OTP_EXPIRY_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 5
    OTP_REQUEST_COOLDOWN_SECONDS: int = 60
    OTP_MAX_REQUESTS_PER_HOUR: int = 5

    # DEV_MODE only relaxes OTP *delivery* (code is logged, not SMS-sent).
    # It NEVER bypasses authentication. See cloud/app/auth.py.
    DEV_MODE: bool = False

    # ── Paths ───────────────────────────────────────────────────────────────
    CONTRACTS_PATH: Path = CONTRACTS_DIR
    THRESHOLDS_PATH: Path = CONTRACTS_DIR / "thresholds.json"
    UNITS_PATH: Path = CONTRACTS_DIR / "units.json"

    # ── HTTP ────────────────────────────────────────────────────────────────
    # No wildcard default. Must be set explicitly per environment.
    CORS_ORIGINS: Union[List[str], str] = []
    EXPOSE_API_DOCS: bool = True
    TRUSTED_HOSTS: Union[List[str], str] = ["*"]
    RATE_LIMIT_DEFAULT: str = "120/minute"

    # ── Validators ──────────────────────────────────────────────────────────
    @field_validator("CORS_ORIGINS", "TRUSTED_HOSTS", mode="before")
    @classmethod
    def _split_csv(cls, v):
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT in ("staging", "production")

    @model_validator(mode="after")
    def _enforce_production_safety(self):
        errors: List[str] = []

        if self.is_production:
            if not self.JWT_SECRET or len(self.JWT_SECRET) < 32:
                errors.append(
                    "JWT_SECRET must be set to a random value of at least 32 characters."
                )
            if self.JWT_SECRET in _BANNED_SECRETS:
                errors.append("JWT_SECRET is a known placeholder value.")
            if self.DEV_MODE:
                errors.append("DEV_MODE must be False in staging/production.")
            if self.DEBUG:
                errors.append("DEBUG must be False in staging/production.")
            if "*" in self.CORS_ORIGINS:
                errors.append("CORS_ORIGINS must not contain '*' in staging/production.")
            if self.S3_ACCESS_KEY in _BANNED_SECRETS or self.S3_SECRET_KEY in _BANNED_SECRETS:
                errors.append("S3 credentials are placeholder values.")
            if self.DATABASE_URL.startswith("sqlite"):
                errors.append("SQLite is not supported in staging/production. Use PostgreSQL.")
            if "*" in self.TRUSTED_HOSTS:
                errors.append("TRUSTED_HOSTS must list explicit hostnames in staging/production.")
            try:
                if Path(self.MEDIA_LOCAL_DIR).resolve().is_relative_to(ROOT_DIR):
                    errors.append("MEDIA_LOCAL_DIR must not live inside the repository tree.")
            except (OSError, ValueError):
                pass
        else:
            # Development: generate an ephemeral secret rather than shipping one.
            if not self.JWT_SECRET:
                import secrets as _secrets
                object.__setattr__(self, "JWT_SECRET", _secrets.token_urlsafe(48))

        if errors:
            joined = "\n  - ".join(errors)
            raise ValueError(
                f"Refusing to start: insecure configuration for "
                f"ENVIRONMENT={self.ENVIRONMENT}:\n  - {joined}"
            )
        return self


try:
    settings = Settings()
except ValueError as exc:  # pragma: no cover - startup guard
    print(f"[AAHAR CONFIG ERROR]\n{exc}", file=sys.stderr)
    raise
