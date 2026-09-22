"""Small Gemini function-calling client. The API key stays in the environment."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from moi_doctar_ai.loop import ModelError

_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiModel:
    def __init__(self, api_key=None, model=None, timeout=30):
        self.api_key = api_key if api_key is not None else os.environ.get("GOOGLE_API_KEY", "")
        self.model = model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        self.timeout = timeout

    def generate(self, contents, tools):
        if not self.api_key:
            raise ModelError("GOOGLE_API_KEY is not set")
        body = {
            "contents": contents,
            "tools": [{"functionDeclarations": tools}],
            "toolConfig": {"functionCallingConfig": {"mode": "ANY"}},
            "generationConfig": {"temperature": 0},
        }
        request = urllib.request.Request(
            _URL.format(model=self.model),
            data=json.dumps(body).encode(),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:300]
            raise ModelError(f"gemini http {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise ModelError(f"gemini network: {exc.reason}") from exc

        candidates = payload.get("candidates") or []
        if not candidates:
            raise ModelError("gemini returned no candidates")
        parts = ((candidates[0].get("content") or {}).get("parts")) or []
        calls = []
        for part in parts:
            if "functionCall" in part:
                call = part["functionCall"]
                calls.append({"name": call.get("name", ""), "args": call.get("args") or {}})
            elif part.get("text"):
                calls.append({"text": part["text"]})
        return calls
