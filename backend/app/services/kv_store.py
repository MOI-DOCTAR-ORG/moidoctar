"""Tiny JSON key-value persistence.

Uses the Supabase `app_settings` table when Supabase is configured (so data
survives redeploys on ephemeral hosts) and falls back to a JSON file under
backend/.data/ for local development. Never raises: a failed read returns the
default, a failed write logs and returns False.
"""
import json
import logging
import os
import threading
from typing import Any

from app.core.supabase import get_supabase_client, safe_supabase_rows

logger = logging.getLogger("moidoctar.kv")

_DATA_DIR = os.environ.get(
    "MOIDOCTAR_DATA_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".data"),
)
_lock = threading.Lock()


def _file_for(name: str) -> str:
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in name)
    return os.path.join(_DATA_DIR, f"{safe}.json")


def kv_get(name: str, default: Any = None) -> Any:
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("app_settings").select("value").eq("key", name).execute()
            rows = safe_supabase_rows(res)
            if rows:
                return rows[0].get("value", default)
        except Exception as exc:  # table may not exist yet
            logger.debug("kv_get(%s) supabase failed: %s", name, exc)
    try:
        with _lock, open(_file_for(name), "r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return default
    except Exception as exc:
        logger.warning("kv_get(%s) file failed: %s", name, exc)
        return default


def kv_set(name: str, value: Any) -> bool:
    ok = False
    sb = get_supabase_client()
    if sb:
        try:
            sb.table("app_settings").upsert({"key": name, "value": value}).execute()
            ok = True
        except Exception as exc:
            logger.debug("kv_set(%s) supabase failed: %s", name, exc)
    try:
        os.makedirs(_DATA_DIR, exist_ok=True)
        with _lock, open(_file_for(name), "w", encoding="utf-8") as fh:
            json.dump(value, fh, indent=2)
        ok = True
    except Exception as exc:
        logger.warning("kv_set(%s) file failed: %s", name, exc)
    return ok
