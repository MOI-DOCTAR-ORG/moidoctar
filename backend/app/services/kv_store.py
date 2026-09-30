"""Tiny JSON key-value persistence.

Uses the Supabase `app_settings` table when Supabase is configured (so data
survives redeploys on ephemeral hosts) and falls back to a JSON file under
backend/.data/ for local development. Never raises: a failed read returns the
default, a failed write logs and returns False.
"""
import json
import logging
import os
import tempfile
import threading
from typing import Any

from app.core.supabase import get_supabase_client, safe_supabase_rows

logger = logging.getLogger("moidoctar.kv")

_DATA_DIR = os.environ.get(
    "MOIDOCTAR_DATA_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".data"),
)
# Some hosts (Pxxl) mount the app read-only. Writes then go to the temp dir, which
# lasts until the next restart: better than silently keeping nothing at all.
_TMP_DIR = os.path.join(tempfile.gettempdir(), "moidoctar-data")
_lock = threading.Lock()
_warned: set = set()


def _warn_once(key: str, msg: str, *args: Any) -> None:
    if key not in _warned:
        _warned.add(key)
        logger.warning(msg, *args)


def _file_for(name: str, directory: str = "") -> str:
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in name)
    return os.path.join(directory or _DATA_DIR, f"{safe}.json")


def kv_get(name: str, default: Any = None) -> Any:
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("app_settings").select("value").eq("key", name).execute()
            rows = safe_supabase_rows(res)
            if rows:
                return rows[0].get("value", default)
        except Exception as exc:  # table may not exist yet
            _warn_once("sb_get", "kv: Supabase app_settings read failed (run backend/schema.sql?): %s", exc)
    # The temp copy is newer whenever it exists: it is only written when the data dir is not.
    for directory in (_TMP_DIR, _DATA_DIR):
        try:
            with _lock, open(_file_for(name, directory), "r", encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError:
            continue
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
            _warn_once("sb_set", "kv: Supabase app_settings write failed (run backend/schema.sql?): %s", exc)
    for directory in (_DATA_DIR, _TMP_DIR):
        try:
            os.makedirs(directory, exist_ok=True)
            with _lock, open(_file_for(name, directory), "w", encoding="utf-8") as fh:
                json.dump(value, fh, indent=2)
            if directory == _TMP_DIR:
                _warn_once("tmp", "kv: %s is not writable; keeping data in %s until restart", _DATA_DIR, _TMP_DIR)
            return True
        except OSError as exc:
            if directory == _TMP_DIR:
                logger.warning("kv_set(%s) file failed: %s", name, exc)
    return ok
