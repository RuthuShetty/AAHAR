import uuid
import pytest
from httpx import AsyncClient
from cloud.app.auth import create_access_token


from sqlalchemy.ext.asyncio import AsyncSession
from cloud.app.models.entities import User


@pytest.mark.asyncio
async def test_batch_lifecycle_and_dispute(client: AsyncClient, seed_data: dict, db_session: AsyncSession):
    # 1. Feed mill registers a batch (requires mill_qc role in db)
    mill_id = str(uuid.uuid4())
    mill_phone = f"+9199{uuid.uuid4().hex[:8]}"
    mill_user = User(
        id=mill_id,
        phone=mill_phone,
        role="mill_qc",
        org_id="MILL-PUNJAB-001",
        name="Mill QC Manager",
        is_active=True,
    )
    db_session.add(mill_user)
    await db_session.commit()

    mill_token = create_access_token({"sub": mill_user.id, "role": "mill_qc", "phone": mill_user.phone})
    mill_headers = {"Authorization": f"Bearer {mill_token}"}
    batch_payload = {
        "mill_id": "MILL-PUNJAB-001",
        "mill_name": "Doaba Cattle Feeds Ltd.",
        "feed_type": "CONCENTRATE_MIX",
        "batch_number": "BATCH-2026-09-001",
        "manufactured_date": "2026-09-10",
        "expiry_date": "2026-12-10",
        "declared_profile": {
            "crude_protein_pct": 22.0,
            "moisture_pct_max": 11.0,
            "crude_fat_pct": 4.5,
        },
    }
    create_res = await client.post("/batches", json=batch_payload, headers=mill_headers)
    assert create_res.status_code == 201
    batch_data = create_res.json()
    qr_code = batch_data["qr_code"]
    assert "AAHAR-QR-BATCH-2026-09-001" in qr_code

    # 2. Farmer scans the QR code at purchase
    get_res = await client.get(f"/batches/{qr_code}", headers=seed_data["headers"])
    assert get_res.status_code == 200
    details = get_res.json()
    assert details["mill_name"] == "Doaba Cattle Feeds Ltd."
    assert details["declared_profile"]["crude_protein_pct"] == 22.0
    assert details["dispute_count"] == 0

    # 3. Farmer scans the feed and finds crude protein is only 16.5% vs declared 22.0% -> logs dispute
    dispute_payload = {
        "measurement_id": "test-meas-1234",
        "farm_id": seed_data["farm_id"],
        "measured_cp": 16.5,
        "reason": "Measured CP 16.5% vs declared 22.0%. High protein deficit.",
    }
    disp_res = await client.post(
        f"/batches/{qr_code}/dispute",
        headers=seed_data["headers"],
        json=dispute_payload,
    )
    assert disp_res.status_code == 201
    assert disp_res.json()["status"] == "dispute_logged"

    # 4. Mill / FPO inspector views batch again and sees dispute
    get_res2 = await client.get(f"/batches/{qr_code}", headers=mill_headers)
    assert get_res2.status_code == 200
    assert get_res2.json()["dispute_count"] == 1
    assert get_res2.json()["disputes"][0]["measured_cp"] == 16.5
