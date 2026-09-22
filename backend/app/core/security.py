import os
import hmac
import hashlib
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from app.core.config import settings

try:
    from jose import jwt, JWTError
except ImportError:
    jwt = None
    JWTError = Exception

try:
    import bcrypt
except ImportError:
    bcrypt = None


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password or not isinstance(hashed_password, str):
        return False
    if bcrypt and (hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$")):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            pass

    # Fallback PBKDF2-HMAC verification
    if ":" in hashed_password:
        try:
            salt_hex, key_hex = hashed_password.split(":", 1)
            salt = bytes.fromhex(salt_hex)
            key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
            return hmac.compare_digest(key.hex(), key_hex)
        except Exception:
            return False

    return plain_password == hashed_password


def get_password_hash(password: str) -> str:
    if bcrypt:
        try:
            salt = bcrypt.gensalt()
            return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
        except Exception:
            pass

    # Fallback secure PBKDF2-HMAC hashing
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})

    if jwt:
        try:
            return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        except Exception:
            pass

    # Fallback signed token using HMAC-SHA256
    payload_bytes = str(to_encode).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8")
    sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    token = token.replace("Bearer ", "").strip()
    if jwt:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except Exception:
            pass

    # Fallback decode
    try:
        parts = token.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[0]
            sig = parts[1]
            expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
            if hmac.compare_digest(sig, expected_sig):
                payload_str = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
                import ast
                return ast.literal_eval(payload_str)
    except Exception:
        pass

    return None
