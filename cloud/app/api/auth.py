"""
AAHAR Auth API — OTP request, OTP verify, token refresh, logout.

Hardening applied over the previous implementation:
  - OTP is CSPRNG-generated and stored as a salted HMAC, never plaintext.
  - The code is never returned in the HTTP response. In DEV_MODE it is
    written to the server log only.
  - Per-phone request throttling (cooldown + hourly cap) blocks SMS bombing.
  - Per-OTP attempt counter blocks brute force of the 10^6 code space.
  - Verifying consumes the OTP and invalidates every other outstanding OTP
    for that phone.
  - Refresh tokens rotate and the presented token is revoked.
  - Responses are uniform on failure so the endpoint cannot be used to
    enumerate which phone numbers are registered.
"""
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.auth import (
    assert_not_revoked,
    create_access_token,
    create_refresh_token,
    generate_otp_code,
    get_current_user,
    hash_otp,
    revoke_token,
    verify_otp_hash,
    verify_token,
)
from cloud.app.config import settings
from cloud.app.database import get_db
from cloud.app.models.entities import Farm, OTPVerification, User, utc_now
from cloud.app.rate_limit import limiter

logger = logging.getLogger("aahar.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

PHONE_REGEX = re.compile(r"^\+91[6-9][0-9]{9}$")
GENERIC_OTP_ERROR = "Invalid or expired verification code."


def _mask(phone: str) -> str:
    """Never log a full phone number."""
    return f"{phone[:3]}*****{phone[-3:]}" if len(phone) >= 6 else "*****"


class OTPRequest(BaseModel):
    phone: str = Field(..., max_length=16)
    language: str = Field("hi", max_length=5)

    @field_validator("phone")
    @classmethod
    def _valid_phone(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_REGEX.match(v):
            raise ValueError(
                "Invalid Indian phone number. Expected +91 followed by 10 digits starting 6-9."
            )
        return v


class OTPVerifyRequest(BaseModel):
    phone: str = Field(..., max_length=16)
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^[0-9]{6}$")
    farm_name: Optional[str] = Field(None, max_length=120)

    @field_validator("phone")
    @classmethod
    def _valid_phone(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_REGEX.match(v):
            raise ValueError("Invalid Indian phone number.")
        return v


class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(..., max_length=4096)


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


@router.post("/otp/request", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/hour")
async def request_otp(request: Request, req: OTPRequest, db: AsyncSession = Depends(get_db)):
    phone = req.phone
    now = datetime.now(timezone.utc)

    # Cooldown: reject a second request inside the cooldown window.
    recent_q = select(OTPVerification).filter(
        OTPVerification.phone == phone,
        OTPVerification.created_at
        > now - timedelta(seconds=settings.OTP_REQUEST_COOLDOWN_SECONDS),
    )
    if (await db.execute(recent_q)).scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {settings.OTP_REQUEST_COOLDOWN_SECONDS}s before requesting another code.",
        )

    # Hourly cap per phone number.
    hour_count_q = select(func.count()).select_from(OTPVerification).filter(
        OTPVerification.phone == phone,
        OTPVerification.created_at > now - timedelta(hours=1),
    )
    if (await db.execute(hour_count_q)).scalar_one() >= settings.OTP_MAX_REQUESTS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification codes requested. Try again in an hour.",
        )

    # Invalidate outstanding codes so only the newest one is usable.
    await db.execute(
        update(OTPVerification)
        .where(OTPVerification.phone == phone, OTPVerification.consumed.is_(False))
        .values(consumed=True)
    )

    code = generate_otp_code()
    db.add(
        OTPVerification(
            phone=phone,
            code_hash=hash_otp(phone, code),
            expires_at=now + timedelta(seconds=settings.OTP_EXPIRY_SECONDS),
            verified=False,
            consumed=False,
            attempts=0,
            created_at=now,
        )
    )
    await db.commit()

    if settings.DEV_MODE:
        # Development convenience only. Never part of the HTTP response.
        logger.warning("DEV_MODE OTP for %s is %s", _mask(phone), code)
    else:
        # TODO(integration): dispatch via the SMS gateway. Until a provider is
        # wired up, non-dev deployments cannot deliver codes — see README.
        logger.info("OTP issued for %s (delivery pending SMS provider)", _mask(phone))

    return {
        "status": "accepted",
        "message": "If this number is eligible, a verification code has been sent.",
        "expires_in_seconds": settings.OTP_EXPIRY_SECONDS,
    }


@router.post("/otp/verify", response_model=AuthResponse)
@limiter.limit("10/hour")
async def verify_otp(request: Request, req: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    phone, code = req.phone, req.code
    now = datetime.now(timezone.utc)

    q = (
        select(OTPVerification)
        .filter(
            OTPVerification.phone == phone,
            OTPVerification.consumed.is_(False),
            OTPVerification.verified.is_(False),
        )
        .order_by(OTPVerification.created_at.desc())
        .limit(1)
        .with_for_update()
    )
    otp_record = (await db.execute(q)).scalars().first()

    if otp_record is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_OTP_ERROR)

    expires_at = otp_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        otp_record.consumed = True
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_OTP_ERROR)

    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp_record.consumed = True
        await db.commit()
        logger.warning("OTP attempt limit reached for %s", _mask(phone))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Request a new code.",
        )

    if not verify_otp_hash(phone, code, otp_record.code_hash):
        otp_record.attempts += 1
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_OTP_ERROR)

    otp_record.verified = True
    otp_record.consumed = True

    user = (await db.execute(select(User).filter_by(phone=phone))).scalars().first()
    if user is None:
        farm_id = str(uuid.uuid4())
        db.add(
            Farm(
                id=farm_id,
                name=req.farm_name or f"Farm {phone[-4:]}",
                contact_phone=phone,
                created_at=now,
                updated_at=now,
            )
        )
        user = User(
            id=str(uuid.uuid4()),
            phone=phone,
            name=req.farm_name or "Farmer",
            role="farmer",  # Elevated roles are assigned out of band, never self-served.
            farm_id=farm_id,
            created_at=now,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)
    return _issue_tokens(user)


@router.post("/refresh", response_model=AuthResponse)
@limiter.limit("60/hour")
async def refresh_token(
    request: Request, req: TokenRefreshRequest, db: AsyncSession = Depends(get_db)
):
    payload = verify_token(req.refresh_token, expected_type="refresh")
    await assert_not_revoked(db, payload.get("jti"))

    user = await db.get(User, payload.get("sub") or "")
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found"
        )

    # Rotate: the presented refresh token is single-use.
    await revoke_token(
        db,
        jti=payload["jti"],
        expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        reason="rotated",
    )
    await db.commit()
    return _issue_tokens(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(req: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    """Revoke a refresh token so it cannot be used again."""
    payload = verify_token(req.refresh_token, expected_type="refresh")
    await revoke_token(
        db,
        jti=payload["jti"],
        expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        reason="logout",
    )
    await db.commit()


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "phone": user.phone,
        "name": user.name,
        "role": user.role,
        "org_id": user.org_id,
        "farm_id": user.farm_id,
        "is_active": user.is_active,
    }


def _issue_tokens(user: User) -> AuthResponse:
    claims = {
        "sub": user.id,
        "role": user.role,
        "farm_id": user.farm_id,
        "org_id": user.org_id,
    }
    access = create_access_token(data=claims)
    refresh, _jti = create_refresh_token(data={"sub": user.id})
    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user.id,
            "phone": user.phone,
            "name": user.name,
            "role": user.role,
            "org_id": user.org_id,
            "farm_id": user.farm_id,
        },
    )
