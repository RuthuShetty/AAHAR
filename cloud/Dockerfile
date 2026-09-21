# ─── Stage 1: Build & Dependencies ──────────────────────────────────────────
FROM python:3.11-slim as builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ─── Stage 2: Final Runtime ──────────────────────────────────────────────────
FROM python:3.11-slim as runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/aahar/.local/bin:$PATH"

RUN groupadd -r aahar && useradd -r -g aahar -d /home/aahar -m aahar \
    && apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /home/aahar/.local
RUN chown -R aahar:aahar /home/aahar/.local

# Copy application and contracts
COPY --chown=aahar:aahar ./cloud /app/cloud
COPY --chown=aahar:aahar ./contracts /app/contracts

# Media must live on a writable volume OUTSIDE the image and outside the repo.
RUN mkdir -p /var/lib/aahar/media && chown -R aahar:aahar /var/lib/aahar
VOLUME ["/var/lib/aahar/media"]

USER aahar

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# Was: --workers 4. The idempotency cache and rate limiter were process-local,
# so 4 workers meant 4x the configured rate limits and no idempotency at all;
# the MQTT worker also ran in each one, processing every probe message 4 times.
# Worker count is now explicit and gated on Redis by entrypoint.sh.
ENV UVICORN_WORKERS=1
ENTRYPOINT ["/app/cloud/entrypoint.sh"]
