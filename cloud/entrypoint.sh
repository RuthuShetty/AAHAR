#!/usr/bin/env sh
# Migrations run once, before the app accepts traffic. `create_all()` at
# startup was removed, so this is now the only path that changes the schema.
set -eu

echo "[aahar] running database migrations..."
alembic -c /app/cloud/alembic.ini upgrade head

WORKERS="${UVICORN_WORKERS:-1}"
if [ "$WORKERS" -gt 1 ] && [ -z "${REDIS_URL:-}" ]; then
  echo "[aahar] REFUSING TO START: UVICORN_WORKERS=$WORKERS with no REDIS_URL." >&2
  echo "[aahar] Idempotency and rate limiting are per-process without Redis," >&2
  echo "[aahar] so multiple workers would silently void both guarantees." >&2
  exit 1
fi

echo "[aahar] starting API with $WORKERS worker(s)"
exec uvicorn cloud.app.main:app \
  --host 0.0.0.0 --port 8000 \
  --workers "$WORKERS" \
  --timeout-graceful-shutdown 30 \
  --proxy-headers --forwarded-allow-ips '*' \
  --no-server-header
