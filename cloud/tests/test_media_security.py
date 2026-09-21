"""Media upload security regression tests."""
import pytest

TRAVERSAL_NAMES = [
    "../../../../etc/cron.d/aahar",
    "../../../root/.ssh/authorized_keys",
    "..\\..\\..\\Windows\\System32\\evil.dll",
    "/etc/passwd",
    "....//....//etc/shadow",
    "spectrum\x00.png",
]


@pytest.mark.parametrize("name", TRAVERSAL_NAMES)
def test_filenames_are_flattened(name):
    from cloud.app.api.media import sanitize_filename

    safe = sanitize_filename(name)
    assert "/" not in safe and "\\" not in safe
    assert ".." not in safe
    assert "\x00" not in safe


@pytest.mark.parametrize("segment", ["../../etc", "..", "/etc"])
def test_paths_cannot_escape_the_storage_root(tmp_path, segment):
    from fastapi import HTTPException
    from cloud.app.api.media import resolve_within

    with pytest.raises(HTTPException):
        resolve_within(tmp_path, segment, "x.bin")


@pytest.mark.asyncio
async def test_upload_init_rejects_oversized_declaration(client, seed_data):
    response = await client.post(
        "/media/upload/init",
        headers=seed_data["headers"],
        json={
            "file_name": "big.bin",
            "file_type": "application/octet-stream",
            "total_size_bytes": 10 * 1024 * 1024 * 1024,
            "content_hash": "a" * 64,
            "media_category": "spectrum",
            "farm_id": seed_data["farm_id"],
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_init_rejects_foreign_farm(client, seed_data, second_farm):
    response = await client.post(
        "/media/upload/init",
        headers=second_farm["headers"],
        json={
            "file_name": "s.bin",
            "file_type": "application/octet-stream",
            "total_size_bytes": 1024,
            "content_hash": "b" * 64,
            "media_category": "spectrum",
            "farm_id": seed_data["farm_id"],
        },
    )
    assert response.status_code == 403
