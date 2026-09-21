"""
AAHAR Sync API — /sync/handshake, /sync/push, /sync/pull

Fixes applied over the previous implementation:
  - IDOR closed. `farm_id` is no longer taken from the query string or from
    the client's own envelope without an authorisation check. Previously any
    caller could read (`GET /sync/pull?farm_id=<victim>`) or write into any
    farm in the deployment.
  - payload_hash is now VERIFIED server-side. Previously the client's claimed
    hash was stored verbatim, so duplicate detection and integrity were
    decorative.
  - Idempotency cache is bounded, TTL'd and scoped per user, so one caller
    can no longer replay another caller's key and read their results.
  - Batch size is bounded.
"""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.auth import get_current_user
from cloud.app.config import settings
from cloud.app.database import get_db
from cloud.app.idempotency import idempotency_store
from cloud.app.models.entities import User, utc_now
from cloud.app.rate_limit import limiter
from cloud.app.sync.engine import SyncEngine, compute_thresholds_hash
from cloud.app.tenancy import assert_farm_access

logger = logging.getLogger("aahar.sync")
router = APIRouter(prefix="/sync", tags=["sync"])

MAX_RECORDS_PER_PUSH = 200


class HandshakeResponse(BaseModel):
    server_time: str
    schema_version: int
    model_version: str
    firmware_version: str
    cursor: str
    thresholds_hash: str


class PushRecordEnvelope(BaseModel):
    id: str = Field(..., max_length=36)
    entity: str = Field(..., max_length=50)
    schema_version: int
    farm_id: str = Field(..., max_length=36)
    device_id: str = Field(..., max_length=50)
    captured_at: str
    clock: Dict[str, Any]
    server_received_at: Optional[str] = None
    sync_state: str = "pending"
    payload_hash: str = Field(..., min_length=64, max_length=64)
    payload: Dict[str, Any]


class SyncPushBody(BaseModel):
    records: List[PushRecordEnvelope] = Field(..., max_length=MAX_RECORDS_PER_PUSH)


class SyncPushResponse(BaseModel):
    results: List[Dict[str, Any]]
    server_time: str


class SyncPullResponse(BaseModel):
    records: List[Dict[str, Any]]
    cursor: str
    has_more: bool
    server_time: str


@router.get("/handshake", response_model=HandshakeResponse)
async def sync_handshake(current_user: User = Depends(get_current_user)):
    now = utc_now().isoformat()
    return HandshakeResponse(
        server_time=now,
        schema_version=settings.SCHEMA_VERSION,
        model_version=settings.MODEL_VERSION,
        firmware_version=settings.FIRMWARE_VERSION,
        # Opaque start-of-stream cursor. The client must not synthesise one
        # from its own clock — server time is authoritative.
        cursor="",
        thresholds_hash=compute_thresholds_hash(),
    )


@router.post("/push", response_model=SyncPushResponse)
@limiter.limit("120/minute")
async def sync_push(
    request: Request,
    body: SyncPushBody,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key", max_length=128),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now_str = utc_now().isoformat()

    if idempotency_key:
        cached = await idempotency_store.get(current_user.id, idempotency_key)
        if cached is not None:
            return SyncPushResponse(results=cached["results"], server_time=now_str)

    # Authorise every distinct farm_id in the batch BEFORE touching the DB.
    for farm_id in {r.farm_id for r in body.records}:
        await assert_farm_access(
            db, current_user, farm_id, action="write", entity="sync", request=request
        )

    results = await SyncEngine.push_batch(
        db=db, records=[r.model_dump() for r in body.records]
    )

    if idempotency_key:
        await idempotency_store.put(
            current_user.id, idempotency_key, {"results": results}
        )

    return SyncPushResponse(results=results, server_time=now_str)


@router.get("/pull", response_model=SyncPullResponse)
@limiter.limit("120/minute")
async def sync_pull(
    request: Request,
    cursor: Optional[str] = Query(None, max_length=128),
    limit: int = Query(200, ge=1, le=500),
    farm_id: Optional[str] = Query(None, max_length=36),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_farm_id = farm_id or current_user.farm_id
    if not target_farm_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No farm is associated with this account.",
        )

    # The check that was missing entirely.
    await assert_farm_access(
        db, current_user, target_farm_id, action="read", entity="sync", request=request
    )

    records, next_cursor, has_more = await SyncEngine.pull_deltas(
        db=db, farm_id=target_farm_id, cursor=cursor, limit=limit
    )
    return SyncPullResponse(
        records=records,
        cursor=next_cursor,
        has_more=has_more,
        server_time=utc_now().isoformat(),
    )
