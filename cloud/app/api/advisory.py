"""
AAHAR Advisory API
Authoritative server-side advisory calculation and recomputation.
"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.database import get_db
from cloud.app.advisory.engine import AdvisoryEngine

router = APIRouter(prefix="/advisory", tags=["advisory"])


class AdvisoryRecomputeRequest(BaseModel):
    proximates: Dict[str, Any] = Field(..., description="Moisture, CP, ADF, NDF, etc.")
    safety: Dict[str, Any] = Field(..., description="Urea, silica, aflatoxin, etc.")
    derived: Optional[Dict[str, Any]] = None
    feed_type: str = Field("CONCENTRATE_MIX", json_schema_extra={"example": "MUSTARD_CAKE"})
    market_price_per_kg: float = Field(24.0, json_schema_extra={"example": 28.0})
    herd_profile: Optional[Dict[str, Any]] = None


@router.post("/recompute")
async def recompute_advisory(req: AdvisoryRecomputeRequest):
    result = AdvisoryEngine.compute_advisory(
        proximates=req.proximates,
        safety=req.safety,
        derived=req.derived,
        feed_type=req.feed_type,
        market_price_per_kg=req.market_price_per_kg,
        herd_profile=req.herd_profile,
    )
    return result
