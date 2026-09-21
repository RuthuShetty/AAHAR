"""
Tests for AAHAR authentication.

REWRITTEN. The previous file asserted the vulnerability as if it were the
specification:

    assert data["dev_code"] == "123456"

and drove every other case through the hardcoded development OTP. Those
assertions were deleted rather than updated -- they encoded the bug. The
behaviour they covered is now tested in test_auth_hardening.py against the
secure flow, plus test_authz_tenancy.py for access control.
"""
import pytest
from httpx import AsyncClient

from cloud.app.auth import hash_otp


async def _login(client: AsyncClient, db_session, phone: str, farm_name=None):
    """Complete a real OTP login by reading the hash target from the DB."""
    from sqlalchemy import select
    from cloud.app.models.entities import OTPVerification

    await client.post("/auth/otp/request", json={"phone": phone})
    record = (await db_session.execute(
        select(OTPVerification).filter_by(phone=phone)
        .order_by(OTPVerification.created_at.desc())
    )).scalars().first()
    assert record is not None

    # The plaintext code is never persisted, so recover it the only way an
    # honest test can: brute force the 6-digit space against the stored HMAC.
    code = next(
        c for c in (f"{i:06d}" for i in range(1_000_000))
        if hash_otp(phone, c) == record.code_hash
    )
    body = {"phone": phone, "code": code}
    if farm_name:
        body["farm_name"] = farm_name
    return await client.post("/auth/otp/verify", json=body)


@pytest.mark.asyncio
async def test_otp_request_invalid_phone(client: AsyncClient):
    response = await client.post("/auth/otp/request", json={"phone": "1234567890"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_full_login_issues_usable_tokens(client, db_session):
    response = await _login(client, db_session, "+919123456780", "Doaba Dairy Farm")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["access_token"] and data["refresh_token"]
    assert data["user"]["farm_id"]

    me = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["phone"] == "+919123456780"


@pytest.mark.asyncio
async def test_new_user_is_always_created_as_farmer(client, db_session):
    """Role escalation must not be self-served through registration."""
    response = await _login(client, db_session, "+919123456781")
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "farmer"
