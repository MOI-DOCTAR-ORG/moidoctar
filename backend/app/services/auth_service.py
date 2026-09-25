import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from app.core.supabase import get_supabase_client, safe_supabase_rows
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.email import send_otp_email
from app.services.otp_service import generate_and_store_otp

logger = logging.getLogger("moidoctar.auth")


class AccountNotVerifiedError(Exception):
    """Raised by authenticate_user when the password is correct but the
    account hasn't completed email verification yet. Carries a fresh temp
    access token, dev code, and email delivery status."""

    def __init__(
        self,
        authorization: str,
        code: Optional[str] = None,
        email_delivered: bool = False,
        email_error: Optional[str] = None,
    ):
        self.authorization = authorization
        self.code = code
        self.email_delivered = email_delivered
        self.email_error = email_error
        super().__init__("account_not_verified")

# Local in-memory store for fallback if Supabase is not configured
_local_users: Dict[str, Dict[str, Any]] = {
    "alex.morgan@moidoctar.com": {
        "id": "usr_demo_001",
        "email": "alex.morgan@moidoctar.com",
        "user_name": "Alex Morgan",
        "hashed_password": get_password_hash("Password123!"),
        "is_verified": True,
        "role": "user",
        "phone": "+1 (555) 234-5678",
        "demographics": {
            "gender": "Female",
            "age": "29",
            "currentCondition": "None",
            "bloodType": "O+",
            "country": "United States",
        },
        "preference": {
            "emailNotification": True,
            "smsAlert": False,
            "twoFactorAuth": False,
        },
        "notifications": [
            {"message": "Welcome to MoiDoctar Health Triage!", "date": datetime.now(timezone.utc).isoformat()},
            {"message": "Your profile is active and ready.", "date": datetime.now(timezone.utc).isoformat()},
        ],
        "created_at": "2026-01-15T09:30:00.000Z",
        "last_login": datetime.now(timezone.utc).isoformat(),
    }
}


def _admin_emails() -> List[str]:
    from app.core.config import settings
    return settings.admin_emails_list


def _format_user_out(u: Any) -> Dict[str, Any]:
    if not isinstance(u, dict):
        return {}
    return {
        "_id": str(u.get("id", "")),
        "userName": u.get("user_name", "User"),
        "email": u.get("email", ""),
        "isVerified": bool(u.get("is_verified", True)),
        "role": "admin" if (u.get("role") == "admin" or str(u.get("email", "")).strip().lower() in _admin_emails()) else u.get("role", "user"),
        "phone": u.get("phone"),
        "demographics": u.get("demographics") or {},
        "preference": u.get("preference") or {"emailNotification": True, "smsAlert": False, "twoFactorAuth": False},
        "notifications": u.get("notifications") or [],
        "createdAt": u.get("created_at"),
        "lastLogin": u.get("last_login"),
    }


def _send_verification_otp(email: str) -> Tuple[str, bool, str]:
    code = generate_and_store_otp(email, "verify_email")
    ok, status_msg = send_otp_email(email, code, "verify_email")
    return code, ok, status_msg


def signup_user(email: str, password: str, full_name: Optional[str] = None) -> Dict[str, Any]:
    email_clean = email.strip().lower()
    name = full_name.strip() if full_name else email_clean.split("@")[0].title()
    supabase = get_supabase_client()

    now_iso = datetime.now(timezone.utc).isoformat()
    hashed = get_password_hash(password)

    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", email_clean).execute()
            rows = safe_supabase_rows(res)
            matching = [u for u in rows if str(u.get("email", "")).strip().lower() == email_clean]
            if matching:
                raise ValueError("account_exist")

            new_user = {
                "id": str(uuid.uuid4()),
                "email": email_clean,
                "user_name": name,
                "hashed_password": hashed,
                "is_verified": False,
                "role": "user",
                "created_at": now_iso,
                "last_login": now_iso,
            }
            ins = supabase.table("users").insert(new_user).execute()
            ins_rows = safe_supabase_rows(ins)
            created = ins_rows[0] if ins_rows else new_user
            code, ok, status_msg = _send_verification_otp(email_clean)
            token = create_access_token({"sub": created["id"], "email": email_clean})
            return {
                "authorization": token,
                "refreshToken": token,
                "user": _format_user_out(created),
                "dev_code": code,
                "email_delivered": ok,
                "email_status": status_msg,
            }
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Supabase signup error: {e}. Falling back to local store.")

    # Fallback to local store
    if email_clean in _local_users:
        raise ValueError("account_exist")

    new_id = str(uuid.uuid4())
    user_entry = {
        "id": new_id,
        "email": email_clean,
        "user_name": name,
        "hashed_password": hashed,
        "is_verified": False,
        "role": "user",
        "phone": None,
        "demographics": {},
        "preference": {"emailNotification": True, "smsAlert": False, "twoFactorAuth": False},
        "notifications": [{"message": "Welcome to MoiDoctar!", "date": now_iso}],
        "created_at": now_iso,
        "last_login": now_iso,
    }
    _local_users[email_clean] = user_entry
    code, ok, status_msg = _send_verification_otp(email_clean)
    token = create_access_token({"sub": new_id, "email": email_clean})
    return {
        "authorization": token,
        "refreshToken": token,
        "user": _format_user_out(user_entry),
        "dev_code": code,
        "email_delivered": ok,
        "email_status": status_msg,
    }


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    email_clean = email.strip().lower()
    supabase = get_supabase_client()

    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", email_clean).execute()
            rows = safe_supabase_rows(res)
            matching = [u for u in rows if str(u.get("email", "")).strip().lower() == email_clean]
            if not matching:
                raise ValueError("invalid_account")
            user = matching[0]
            if not verify_password(password, user.get("hashed_password")):
                raise ValueError("invalid_account")

            if not user.get("is_verified", True):
                code, ok, status_msg = _send_verification_otp(email_clean)
                temp_token = create_access_token({"sub": user["id"], "email": email_clean})
                raise AccountNotVerifiedError(
                    temp_token,
                    code,
                    email_delivered=ok,
                    email_error=None if ok else status_msg,
                )

            now_iso = datetime.now(timezone.utc).isoformat()
            try:
                supabase.table("users").update({"last_login": now_iso}).eq("id", user["id"]).execute()
            except Exception:
                pass
            token = create_access_token({"sub": user["id"], "email": email_clean})
            return {"authorization": token, "refreshToken": token, "user": _format_user_out(user)}
        except (ValueError, AccountNotVerifiedError):
            raise
        except Exception as e:
            logger.error(f"Supabase authenticate error: {e}. Falling back to local store.")

    # Fallback local store
    user = _local_users.get(email_clean)
    if not user or not verify_password(password, user.get("hashed_password")):
        raise ValueError("invalid_account")

    if not user.get("is_verified", True):
        code, ok, status_msg = _send_verification_otp(email_clean)
        temp_token = create_access_token({"sub": user["id"], "email": email_clean})
        raise AccountNotVerifiedError(
            temp_token,
            code,
            email_delivered=ok,
            email_error=None if ok else status_msg,
        )

    user["last_login"] = datetime.now(timezone.utc).isoformat()
    token = create_access_token({"sub": user["id"], "email": email_clean})
    return {"authorization": token, "refreshToken": token, "user": _format_user_out(user)}


def _verify_google_id_token(id_token: str, token_type: str = "id_token") -> Dict[str, Any]:
    """Verify a Google ID token (the `credential` from @react-oauth/google's
    GoogleLogin) against Google's tokeninfo endpoint and return its claims.

    Raises ValueError("invalid_google_token") on any failure: missing token,
    network error, expired token, or an audience that doesn't match our
    configured GOOGLE_CLIENT_ID (which would mean the token was issued for a
    *different* app and must not be trusted).
    """
    import json
    import urllib.request
    import urllib.error
    from app.core.config import settings

    if not id_token:
        raise ValueError("invalid_google_token")

    try:
        import urllib.parse
        param = "access_token" if token_type == "access_token" else "id_token"
        url = f"https://oauth2.googleapis.com/tokeninfo?{param}={urllib.parse.quote(id_token, safe='')}"
        with urllib.request.urlopen(url, timeout=10) as response:
            claims = json.load(response)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        raise ValueError("invalid_google_token")
    except Exception as e:
        logger.error(f"Unexpected error verifying Google token: {e}")
        raise ValueError("invalid_google_token")

    # For access tokens Google reports the client in "aud" (and "azp"); accept either.
    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_ID not in (claims.get("aud"), claims.get("azp")):
        logger.warning("Google token audience mismatch - rejecting.")
        raise ValueError("invalid_google_token")

    if not claims.get("email"):
        raise ValueError("invalid_google_token")

    if str(claims.get("email_verified")).lower() not in ("true", "1"):
        raise ValueError("invalid_google_token")

    return claims


def authenticate_google(access_token: str, token_type: str = "id_token") -> Dict[str, Any]:
    """Sign in (or sign up) with a verified Google account.

    `access_token` here is actually the Google ID token supplied by the
    frontend's GoogleLogin `onSuccess` callback. We verify it with Google,
    then find-or-create the corresponding real user by their verified email
    - never a shared placeholder account.
    """
    claims = _verify_google_id_token(access_token, token_type)
    email_clean = claims["email"].strip().lower()
    full_name = claims.get("name") or email_clean.split("@")[0]

    supabase = get_supabase_client()

    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", email_clean).execute()
            rows = safe_supabase_rows(res)
            if rows:
                user = rows[0]
            else:
                new_user = {
                    "id": str(uuid.uuid4()),
                    "email": email_clean,
                    "user_name": full_name,
                    "hashed_password": get_password_hash(str(uuid.uuid4())),
                    "is_verified": True,
                    "role": "user",
                }
                ins = supabase.table("users").insert(new_user).execute()
                ins_rows = safe_supabase_rows(ins)
                user = ins_rows[0] if ins_rows else new_user
            token = create_access_token({"sub": str(user.get("id")), "email": email_clean})
            return {"authorization": token, "refreshToken": token, "user": _format_user_out(user)}
        except Exception as e:
            logger.error(f"Supabase google auth error: {e}. Falling back to local store.")

    if email_clean not in _local_users:
        _local_users[email_clean] = {
            "id": f"usr_google_{uuid.uuid4().hex[:10]}",
            "email": email_clean,
            "user_name": full_name,
            "hashed_password": get_password_hash(str(uuid.uuid4())),
            "is_verified": True,
            "role": "user",
            "phone": None,
            "demographics": {},
            "preference": {"emailNotification": True, "smsAlert": False, "twoFactorAuth": False},
            "notifications": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat(),
        }
    user = _local_users[email_clean]
    user["last_login"] = datetime.now(timezone.utc).isoformat()
    token = create_access_token({"sub": user["id"], "email": email_clean})
    return {"authorization": token, "refreshToken": token, "user": _format_user_out(user)}


def find_local_user_record_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Return the raw (unformatted) local in-memory user record matching
    `user_id`, or None. Used by services outside auth_service (e.g.
    notification_service) that need to read/mutate the same local fallback
    store — there's only one local user store in the app, so we share it
    instead of each service keeping its own copy."""
    for u in _local_users.values():
        if str(u.get("id")) == str(user_id):
            return u
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("id", user_id).execute()
            rows = safe_supabase_rows(res)
            if rows:
                return _format_user_out(rows[0])
        except Exception:
            pass

    for u in _local_users.values():
        if str(u.get("id")) == str(user_id):
            return _format_user_out(u)
    return None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Look up a user by email and return the raw internal record (not the
    public-formatted shape) for use by OTP/password-reset flows, which
    need the exact stored email and id. Returns None if no account exists
    - callers must not use this to reveal account existence to the client."""
    email_clean = email.strip().lower()
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", email_clean).execute()
            rows = safe_supabase_rows(res)
            matching = [u for u in rows if str(u.get("email", "")).strip().lower() == email_clean]
            if matching:
                return matching[0]
        except Exception as e:
            logger.error(f"Supabase get_user_by_email error: {e}. Falling back to local store.")

    return _local_users.get(email_clean)


def mark_user_verified(user_id: Optional[str] = None, email: Optional[str] = None) -> None:
    supabase = get_supabase_client()
    if supabase:
        try:
            if user_id:
                supabase.table("users").update({"is_verified": True}).eq("id", str(user_id)).execute()
            if email:
                supabase.table("users").update({"is_verified": True}).eq("email", email.strip().lower()).execute()
            return
        except Exception as e:
            logger.error(f"Supabase mark_user_verified error: {e}. Falling back to local store.")

    for u in _local_users.values():
        if (user_id and str(u.get("id")) == str(user_id)) or (email and u.get("email") == email.strip().lower()):
            u["is_verified"] = True
            return


def reset_user_password(email: str, new_password: str) -> bool:
    """Set a new password for `email`. Returns False if no such account
    exists (should only happen if the account was deleted mid-reset)."""
    email_clean = email.strip().lower()
    hashed = get_password_hash(new_password)
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("users").select("id").eq("email", email_clean).execute()
            rows = safe_supabase_rows(res)
            if rows:
                supabase.table("users").update({"hashed_password": hashed}).eq("id", rows[0]["id"]).execute()
                return True
        except Exception as e:
            logger.error(f"Supabase reset_user_password error: {e}. Falling back to local store.")

    user = _local_users.get(email_clean)
    if not user:
        return False
    user["hashed_password"] = hashed
    return True


def update_user_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    supabase = get_supabase_client()
    cleaned = {k: v for k, v in updates.items() if v is not None}

    if supabase:
        try:
            update_data = {}
            if "userName" in cleaned:
                update_data["user_name"] = cleaned["userName"]
            if "phone" in cleaned:
                update_data["phone"] = cleaned["phone"]
            if "demographics" in cleaned:
                update_data["demographics"] = cleaned["demographics"]
            if "preference" in cleaned:
                update_data["preference"] = cleaned["preference"]

            res = supabase.table("users").update(update_data).eq("id", user_id).execute()
            rows = safe_supabase_rows(res)
            updated = rows[0] if rows else {}
            return _format_user_out(updated)
        except Exception:
            pass

    for email, u in _local_users.items():
        if str(u.get("id")) == str(user_id):
            if "userName" in cleaned:
                u["user_name"] = cleaned["userName"]
            if "phone" in cleaned:
                u["phone"] = cleaned["phone"]
            if "demographics" in cleaned:
                u["demographics"] = {**(u.get("demographics") or {}), **cleaned["demographics"]}
            if "preference" in cleaned:
                u["preference"] = {**(u.get("preference") or {}), **cleaned["preference"]}
            return _format_user_out(u)

    raise ValueError("user_not_found")


def delete_user_account(user_id: str) -> bool:
    supabase = get_supabase_client()
    if supabase:
        supabase.table("users").delete().eq("id", user_id).execute()
        return True

    for email, u in list(_local_users.items()):
        if str(u.get("id")) == str(user_id):
            del _local_users[email]
            return True
    return True


def reset_user_password(email: str, new_password: str) -> bool:
    email_clean = email.strip().lower()
    hashed = get_password_hash(new_password)
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("users").update({"hashed_password": hashed}).eq("email", email_clean).execute()
            rows = safe_supabase_rows(res)
            return len(rows) > 0
        except Exception as e:
            logger.error(f"Supabase password reset error: {e}")

    if email_clean in _local_users:
        _local_users[email_clean]["hashed_password"] = hashed
        return True
    return False

