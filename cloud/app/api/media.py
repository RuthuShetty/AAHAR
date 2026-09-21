"""
AAHAR Media & Raw Spectra Upload API — resumable chunked upload.

The previous implementation had, in ~150 lines:
  - No authentication on PUT part, POST complete, or GET media. Anyone on the
    network could upload arbitrary bytes and download anyone's raw spectra.
  - Arbitrary file write: the final path was built from the client-supplied
    `file_name` with no sanitisation, so "../../../etc/cron.d/x" escaped the
    upload directory.
  - No size limits anywhere; `await request.body()` buffered a whole part in
    memory with no cap.
  - `content_hash` accepted and never checked.
  - Session state in a process-local dict that leaked and broke under >1 worker.
  - Uploads written into ./media_uploads inside the repository tree.
"""
import hashlib
import logging
import os
import re
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.auth import get_current_user
from cloud.app.config import settings
from cloud.app.database import get_db
from cloud.app.models.entities import MediaUpload, User, utc_now
from cloud.app.rate_limit import limiter
from cloud.app.tenancy import assert_farm_access

logger = logging.getLogger("aahar.media")
router = APIRouter(prefix="/media", tags=["media"])

PART_SIZE = 5 * 1024 * 1024
ALLOWED_CATEGORIES = {"spectrum", "image", "report"}
ALLOWED_CONTENT_TYPES = {
    "application/octet-stream",
    "image/jpeg",
    "image/png",
    "application/pdf",
}
_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]")


def sanitize_filename(name: str) -> str:
    """
    Reduce an arbitrary client string to a flat, safe basename.
    Defends against traversal ('../'), absolute paths, NUL bytes and
    Windows drive/UNC prefixes.
    """
    name = name.replace("\x00", "")
    name = os.path.basename(name.replace("\\", "/"))
    name = _SAFE_NAME.sub("_", name).lstrip(".") or "upload.bin"
    return name[:120]


def storage_root() -> Path:
    root = Path(settings.MEDIA_LOCAL_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def resolve_within(root: Path, *parts: str) -> Path:
    """Join and assert the result really is inside `root`."""
    candidate = (root / Path(*parts)).resolve()
    root_resolved = root.resolve()
    if not candidate.is_relative_to(root_resolved):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid upload path"
        )
    return candidate


class UploadInitRequest(BaseModel):
    file_name: str = Field(..., max_length=255)
    file_type: str = Field("application/octet-stream", max_length=100)
    total_size_bytes: int = Field(..., gt=0)
    content_hash: str = Field(..., min_length=64, max_length=64, pattern=r"^[a-f0-9]{64}$")
    media_category: str = Field("spectrum")
    farm_id: str = Field(..., max_length=36)
    measurement_id: Optional[str] = Field(None, max_length=36)

    @field_validator("media_category")
    @classmethod
    def _cat(cls, v: str) -> str:
        if v not in ALLOWED_CATEGORIES:
            raise ValueError(f"media_category must be one of {sorted(ALLOWED_CATEGORIES)}")
        return v

    @field_validator("file_type")
    @classmethod
    def _ctype(cls, v: str) -> str:
        if v not in ALLOWED_CONTENT_TYPES:
            raise ValueError(f"Unsupported content type: {v}")
        return v

    @field_validator("total_size_bytes")
    @classmethod
    def _size(cls, v: int) -> int:
        if v > settings.MEDIA_MAX_TOTAL_BYTES:
            raise ValueError(f"Upload exceeds maximum of {settings.MEDIA_MAX_TOTAL_BYTES} bytes")
        return v


class UploadInitResponse(BaseModel):
    upload_id: str
    part_size: int
    total_parts: int
    upload_url: str


@router.post("/upload/init", response_model=UploadInitResponse, status_code=201)
@limiter.limit("60/minute")
async def init_media_upload(
    request: Request,
    req: UploadInitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_farm_access(
        db, current_user, req.farm_id, action="write", entity="media", request=request
    )

    upload_id = str(uuid.uuid4())
    total_parts = max(1, (req.total_size_bytes + PART_SIZE - 1) // PART_SIZE)
    resolve_within(storage_root(), upload_id).mkdir(parents=True, exist_ok=True)

    db.add(
        MediaUpload(
            id=upload_id,
            owner_user_id=current_user.id,
            farm_id=req.farm_id,
            measurement_id=req.measurement_id,
            file_name=sanitize_filename(req.file_name),
            content_type=req.file_type,
            media_category=req.media_category,
            declared_size_bytes=req.total_size_bytes,
            declared_sha256=req.content_hash,
            total_parts=total_parts,
            parts_received=0,
            state="pending",
            created_at=utc_now(),
        )
    )
    await db.commit()

    return UploadInitResponse(
        upload_id=upload_id,
        part_size=PART_SIZE,
        total_parts=total_parts,
        upload_url=f"/media/upload/{upload_id}/part",
    )


async def _load_owned_upload(
    db: AsyncSession, upload_id: str, user: User, request: Request, action: str
) -> MediaUpload:
    upload = await db.get(MediaUpload, upload_id)
    # Uniform 404 so upload ids cannot be probed for existence.
    not_found = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
    )
    if upload is None:
        raise not_found
    if upload.owner_user_id != user.id:
        try:
            await assert_farm_access(
                db, user, upload.farm_id, action=action, entity="media", request=request
            )
        except HTTPException:
            raise not_found
    return upload


@router.put("/upload/{upload_id}/part", status_code=200)
@limiter.limit("600/minute")
async def upload_part(
    request: Request,
    upload_id: str,
    part_number: int = Query(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    upload = await _load_owned_upload(db, upload_id, current_user, request, "write")
    if upload.state != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Upload is already finalised"
        )
    if part_number > upload.total_parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"part_number exceeds total_parts ({upload.total_parts})",
        )

    # Reject oversized parts before buffering them.
    declared = request.headers.get("content-length")
    if declared and int(declared) > settings.MEDIA_MAX_PART_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Part too large"
        )

    part_path = resolve_within(storage_root(), upload_id, f"part_{part_number:06d}.bin")
    written = 0
    with open(part_path, "wb") as fh:
        async for chunk in request.stream():
            written += len(chunk)
            if written > settings.MEDIA_MAX_PART_BYTES:
                fh.close()
                part_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Part exceeded maximum size",
                )
            fh.write(chunk)

    upload.parts_received = len(list(part_path.parent.glob("part_*.bin")))
    await db.commit()
    return {
        "upload_id": upload_id,
        "part_number": part_number,
        "bytes_received": written,
        "parts_received": upload.parts_received,
    }


@router.post("/upload/{upload_id}/complete")
async def complete_media_upload(
    request: Request,
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    upload = await _load_owned_upload(db, upload_id, current_user, request, "write")
    if upload.state == "complete":
        return {"status": "completed", "upload_id": upload_id, "size_bytes": upload.size_bytes}

    session_dir = resolve_within(storage_root(), upload_id)
    parts = sorted(session_dir.glob("part_*.bin"))
    if len(parts) != upload.total_parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected {upload.total_parts} parts, found {len(parts)}",
        )

    final_path = resolve_within(storage_root(), f"{upload_id}.blob")
    digest = hashlib.sha256()
    size = 0
    with open(final_path, "wb") as out:
        for part in parts:
            with open(part, "rb") as src:
                while chunk := src.read(1024 * 1024):   # stream, never slurp
                    digest.update(chunk)
                    out.write(chunk)
                    size += len(chunk)

    # Integrity: the declared hash is now actually enforced.
    if digest.hexdigest() != upload.declared_sha256:
        final_path.unlink(missing_ok=True)
        upload.state = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded content does not match declared content_hash",
        )

    for part in parts:
        part.unlink(missing_ok=True)
    try:
        session_dir.rmdir()
    except OSError:
        pass

    upload.state = "complete"
    upload.size_bytes = size
    upload.stored_path = str(final_path)
    upload.completed_at = utc_now()
    await db.commit()

    return {
        "status": "completed",
        "upload_id": upload_id,
        "file_name": upload.file_name,
        "media_url": f"/media/{upload_id}",
        "size_bytes": size,
        "sha256": digest.hexdigest(),
    }


@router.get("/{upload_id}")
@limiter.limit("300/minute")
async def get_media(
    request: Request,
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    upload = await _load_owned_upload(db, upload_id, current_user, request, "read")
    if upload.state != "complete" or not upload.stored_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    path = Path(upload.stored_path)
    if not path.is_file():
        logger.error("media row %s references missing file", upload_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    # FileResponse streams; the old handler read the whole blob into RAM.
    return FileResponse(
        path,
        media_type=upload.content_type or "application/octet-stream",
        filename=upload.file_name,
        headers={"X-Content-Type-Options": "nosniff"},
    )
