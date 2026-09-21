"""
Tests for AAHAR Sync Engine & Conflict Resolution
"""
import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from cloud.app.sync.engine import compute_hash


@pytest.mark.asyncio
async def test_sync_handshake(client: AsyncClient, seed_data: dict):
    res = await client.get("/sync/handshake", headers=seed_data["headers"])
    assert res.status_code == 200
    data = res.json()
    assert "server_time" in data
    assert data["schema_version"] == 3
    assert "nir-proximate-v1" in data["model_version"]
    assert "thresholds_hash" in data
    assert len(data["thresholds_hash"]) == 64


@pytest.mark.asyncio
async def test_sync_push_measurement_and_duplicate(client: AsyncClient, seed_data: dict):
    farm_id = seed_data["farm_id"]
    rec_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    payload = {
        "feed_type": "MAIZE_SILAGE",
        "sample_temperature_c": 26.5,
        "proximates": {
            "moisture": {"value": 65.2, "ci_low": 64.0, "ci_high": 66.4, "confidence": 0.95, "unit": "percent"},
            "crude_protein": {"value": 8.5, "ci_low": 7.8, "ci_high": 9.2, "confidence": 0.92, "unit": "percent_dm"},
        },
        "safety": {
            "urea_pct": {"value": 0.0, "ci_low": 0.0, "ci_high": 0.1, "confidence": 0.98, "unit": "percent_ww"},
            "aflatoxin_b1_risk": "LOW",
        },
        "derived": {"me_mj_per_kg": {"value": 10.2, "ci_low": 9.8, "ci_high": 10.6, "confidence": 0.91, "unit": "mj_per_kg_dm"}},
        "grade": "A",
        "in_distribution": True,
    }

    envelope = {
        "id": rec_id,
        "entity": "measurement",
        "schema_version": 3,
        "farm_id": farm_id,
        "device_id": "AAHAR-P-004821",
        "captured_at": now,
        "clock": {"device": "AAHAR-P-004821", "counter": 101},
        "sync_state": "pending",
        "payload_hash": compute_hash(payload),
        "payload": payload,
    }

    # 1. First push: accepted
    push_res = await client.post(
        "/sync/push",
        headers={"Idempotency-Key": f"batch-{rec_id}", **seed_data["headers"]},
        json={"records": [envelope]},
    )
    assert push_res.status_code == 200
    push_data = push_res.json()
    assert len(push_data["results"]) == 1
    assert push_data["results"][0]["id"] == rec_id
    assert push_data["results"][0]["status"] == "accepted"

    # 2. Second push with same record: duplicate (idempotent)
    push_res2 = await client.post(
        "/sync/push",
        headers={"Idempotency-Key": f"batch-{rec_id}", **seed_data["headers"]},
        json={"records": [envelope]},
    )
    assert push_res2.status_code == 200
    # From cache or dedupe
    assert push_res2.json()["results"][0]["status"] in ("accepted", "duplicate")

    # 3. Third push without idempotency-key header: dedupe detected by sync engine
    push_res3 = await client.post(
        "/sync/push",
        headers=seed_data["headers"],
        json={"records": [envelope]},
    )
    assert push_res3.status_code == 200
    assert push_res3.json()["results"][0]["status"] == "duplicate"


@pytest.mark.asyncio
async def test_sync_field_level_lamport_clocks(client: AsyncClient, seed_data: dict):
    """
    Test ADR-002: Field-level Lamport clocks merge.
    Device A updates name at counter 10.
    Device B updates owner_phone at counter 12.
    Both changes MUST survive!
    """
    farm_id = seed_data["farm_id"]
    now = datetime.now(timezone.utc).isoformat()

    # Device A payload (updates name)
    payload_a = {
        "name": "Updated Name from DevA",
        "fields": {
            "name": {"device": "AAHAR-P-000001", "counter": 10},
        },
    }
    env_a = {
        "id": farm_id,
        "entity": "farm",
        "schema_version": 2,
        "farm_id": farm_id,
        "device_id": "AAHAR-P-000001",
        "captured_at": now,
        "clock": {"device": "AAHAR-P-000001", "counter": 10},
        "sync_state": "pending",
        "payload_hash": compute_hash(payload_a),
        "payload": payload_a,
    }

    res_a = await client.post(
        "/sync/push",
        headers=seed_data["headers"],
        json={"records": [env_a]},
    )
    assert res_a.status_code == 200
    assert res_a.json()["results"][0]["status"] == "accepted"

    # Device B payload (updates owner_phone, does NOT know about DevA's name)
    payload_b = {
        "owner_phone": "+919876599999",
        "fields": {
            "owner_phone": {"device": "AAHAR-P-000002", "counter": 12},
        },
    }
    env_b = {
        "id": farm_id,
        "entity": "farm",
        "schema_version": 2,
        "farm_id": farm_id,
        "device_id": "AAHAR-P-000002",
        "captured_at": now,
        "clock": {"device": "AAHAR-P-000002", "counter": 12},
        "sync_state": "pending",
        "payload_hash": compute_hash(payload_b),
        "payload": payload_b,
    }

    res_b = await client.post(
        "/sync/push",
        headers=seed_data["headers"],
        json={"records": [env_b]},
    )
    assert res_b.status_code == 200

    # Verify both changes survived on server by pulling farm deltas
    pull_res = await client.get(
        f"/sync/pull?farm_id={farm_id}&limit=50",
        headers=seed_data["headers"],
    )
    assert pull_res.status_code == 200
    records = pull_res.json()["records"]
    farm_records = [r for r in records if r["entity"] == "farm"]
    assert len(farm_records) > 0
    latest_farm = farm_records[-1]["payload"]

    # Verify both fields survived!
    assert latest_farm.get("name") == "Updated Name from DevA"
    assert latest_farm.get("owner_phone") == "+919876599999"


@pytest.mark.asyncio
async def test_sync_pull_pagination(client: AsyncClient, seed_data: dict):
    farm_id = seed_data["farm_id"]
    # Pull initial batch
    res = await client.get(
        f"/sync/pull?farm_id={farm_id}&limit=2",
        headers=seed_data["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert "records" in data
    assert "cursor" in data
    assert "has_more" in data
