"""
AAHAR Farm Analytics & DPDP Act 2023 Endpoints
Provides quality trends, supplier scoring, and compliance exports.
"""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.database import get_db
from cloud.app.auth import get_current_user
from cloud.app.security import require_farm_read, require_farm_write, log_audit_event
from cloud.app.models.entities import Farm, Measurement, Bunker, ProbeReading, User, utc_now

router = APIRouter(prefix="/farms", tags=["analytics"])


@router.get("/{farm_id}/analytics")
async def get_farm_analytics(
    farm_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Enforce RLS
    await require_farm_read(farm_id=farm_id, request=request, current_user=current_user, db=db)

    # Fetch measurements for this farm
    q = select(Measurement).filter(Measurement.farm_id == farm_id).order_by(Measurement.captured_at.desc())
    res = await db.execute(q)
    measurements = res.scalars().all()

    total_tests = len(measurements)
    grade_counts = {"A": 0, "B": 0, "C": 0, "REJECT": 0}
    feed_types: Dict[str, int] = {}
    adulteration_count = 0
    total_cp = 0.0

    recent_trends = []
    for m in measurements:
        grade = m.grade if m.grade in grade_counts else "C"
        grade_counts[grade] += 1
        feed_types[m.feed_type] = feed_types.get(m.feed_type, 0) + 1

        cp = m.proximates.get("crude_protein", {}).get("value", 0.0) if isinstance(m.proximates.get("crude_protein"), dict) else m.proximates.get("crude_protein", 0.0)
        total_cp += float(cp)

        if grade == "REJECT":
            adulteration_count += 1

        if len(recent_trends) < 20:
            recent_trends.append({
                "id": m.id,
                "feed_type": m.feed_type,
                "grade": m.grade,
                "crude_protein": cp,
                "captured_at": m.captured_at.isoformat(),
            })

    avg_cp = round(total_cp / max(1, total_tests), 2)
    adulteration_rate_pct = round((adulteration_count / max(1, total_tests)) * 100, 1)

    return {
        "farm_id": farm_id,
        "total_tests": total_tests,
        "average_crude_protein": avg_cp,
        "adulteration_rate_pct": adulteration_rate_pct,
        "grade_distribution": grade_counts,
        "feed_type_breakdown": feed_types,
        "recent_trends": recent_trends,
    }


@router.get("/{farm_id}/export")
async def export_farm_data(
    farm_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """DPDP Act 2023: Right to Data Portability. Exports all data associated with the farm."""
    await require_farm_read(farm_id=farm_id, request=request, current_user=current_user, db=db)

    farm = await db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")

    m_q = select(Measurement).filter_by(farm_id=farm_id)
    m_res = await db.execute(m_q)
    measurements = m_res.scalars().all()

    b_q = select(Bunker).filter_by(farm_id=farm_id)
    b_res = await db.execute(b_q)
    bunkers = b_res.scalars().all()

    export_payload = {
        "farm": {
            "id": farm.id,
            "name": farm.name,
            "village": farm.village,
            "district": farm.district,
            "state": farm.state,
            "pincode": farm.pin_code,
            "contact_phone": farm.contact_phone,
            "created_at": farm.created_at.isoformat(),
        },
        "measurements_count": len(measurements),
        "measurements": [
            {
                "id": m.id,
                "feed_type": m.feed_type,
                "grade": m.grade,
                "proximates": m.proximates,
                "safety": m.safety,
                "captured_at": m.captured_at.isoformat(),
            }
            for m in measurements
        ],
        "bunkers": [
            {
                "id": b.id,
                "name": b.name,
                "crop_type": b.crop_type,
                "bunker_type": b.bunker_type,
            }
            for b in bunkers
        ],
        "exported_at": utc_now().isoformat(),
        "dpdp_notice": "Full portable copy of personal and test data in accordance with DPDP Act 2023.",
    }

    await log_audit_event(
        db=db,
        actor=current_user,
        target_farm_id=farm_id,
        action="export",
        entity="farm",
        entity_id=farm_id,
        request=request,
    )

    return export_payload


@router.delete("/{farm_id}/data")
async def delete_farm_data(
    farm_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """DPDP Act 2023: Right to Erasure."""
    await require_farm_write(farm_id=farm_id, request=request, current_user=current_user, db=db)

    farm = await db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")

    await log_audit_event(
        db=db,
        actor=current_user,
        target_farm_id=farm_id,
        action="delete",
        entity="farm",
        entity_id=farm_id,
        request=request,
    )

    await db.delete(farm)
    await db.commit()

    return {
        "status": "deleted",
        "farm_id": farm_id,
        "message": "All records for this farm have been permanently erased per DPDP Act 2023 request.",
    }
