"""Run once to confirm the Cencori gateway works:  python cencori_check.py
Needs CENCORI_API_KEY in backend/.env (or exported). Then look for the request in the Cencori dashboard logs."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.config import settings  # noqa: E402
from app.services import gemini_client  # noqa: E402

if not settings.CENCORI_API_KEY:
    sys.exit("CENCORI_API_KEY is not set. Add it to backend/.env first.")
try:
    text, meta = gemini_client._generate_via_cencori(
        [{"role": "user", "parts": [{"text": 'Return {"ok": true} as JSON.'}]}],
        "You are a test.", True, 0, 256)
    print("OK via Cencori:", meta, "\nReply:", text)
except Exception as exc:
    print("FAILED:", type(exc).__name__, exc)
    if hasattr(exc, "read"):
        print(exc.read().decode("utf-8", "replace")[:500])
    sys.exit(1)
