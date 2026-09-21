"""OTP and token hardening regression tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_otp_response_never_contains_the_code(client: AsyncClient):
    response = await client.post("/auth/otp/request", json={"phone": "+919876543211"})
    assert response.status_code == 202
    body = response.json()
    assert "dev_code" not in body and "code" not in body, body


@pytest.mark.asyncio
async def test_otp_is_not_stored_in_plaintext(client, db_session):
    from sqlalchemy import select
    from cloud.app.models.entities import OTPVerification

    await client.post("/auth/otp/request", json={"phone": "+919876543212"})
    record = (await db_session.execute(
        select(OTPVerification).filter_by(phone="+919876543212")
    )).scalars().first()
    assert record is not None
    assert not hasattr(record, "code") or getattr(record, "code", None) is None
    assert len(record.code_hash) == 64


@pytest.mark.asyncio
async def test_wrong_otp_is_rejected_and_attempts_are_capped(client, db_session):
    from sqlalchemy import select
    from cloud.app.models.entities import OTPVerification

    phone = "+919876543213"
    await client.post("/auth/otp/request", json={"phone": phone})

    statuses = []
    for _ in range(8):
        r = await client.post(
            "/auth/otp/verify", json={"phone": phone, "code": "000000"}
        )
        statuses.append(r.status_code)

    assert 400 in statuses, statuses
    assert 429 in statuses, f"brute force was never throttled: {statuses}"

    record = (await db_session.execute(
        select(OTPVerification).filter_by(phone=phone)
    )).scalars().first()
    assert record.consumed is True


@pytest.mark.asyncio
async def test_otp_request_is_rate_limited(client: AsyncClient):
    phone = "+919876543214"
    codes = [
        (await client.post("/auth/otp/request", json={"phone": phone})).status_code
        for _ in range(4)
    ]
    assert 429 in codes, f"no cooldown between OTP requests: {codes}"


@pytest.mark.asyncio
async def test_refresh_token_is_single_use(client, seed_data):
    """Rotation: a refresh token must not be replayable."""
    from cloud.app.auth import create_refresh_token

    token, _jti = create_refresh_token(data={"sub": seed_data["user_id"]})

    first = await client.post("/auth/refresh", json={"refresh_token": token})
    assert first.status_code == 200, first.text

    replay = await client.post("/auth/refresh", json={"refresh_token": token})
    assert replay.status_code == 401, "revoked refresh token was accepted again"


@pytest.mark.asyncio
async def test_access_token_cannot_be_used_as_refresh_token(client, seed_data):
    response = await client.post(
        "/auth/refresh", json={"refresh_token": seed_data["token"]}
    )
    assert response.status_code == 401
