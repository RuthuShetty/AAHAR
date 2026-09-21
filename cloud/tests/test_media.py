import hashlib
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_resumable_media_upload(client: AsyncClient, seed_data: dict):
    part_bytes = b"AAHAR_RAW_SPECTRUM_CHUNK_PART_1"
    content_hash = hashlib.sha256(part_bytes).hexdigest()

    # 1. Initialize upload session
    init_payload = {
        "file_name": "raw_spectrum_001.bin",
        "file_type": "application/octet-stream",
        "total_size_bytes": len(part_bytes),
        "content_hash": content_hash,
        "media_category": "spectrum",
        "farm_id": seed_data["farm_id"],
    }
    init_res = await client.post(
        "/media/upload/init",
        headers=seed_data["headers"],
        json=init_payload,
    )
    assert init_res.status_code == 201
    upload_id = init_res.json()["upload_id"]

    # 2. Upload part 1
    part_res = await client.put(
        f"/media/upload/{upload_id}/part?part_number=1",
        content=part_bytes,
        headers={**seed_data["headers"], "Content-Type": "application/octet-stream"},
    )
    assert part_res.status_code == 200
    assert part_res.json()["bytes_received"] == len(part_bytes)

    # 3. Complete upload
    comp_res = await client.post(
        f"/media/upload/{upload_id}/complete",
        headers=seed_data["headers"],
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"

    # 4. Fetch uploaded media
    get_res = await client.get(
        f"/media/{upload_id}",
        headers=seed_data["headers"],
    )
    assert get_res.status_code == 200
    assert get_res.content == part_bytes
