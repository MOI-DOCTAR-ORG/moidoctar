"""Byteship avatar storage (no network: the SDK client is replaced by a fake)."""
import os
import sys
import types

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ.setdefault("MOIDOCTAR_DATA_DIR", os.path.join(ROOT, ".data_test"))

from app.services import byteship_storage  # noqa: E402

CALLS = []


class FakeUploaded:
    def __init__(self, url):
        self.url = url
        self.path = "avatars/x.png"


def install_fake_sdk(monkeypatch, url="https://cdn.byteship.dev/f/1/x.png", fail=False):
    CALLS.clear()

    class Visibility:
        PUBLIC = "public"

    class FakeClient:
        def __init__(self, **kw):
            CALLS.append(("init", kw))

        def upload(self, file, **kw):
            if fail:
                raise RuntimeError("boom")
            CALLS.append(("upload", {"bytes": file.read(), **kw}))
            return FakeUploaded(url)

    mod = types.ModuleType("byteship")
    mod.ByteshipClient = FakeClient
    mod.Visibility = Visibility
    monkeypatch.setitem(sys.modules, "byteship", mod)


@pytest.fixture()
def key(monkeypatch):
    monkeypatch.setattr(byteship_storage.settings, "BYTESHIP_API_KEY", "bship_test_123")


def test_disabled_without_key(monkeypatch):
    monkeypatch.setattr(byteship_storage.settings, "BYTESHIP_API_KEY", "")
    assert not byteship_storage.is_enabled()
    with pytest.raises(byteship_storage.ByteshipUnavailable):
        byteship_storage.upload_avatar(b"x", "image/png", "u1")


def test_uploads_public_image_and_returns_url(key, monkeypatch):
    install_fake_sdk(monkeypatch)
    url = byteship_storage.upload_avatar(b"PNGDATA", "image/png", "user/../1")
    assert url == "https://cdn.byteship.dev/f/1/x.png"
    init = CALLS[0][1]
    assert init["api_key"] == "bship_test_123"
    up = CALLS[1][1]
    assert up["bytes"] == b"PNGDATA" and up["visibility"] == "public"
    assert up["path"].startswith("avatars/user1-") and up["path"].endswith(".png")  # id sanitised
    assert up["metadata"]["source"] == "moidoctar-avatar"


def test_sdk_error_becomes_unavailable(key, monkeypatch):
    install_fake_sdk(monkeypatch, fail=True)
    with pytest.raises(byteship_storage.ByteshipUnavailable):
        byteship_storage.upload_avatar(b"x", "image/jpeg", "u1")


def test_missing_url_becomes_unavailable(key, monkeypatch):
    install_fake_sdk(monkeypatch, url=None)
    with pytest.raises(byteship_storage.ByteshipUnavailable):
        byteship_storage.upload_avatar(b"x", "image/webp", "u1")
