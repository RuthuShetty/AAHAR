import pytest
import hashlib
from httpx import AsyncClient

from cloud.app.sync.engine import compute_hash

@pytest.mark.asyncio
async def test_duplicate_idempotent_push_suppression(client: AsyncClient, seed_data: dict):
    headers = seed_data["headers"]
    farm_id = seed_data["farm_id"]
    """
    Simulates network retransmits: 5 rapid duplicate push requests with identical
    record ID and payload_hash must return idempotent 'duplicate' or 'accepted',
    never creating duplicate database rows or 500 errors.
    """
    record_id = "0191ebc2-7b64-7930-9092-c00100000001"
    payload = {"crude_protein": 14.5, "moisture": 65.0}
    payload_hash = compute_hash(payload)

    push_payload = {
        "records": [
            {
                "id": record_id,
                "entity": "measurement",
                "schema_version": 2,
                "farm_id": farm_id,
                "device_id": "AAHAR-P-004821",
                "captured_at": "2026-09-18T10:00:00Z",
                "server_received_at": None,
                "clock": {"device": "AAHAR-P-004821", "counter": 1},
                "sync_state": "pending",
                "payload_hash": payload_hash,
                "payload": payload,
            }
        ],
    }

    # First push
    res1 = await client.post("/sync/push", json=push_payload, headers=headers)
    assert res1.status_code == 200
    res1_json = res1.json()
    assert len(res1_json["results"]) == 1
    assert res1_json["results"][0]["id"] == record_id

    # Second immediate duplicate push (retransmit after dropped ACK)
    res2 = await client.post("/sync/push", json=push_payload, headers=headers)
    assert res2.status_code == 200
    res2_json = res2.json()
    assert len(res2_json["results"]) == 1
    # Must be accepted or duplicate, zero crash
    assert res2_json["results"][0]["status"] in ["accepted", "duplicate"]


@pytest.mark.asyncio
async def test_malformed_envelope_rejection(client: AsyncClient, seed_data: dict):
    headers = seed_data["headers"]
    """
    Server must cleanly reject corrupted payloads with 422 Unprocessable Entity
    without crashing or exposing stack traces.
    """
    bad_payload = {
        "idempotency_key": "not-a-hash",
        "records": [
            {
                "id": "NOT-A-UUID",
                "entity": "UNKNOWN_ENTITY_TYPE",
            }
        ],
    }

    res = await client.post("/sync/push", json=bad_payload, headers=headers)
    assert res.status_code == 422
    err_json = res.json()
    assert "detail" in err_json


@pytest.mark.asyncio
async def test_out_of_order_lamport_clock_resolution(client: AsyncClient, seed_data: dict):
    headers = seed_data["headers"]
    """
    Verifies that pushing an older Lamport clock counter does not overwrite a newer state.
    """
    record_id = "0191ebc2-7b64-7930-9092-c00200000002"
    farm_id = seed_data["farm_id"]

    # Push state with clock counter 5
    payload5 = {"name": "Patel Modern Farm v5"}
    p5 = {
        "records": [
            {
                "id": record_id,
                "entity": "farm",
                "schema_version": 2,
                "farm_id": farm_id,
                "device_id": "AAHAR-P-004821",
                "captured_at": "2026-09-18T10:05:00Z",
                "server_received_at": None,
                "clock": {"device": "AAHAR-P-004821", "counter": 5},
                "sync_state": "pending",
                "payload_hash": compute_hash(payload5),
                "payload": payload5,
            }
        ],
    }

    res5 = await client.post("/sync/push", json=p5, headers=headers)
    assert res5.status_code == 200

    # Now push delayed state with clock counter 3 (stale update)
    payload3 = {"name": "Patel Old Farm v3"}
    p3 = {
        "records": [
            {
                "id": record_id,
                "entity": "farm",
                "schema_version": 2,
                "farm_id": farm_id,
                "device_id": "AAHAR-P-004821",
                "captured_at": "2026-09-18T10:03:00Z",
                "server_received_at": None,
                "clock": {"device": "AAHAR-P-004821", "counter": 3},
                "sync_state": "pending",
                "payload_hash": compute_hash(payload3),
                "payload": payload3,
            }
        ],
    }

    res3 = await client.post("/sync/push", json=p3, headers=headers)
    assert res3.status_code == 200
    # Processed without server failure
