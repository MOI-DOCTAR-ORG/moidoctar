"""Cencori gateway routing (no network: a local fake server stands in for Cencori)."""
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ.setdefault("MOIDOCTAR_DATA_DIR", os.path.join(ROOT, ".data_test"))

from app.services import ai_keys, gemini_client  # noqa: E402

SEEN = []


class Fake(BaseHTTPRequestHandler):
    status = 200

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        SEEN.append({"path": self.path, "headers": dict(self.headers), "body": body})
        self.send_response(Fake.status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"content": '{"ok": true}', "model": "gemini-2.5-flash", "provider": "google"}).encode())

    def log_message(self, *a):
        pass


@pytest.fixture()
def gateway(monkeypatch):
    SEEN.clear()
    Fake.status = 200
    srv = HTTPServer(("127.0.0.1", 0), Fake)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    s = gemini_client.settings
    monkeypatch.setattr(s, "CENCORI_API_KEY", "csk_test_123")
    monkeypatch.setattr(s, "CENCORI_BASE_URL", f"http://127.0.0.1:{srv.server_port}")
    monkeypatch.setattr(s, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(s, "GOOGLE_API_KEYS", "")
    ai_keys._runtime.clear()
    yield
    srv.shutdown()


def test_routes_through_cencori(gateway):
    text, meta = gemini_client.generate([{"role": "user", "parts": [{"text": "headache"}]}], system_instruction="Be safe.")
    assert gemini_client.parse_json_object(text) == {"ok": True}
    assert meta["via"] == "cencori"
    req = SEEN[0]
    assert req["path"] == "/api/ai/chat"
    headers = {k.lower(): v for k, v in req["headers"].items()}
    assert headers["cencori_api_key"] == "csk_test_123"
    assert headers["authorization"] == "Bearer csk_test_123"
    assert req["body"]["messages"][0]["role"] == "system"
    assert req["body"]["messages"][-1] == {"role": "user", "content": "headache"}


def test_image_turns_skip_gateway(gateway, monkeypatch):
    monkeypatch.setattr(gemini_client, "_post", lambda *a, **k: {"candidates": [{"content": {"parts": [{"text": "{}"}]}}]})
    ai_keys.add_key("AIzaSy" + "x" * 33, "k")
    parts = [{"text": "rash"}, {"inlineData": {"mimeType": "image/jpeg", "data": "AAAA"}}]
    _, meta = gemini_client.generate([{"role": "user", "parts": parts}])
    assert SEEN == [] and meta.get("via") != "cencori"


def test_falls_back_to_gemini_when_gateway_fails(gateway, monkeypatch):
    Fake.status = 500
    monkeypatch.setattr(gemini_client, "_post", lambda *a, **k: {"candidates": [{"content": {"parts": [{"text": "{}"}]}}]})
    ai_keys.add_key("AIzaSy" + "y" * 33, "k")
    _, meta = gemini_client.generate([{"role": "user", "parts": [{"text": "hi"}]}])
    assert len(SEEN) == 1 and meta["key_id"] != "cencori"
