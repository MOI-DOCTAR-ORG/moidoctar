"""Byteship (AIB Ship) file storage for user avatars.

Byteship handles uploads, storage and CDN delivery from one API. The project API key
(bship_...) is a SERVER secret, so the browser never talks to Byteship directly: the frontend
posts the file to /user/uploadPhoto and this module stores it.

Enabled only when BYTESHIP_API_KEY is set. Any failure raises ByteshipUnavailable and the
caller falls back to Cloudinary / an inline data URL, so profile photos never break.
"""
import io
import logging
import re
import uuid
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("moidoctar.byteship")

_EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


class ByteshipUnavailable(RuntimeError):
    """Byteship is not configured or the upload failed."""


def is_enabled() -> bool:
    return bool((settings.BYTESHIP_API_KEY or "").strip())


def _safe(part: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]", "", part or "")[:64] or "user"


def upload_avatar(content: bytes, content_type: Optional[str], user_id: str) -> str:
    """Upload `content` as a public image and return its CDN URL (blocking; run in a thread)."""
    if not is_enabled():
        raise ByteshipUnavailable("BYTESHIP_API_KEY is not set")
    try:
        from byteship import ByteshipClient, Visibility  # lazy: app still boots without the SDK
    except ImportError as exc:
        raise ByteshipUnavailable("byteship package is not installed (pip install byteship)") from exc

    mime = content_type if content_type in _EXT else "image/jpeg"
    path = f"avatars/{_safe(user_id)}-{uuid.uuid4().hex[:12]}.{_EXT[mime]}"
    try:
        client = ByteshipClient(
            api_key=settings.BYTESHIP_API_KEY.strip(),
            base_url=(settings.BYTESHIP_BASE_URL or "https://api.byteship.dev").strip(),
            timeout=20,
        )
        uploaded = client.upload(
            io.BytesIO(content),
            filename=path.rsplit("/", 1)[-1],
            content_type=mime,
            byte_size=len(content),
            path=path,
            visibility=Visibility.PUBLIC,
            metadata={"user_id": str(user_id), "source": "moidoctar-avatar"},
        )
    except Exception as exc:  # SDK raises ByteshipError, network errors, etc.
        raise ByteshipUnavailable(f"{type(exc).__name__}: {exc}") from exc

    if not uploaded.url:
        raise ByteshipUnavailable("Byteship returned no public URL")
    logger.info("Avatar stored on Byteship: %s (%s bytes)", uploaded.path, len(content))
    return uploaded.url
