"""
AAHAR ML Model & Firmware OTA distribution.

WHAT WAS HERE BEFORE — and why it is gone:
  The manifest was a hardcoded Python list whose `sha256` fields were public
  test vectors, not digests of anything:
      nir-proximate-v1  -> e3b0c442...b855 = SHA-256 of the EMPTY STRING
      nir-adulterant-v1 -> d41d8cd9...427e = MD5 of the empty string, padded
      vis-mould-v1      -> cf23df22...b306 = SHA-256 of "foobar"
      fusion-toxin-v1   -> 8b1a9953...c9e9 = SHA-256 of "Hello"
  `signature_ed25519` fields were literal strings like
  "4a7f21...signed_by_aahar_cloud_ca". The download endpoints returned an
  ASCII string ("AAHAR_TFLITE_BUNDLE_<id>") instead of a binary, were
  unauthenticated, and no verification existed on either side.

  A device that trusted this would flash an unsigned, unauthenticated payload
  from an anonymous HTTP request. Shipping it would be worse than shipping
  nothing, so the fake path is removed rather than papered over.

This module now serves artifacts from a registry table, requires
authentication, and returns 503 while no artifact has been published. Ed25519
verification is implemented; publishing is an operator action.
"""
import hashlib
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.auth import get_current_user
from cloud.app.database import get_db
from cloud.app.models.entities import ArtifactRelease, User

logger = logging.getLogger("aahar.artifacts")
router = APIRouter(tags=["models_firmware"])

NOT_PUBLISHED = (
    "No signed artifact has been published for this channel. Model and firmware "
    "distribution is disabled until a real, signed build is uploaded to the "
    "artifact registry."
)


def _serialise(a: ArtifactRelease) -> dict:
    return {
        "id": a.id,
        "kind": a.kind,
        "name": a.name,
        "version": a.version,
        "target": a.target,
        "size_bytes": a.size_bytes,
        "sha256": a.sha256,
        "signature_ed25519": a.signature_ed25519,
        "signing_key_id": a.signing_key_id,
        "published_at": a.published_at.isoformat() if a.published_at else None,
        "download_url": f"/{'models' if a.kind == 'model' else 'firmware'}/{a.id}/download",
    }


async def _published(db: AsyncSession, kind: str) -> List[ArtifactRelease]:
    q = select(ArtifactRelease).filter(
        ArtifactRelease.kind == kind, ArtifactRelease.state == "published"
    )
    return list((await db.execute(q)).scalars().all())


async def _fetch_or_503(db: AsyncSession, artifact_id: str, kind: str) -> ArtifactRelease:
    artifact = await db.get(ArtifactRelease, artifact_id)
    if artifact is None or artifact.kind != kind or artifact.state != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")
    if not artifact.stored_path or not Path(artifact.stored_path).is_file():
        logger.error("artifact %s is published but its binary is missing", artifact_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=NOT_PUBLISHED
        )
    if not artifact.signature_ed25519 or not artifact.signing_key_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Artifact is not signed; refusing to serve it.",
        )
    return artifact


@router.get("/models/manifest")
async def get_models_manifest(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    releases = await _published(db, "model")
    if not releases:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=NOT_PUBLISHED)
    return {"count": len(releases), "models": [_serialise(a) for a in releases]}


@router.get("/models/{model_id}/download")
async def download_model(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    artifact = await _fetch_or_503(db, model_id, "model")
    return FileResponse(
        artifact.stored_path,
        media_type="application/octet-stream",
        filename=f"{artifact.id}.tflite",
        headers={"X-Artifact-SHA256": artifact.sha256, "X-Content-Type-Options": "nosniff"},
    )


@router.get("/firmware/manifest")
async def get_firmware_manifest(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    releases = await _published(db, "firmware")
    if not releases:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=NOT_PUBLISHED)
    return {"count": len(releases), "firmware": [_serialise(a) for a in releases]}


@router.get("/firmware/{firmware_id}/download")
async def download_firmware(
    firmware_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    artifact = await _fetch_or_503(db, firmware_id, "firmware")
    return FileResponse(
        artifact.stored_path,
        media_type="application/octet-stream",
        filename=f"{artifact.id}.bin",
        headers={"X-Artifact-SHA256": artifact.sha256, "X-Content-Type-Options": "nosniff"},
    )
