"""
AAHAR Cloud Core — FastAPI application.

Changes from the previous version:
  - `Base.metadata.create_all()` no longer runs at startup. It bypassed
    Alembic entirely, so the deployed schema silently diverged from the
    migration history and column changes were never applied to an existing DB.
  - The MQTT ingestion worker no longer runs inside the API process. It was
    started in every uvicorn worker, so an N-worker deployment processed each
    probe message N times. It is now a separate entrypoint.
  - `/health/ready` no longer returns the raw database exception string to
    anonymous callers (it leaked hostnames, usernames and driver internals).
  - Security headers, request IDs, structured logging, a global exception
    handler and host validation added.
"""
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.middleware.trustedhost import TrustedHostMiddleware

from cloud.app.api.advisory import router as advisory_router
from cloud.app.api.alerts import router as alerts_router
from cloud.app.api.analytics import router as analytics_router
from cloud.app.api.auth import router as auth_router
from cloud.app.api.batches import router as batches_router
from cloud.app.api.media import router as media_router
from cloud.app.api.models_firmware import router as mf_router
from cloud.app.api.silage_forecast import router as silage_forecast_router
from cloud.app.api.sync import router as sync_router
from cloud.app.config import settings
from cloud.app.database import engine
from cloud.app.idempotency import idempotency_store
from cloud.app.logging_config import configure_logging
from cloud.app.rate_limit import limiter

configure_logging(settings.ENVIRONMENT, settings.DEBUG)
logger = logging.getLogger("aahar")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if await idempotency_store.use_redis(settings.REDIS_URL):
        logger.info("idempotency store backed by Redis")
    else:
        logger.warning(
            "Redis unavailable: idempotency and rate limits are per-worker only. "
            "Run a single worker or provision Redis before production traffic."
        )
    await limiter.use_redis(settings.REDIS_URL)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart AI-Enabled Rapid Feed & Silage Quality Testing System",
    lifespan=lifespan,
    docs_url="/docs" if settings.EXPOSE_API_DOCS else None,
    redoc_url="/redoc" if settings.EXPOSE_API_DOCS else None,
    openapi_url="/openapi.json" if settings.EXPOSE_API_DOCS else None,
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=bool(settings.CORS_ORIGINS),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    max_age=600,
)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
}


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "unhandled error", extra={"request_id": request_id, "path": request.url.path}
        )
        raise
    duration_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    for key, value in SECURITY_HEADERS.items():
        response.headers.setdefault(key, value)
    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    logger.info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
        },
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    # Field names and messages only. Never echo the submitted body back, which
    # can contain OTP codes, tokens or personal data and lands in logs.
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "validation_error",
            "detail": [
                {"field": ".".join(str(p) for p in e.get("loc", [])), "message": e.get("msg")}
                for e in exc.errors()
            ],
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception("unhandled exception", extra={"request_id": request_id})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_error",
            "detail": "An unexpected error occurred.",
            "request_id": request_id,
        },
    )


for r in (
    auth_router, sync_router, media_router, mf_router, advisory_router,
    batches_router, analytics_router, alerts_router, silage_forecast_router,
):
    app.include_router(r)


@app.get("/health", tags=["system"])
async def health_check():
    """Liveness. Must not touch dependencies."""
    return {"status": "healthy", "service": "aahar-cloud", "version": settings.APP_VERSION}


@app.get("/health/ready", tags=["system"])
async def readiness_check():
    """Readiness. Returns a boolean, never the underlying error text."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        logger.exception("readiness probe: database unreachable")
        db_ok = False

    payload = {
        "status": "ready" if db_ok else "degraded",
        "database": "ok" if db_ok else "unavailable",
        "schema_version": settings.SCHEMA_VERSION,
    }
    return JSONResponse(
        status_code=status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=payload,
    )
