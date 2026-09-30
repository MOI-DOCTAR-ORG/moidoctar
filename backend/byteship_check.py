"""Run once to confirm Byteship works:  python byteship_check.py
Needs BYTESHIP_API_KEY in backend/.env (or exported). Uploads a tiny PNG, prints its public URL,
then look for the file in the Byteship dashboard."""
import base64
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.config import settings  # noqa: E402
from app.services import byteship_storage  # noqa: E402

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=="
)

if not byteship_storage.is_enabled():
    sys.exit("BYTESHIP_API_KEY is not set. Add it to backend/.env first.")
try:
    url = byteship_storage.upload_avatar(PNG, "image/png", "check")
    print("OK via Byteship:", url)
except Exception as exc:
    print("FAILED:", type(exc).__name__, exc)
    sys.exit(1)
