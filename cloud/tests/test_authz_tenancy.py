"""
Authorization regression tests.

Every case here failed against the pre-audit code:
  - anonymous requests were served (DEV_MODE returned a hardcoded user)
  - GET /sync/pull?farm_id=<victim> returned another tenant's records
  - POST /sync/push wrote into any farm_id named in the envelope
  - POST /batches was unauthenticated with a client-asserted mill_id
  - media part upload / complete / download had no auth at all
"""
import uuid

import pytest
from httpx import AsyncClient

ANON_PROTECTED = [
    ("GET", "/auth/me"),
    ("GET", "/sync/handshake"),
    ("GET", "/sync/pull"),
    ("POST", "/sync/push"),
    ("POST", "/media/upload/init"),
    ("GET", "/media/00000000-0000-0000-0000-000000000000"),
    ("GET", "/models/manifest"),
    ("GET", "/firmware/manifest"),
    ("POST", "/batches"),
]


@pytest.mark.parametrize("method,path", ANON_PROTECTED)
@pytest.mark.asyncio
async def test_anonymous_request_is_rejected(client: AsyncClient, method: str, path: str):
    response = await client.request(method, path, json={} if method == "POST" else None)
    assert response.status_code in (401, 403), (
        f"{method} {path} served an anonymous caller with {response.status_code}"
    )


@pytest.mark.asyncio
async def test_invalid_and_malformed_tokens_rejected(client: AsyncClient):
    for header in [
        {"Authorization": "Bearer not-a-jwt"},
        {"Authorization": "Bearer "},
        {"Authorization": "Basic YWRtaW46YWRtaW4="},
        {"Authorization": "eyJhbGciOiJub25lIn0.e30."},
    ]:
        response = await client.get("/auth/me", headers=header)
        assert response.status_code == 401, header


@pytest.mark.asyncio
async def test_cannot_pull_another_farms_records(client, seed_data, second_farm):
    """The IDOR: farm_id was taken from the query string with no check."""
    response = await client.get(
        "/sync/pull",
        params={"farm_id": seed_data["farm_id"]},
        headers=second_farm["headers"],
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_can_pull_own_farm(client, seed_data):
    response = await client.get("/sync/pull", headers=seed_data["headers"])
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_cannot_push_into_another_farm(client, seed_data, second_farm):
    envelope = {
        "id": str(uuid.uuid4()),
        "entity": "measurement",
        "schema_version": 3,
        "farm_id": seed_data["farm_id"],          # victim's farm
        "device_id": "ATTACKER-01",
        "captured_at": "2026-09-18T07:00:00+00:00",
        "clock": {"device": "ATTACKER-01", "counter": 1},
        "payload_hash": "0" * 64,
        "payload": {"feed_type": "OTHER"},
    }
    response = await client.post(
        "/sync/push", json={"records": [envelope]}, headers=second_farm["headers"]
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_farmer_cannot_create_a_batch(client, seed_data):
    """Mill declarations require a mill_qc/admin role, not any logged-in user."""
    response = await client.post(
        "/batches",
        headers=seed_data["headers"],
        json={
            "mill_id": "forged", "mill_name": "Forged Mill", "feed_type": "CONCENTRATE",
            "batch_number": "B-1", "manufactured_date": "2026-09-01",
            "expiry_date": "2027-09-01",
            "declared_profile": {"crude_protein_pct": 22.0},
        },
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_cannot_delete_another_farms_data(client, seed_data, second_farm):
    response = await client.delete(
        f"/farms/{seed_data['farm_id']}/data", headers=second_farm["headers"]
    )
    assert response.status_code == 403, response.text
