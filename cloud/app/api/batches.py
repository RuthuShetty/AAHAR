"""
AAHAR Batches & QR Traceability API
Supports Journey C: feed mill declared profile vs on-farm measured results and dispute logging.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.database import get_db
from cloud.app.auth import get_current_user, require_roles
from cloud.app.models.entities import Batch, User, utc_now
from cloud.app.rate_limit import limiter
from cloud.app.tenancy import assert_farm_access

router = APIRouter(prefix="/batches", tags=["batches"])


class BatchCreateRequest(BaseModel):
    mill_id: str
    mill_name: str
    feed_type: str
    batch_number: str
    manufactured_date: str
    expiry_date: str
    declared_profile: Dict[str, Any] = Field(
        ...,
        json_schema_extra={
            "example": {
                "crude_protein_pct": 22.0,
                "moisture_pct_max": 12.0,
                "crude_fat_pct": 4.0,
                "crude_fibre_pct_max": 10.0,
            }
        },
    )


class DisputeCreateRequest(BaseModel):
    measurement_id: str
    farm_id: str
    measured_cp: float
    reason: str = Field(..., json_schema_extra={"example": "Crude protein measured at 17.5% vs declared 22.0%"})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_batch(
    req: BatchCreateRequest,
    current_user: User = Depends(require_roles("mill_qc", "admin")),
    db: AsyncSession = Depends(get_db),
):
    # A declared profile is a claim made BY a mill ABOUT its own product. The
    # mill identity therefore comes from the authenticated principal, never
    # from the request body.
    if current_user.role == "mill_qc" and not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not linked to a registered feed mill.",
        )
    batch_id = str(uuid.uuid4())
    # Generate unique QR slug
    qr_code = f"AAHAR-QR-{req.batch_number}-{batch_id[:8].upper()}"

    batch = Batch(
        id=batch_id,
        qr_code=qr_code,
        mill_id=current_user.org_id or current_user.id,
        mill_name=req.mill_name,
        feed_type=req.feed_type,
        batch_number=req.batch_number,
        manufactured_date=req.manufactured_date,
        expiry_date=req.expiry_date,
        declared_profile=req.declared_profile,
        actual_measurements=[],
        disputes=[],
        created_at=utc_now(),
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    return {
        "id": batch.id,
        "qr_code": batch.qr_code,
        "mill_name": batch.mill_name,
        "feed_type": batch.feed_type,
        "declared_profile": batch.declared_profile,
        "created_at": batch.created_at.isoformat(),
    }


@router.get("/{qr_code}")
async def get_batch_by_qr(qr_code: str, db: AsyncSession = Depends(get_db)):
    query = select(Batch).filter_by(qr_code=qr_code)
    res = await db.execute(query)
    batch = res.scalar_one_or_none()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with QR {qr_code} not found",
        )

    # Compute comparison summary
    declared_cp = batch.declared_profile.get("crude_protein_pct", 0.0)
    actual_tests = batch.actual_measurements or []
    avg_measured_cp = None
    if actual_tests:
        total_cp = sum(t.get("crude_protein", 0.0) for t in actual_tests)
        avg_measured_cp = round(total_cp / len(actual_tests), 2)

    return {
        "id": batch.id,
        "qr_code": batch.qr_code,
        "mill_name": batch.mill_name,
        "feed_type": batch.feed_type,
        "batch_number": batch.batch_number,
        "manufactured_date": batch.manufactured_date,
        "expiry_date": batch.expiry_date,
        "declared_profile": batch.declared_profile,
        "test_count": len(actual_tests),
        "average_measured_cp": avg_measured_cp,
        "dispute_count": len(batch.disputes or []),
        "disputes": batch.disputes or [],
    }


@router.post("/{qr_code}/dispute", status_code=status.HTTP_201_CREATED)
@limiter.limit("30/hour")
async def log_dispute(
    request: Request,
    qr_code: str,
    req: DisputeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # farm_id was previously taken from the body unchecked, so any account
    # could file a dispute in another farmer's name.
    await assert_farm_access(
        db, current_user, req.farm_id, action="write", entity="dispute", request=request
    )

    query = select(Batch).filter_by(qr_code=qr_code).with_for_update()
    res = await db.execute(query)
    batch = res.scalar_one_or_none()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with QR {qr_code} not found",
        )

    disputes = list(batch.disputes or [])
    dispute_record = {
        "id": str(uuid.uuid4()),
        "measurement_id": req.measurement_id,
        "farm_id": req.farm_id,
        "farmer_name": current_user.name or "Farmer",
        "raised_by_user_id": current_user.id,
        "measured_cp": req.measured_cp,
        "declared_cp": batch.declared_profile.get("crude_protein_pct"),
        "reason": req.reason,
        "logged_at": utc_now().isoformat(),
        "status": "OPEN",
    }
    disputes.append(dispute_record)
    batch.disputes = disputes

    await db.commit()

    return {
        "status": "dispute_logged",
        "dispute": dispute_record,
    }
