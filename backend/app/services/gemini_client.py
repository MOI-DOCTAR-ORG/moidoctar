"""Gemini REST client with key rotation and model fallback."""
import json
import logging
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.services import ai_keys

logger = logging.getLogger("moidoctar.gemini")

_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
_DEFAULT_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.0-flash"]
_dead_models: Dict[str, float] = {}  # model -> time it 404'd (retry after an hour)
TOTAL_BUDGET_SECONDS = 28


class GeminiUnavailable(RuntimeError):
    """No key configured, or every key/model combination failed."""


def candidate_models(key_model: str = "") -> List[str]:
    models: List[str] = []
    for m in (key_model, settings.GEMINI_MODEL, *_DEFAULT_MODELS):
        m = (m or "").strip()
        if m and m not in models:
            models.append(m)
    now = time.time()
    live = [m for m in models if now - _dead_models.get(m, 0) > 3600]
    return live or models


def _post(api_key: str, model: str, body: bytes, timeout: float) -> Dict[str, Any]:
    req = urllib.request.Request(
        _URL.format(model=model),
        data=body,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def generate(
    contents: List[Dict[str, Any]],
    system_instruction: Optional[str] = None,
    json_mode: bool = True,
    temperature: float = 0.2,
    only_key_id: Optional[str] = None,
    max_output_tokens: Optional[int] = None,
) -> Tuple[str, Dict[str, str]]:
    """Return (text, {"model":..., "key_id":...}). Raises GeminiUnavailable."""
    body: Dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }
    if max_output_tokens:
        # Flash models spend part of this on internal "thinking", so it caps the whole
        # call, not just the visible JSON (which is usually 150-300 tokens).
        body["generationConfig"]["maxOutputTokens"] = int(max_output_tokens)
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    payload = json.dumps(body).encode()

    if only_key_id:
        k = ai_keys.get_key(only_key_id)
        keys = [k] if k else []
    else:
        keys = ai_keys.usable_keys()
    if not keys:
        raise GeminiUnavailable("No usable API key (none configured, or all are cooling down).")

    started = time.time()
    last_error = "unknown error"
    for key in keys:
        for model in candidate_models(key.get("model", "")):
            remaining = TOTAL_BUDGET_SECONDS - (time.time() - started)
            if remaining <= 2:
                raise GeminiUnavailable(f"Timed out. Last error: {last_error}")
            try:
                data = _post(key["key"], model, payload, min(14, remaining))
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", "replace")[:300]
                last_error = f"HTTP {exc.code} on {model}"
                if exc.code == 404:
                    _dead_models[model] = time.time()
                    logger.warning("Gemini model %s not available; skipping.", model)
                    continue  # model problem, not key problem
                ai_keys.report_failure(key["id"], exc.code, detail)
                logger.warning("Gemini key %s failed with %s", key["id"], exc.code)
                break  # next key
            except Exception as exc:  # timeout / network
                last_error = f"{type(exc).__name__}: {exc}"
                ai_keys.report_failure(key["id"], None, last_error)
                break

            candidates = data.get("candidates") or []
            parts = ((candidates[0].get("content") or {}).get("parts")) if candidates else None
            text = "".join(p.get("text", "") for p in (parts or [])).strip()
            if not text:
                block = (data.get("promptFeedback") or {}).get("blockReason")
                last_error = f"empty response ({block or 'no text'}) on {model}"
                continue
            ai_keys.report_success(key["id"])
            return text, {"model": model, "key_id": key["id"]}
    raise GeminiUnavailable(last_error)


def parse_json_object(text: str) -> Dict[str, Any]:
    import re
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            raise ValueError("no JSON object in model output")
        # The model now and then leaves a trailing comma before a closing bracket.
        obj = json.loads(re.sub(r",\s*([}\]])", r"\1", m.group(0)))
    if not isinstance(obj, dict):
        raise ValueError("model output is not an object")
    return obj


def test_key(key_id: str) -> Dict[str, Any]:
    """Cheap connectivity check for one key."""
    try:
        _, meta = generate(
            [{"role": "user", "parts": [{"text": "Reply with the single word: ok"}]}],
            json_mode=False, temperature=0, only_key_id=key_id,
        )
        return {"ok": True, "model": meta["model"]}
    except GeminiUnavailable as exc:
        return {"ok": False, "error": str(exc)}
