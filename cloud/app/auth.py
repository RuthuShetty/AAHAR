"""
AAHAR Authentication & JWT Service

Phone-number OTP authentication with JWT access + refresh tokens.

Security notes:
  - There is NO unauthenticated fallback. A missing or invalid token is
    always a 401, in every environment.
  - OTP codes are generated with `secrets` (CSPRNG) and stored only as a
    salted hash. The plaintext code never touches the database.
  - Refresh tokens are single-use: each refresh rotates the token and
    revokes the presented one (jti denylist), so replay is detectable.
"""
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.config import settings
from cloud.app.database import get_db
from cloud.app.models.entities import RevokedToken, User, utc_now

bearer_scheme = HTTPBearer(auto_error=False)

OTP_ALPHABET_SIZE = 10
OTP_LENGTH = 6


# ── OTP helpers ─────────────────────────────────────────────────────────────

def generate_otp_code() -> str:
    """Cryptographically secure 6-digit OTP. Never `random.randint`."""
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


def hash_otp(phone: str, code: str) -> str:
    """
    Salted HMAC of the OTP, bound to the phone number so a hash captured for
    one number cannot be replayed against another.
    """
    return hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        f"{phone}:{code}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_otp_hash(phone: str, code: str, stored_hash: str) -> bool:
    """Constant-time comparison to avoid leaking the code via timing."""
    return hmac.compare_digest(hash_otp(phone, code), stored_hash)


# ── JWT ─────────────────────────────────────────────────────────────────────

def _encode(data: dict, token_type: str, expires_delta: timedelta) -> tuple[str, str]:
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    to_encode = {
        **data,
        "iat": now,
        "nbf": now,
        "exp": now + expires_delta,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "type": token_type,
        "jti": jti,
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM), jti


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token, _ = _encode(data, "access", delta)
    return token


def create_refresh_token(data: dict) -> tuple[str, str]:
    """Returns (token, jti). The jti is needed to revoke it on rotation."""
    return _encode(data, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def verify_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def assert_not_revoked(db: AsyncSession, jti: Optional[str]) -> None:
    if not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing jti claim"
        )
    revoked = await db.get(RevokedToken, jti)
    if revoked is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked"
        )


async def revoke_token(db: AsyncSession, jti: str, expires_at: datetime, reason: str) -> None:
    if await db.get(RevokedToken, jti) is None:
        db.add(RevokedToken(jti=jti, expires_at=expires_at, reason=reason, revoked_at=utc_now()))


# ── Current user ────────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Resolve the authenticated user.

    There is deliberately no DEV_MODE branch here. The previous
    implementation returned a hard-coded user when no token was supplied,
    which made every endpoint in the service publicly writable.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials, expected_type="access")
    await assert_not_revoked(db, payload.get("jti"))

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject claim"
        )

    result = await db.execute(select(User).filter_by(id=user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
    return user


def require_roles(*allowed_roles: str):
    """Dependency factory enforcing a role allow-list on an endpoint."""

    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account role is not permitted to perform this action.",
            )
        return current_user

    return _check
