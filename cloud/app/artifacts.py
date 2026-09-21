"""
Artifact publishing + Ed25519 signature verification.

Used by the operator CLI to publish a model/firmware build, and available to
tests. Verification is real: it computes the digest over the actual bytes and
checks a detached Ed25519 signature against the configured public key.
"""
import hashlib
from pathlib import Path
from typing import Optional


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        while chunk := fh.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def verify_ed25519(public_key_hex: str, signature_hex: str, digest_hex: str) -> bool:
    """
    Verify a detached Ed25519 signature over the artifact's SHA-256 digest.
    Returns False (never raises) so callers can treat it as a boolean gate.
    """
    try:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    except ImportError:  # pragma: no cover
        raise RuntimeError(
            "`cryptography` is required to verify artifact signatures. "
            "Refusing to accept an unverified artifact."
        )

    try:
        key = Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key_hex))
        key.verify(bytes.fromhex(signature_hex), bytes.fromhex(digest_hex))
        return True
    except (InvalidSignature, ValueError):
        return False
