"""In-memory OTP generation/verification for email verification and
password reset.

Kept separate from Supabase/local user storage on purpose: OTPs are
short-lived (a few minutes) and don't need to survive a server restart or
be queried like user data, so a process-local store is sufficient here
(the same fallback-friendly spirit as `_local_users` in auth_service.py).
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal

logger = logging.getLogger("moidoctar.otp")

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5

Purpose = Literal["verify_email", "reset_password"]

# Keyed by "{email}:{purpose}" -> {"code", "expires_at", "attempts"}
_otp_store: Dict[str, Dict[str, Any]] = {}


def _key(email: str, purpose: Purpose) -> str:
    return f"{email.strip().lower()}:{purpose}"


def generate_and_store_otp(email: str, purpose: Purpose) -> str:
    """Generate a fresh 6-digit OTP for (email, purpose), overwriting any
    previous unverified code, and return it so the caller can email it."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    _otp_store[_key(email, purpose)] = {
        "code": code,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
        "attempts": 0,
    }
    return code


def verify_otp(email: str, purpose: Purpose, code: str) -> bool:
    """Check `code` against the stored OTP for (email, purpose).

    Returns True and clears the OTP on success (codes are single-use).
    Returns False - without raising - on any mismatch, missing OTP,
    expiry, or once the attempt limit is exhausted; callers decide what
    HTTP error to surface.
    """
    key = _key(email, purpose)
    entry = _otp_store.get(key)
    if not entry:
        return False

    if datetime.now(timezone.utc) > entry["expires_at"]:
        _otp_store.pop(key, None)
        return False

    if entry["attempts"] >= OTP_MAX_ATTEMPTS:
        _otp_store.pop(key, None)
        return False

    if not code or not secrets.compare_digest(str(code).strip(), entry["code"]):
        entry["attempts"] += 1
        return False

    _otp_store.pop(key, None)
    return True
