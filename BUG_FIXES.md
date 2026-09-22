# BUG_FIXES.md — Phase 1

## 1. AI was never actually called (highest priority)

- **Where:** `backend/app/services/triage_service.py`,
  `backend/app/api/v1/endpoints/triage.py`
- **Root cause:** Both `/api/v1/triage` and `/api/v1/triage/chat` called
  `analyze_symptoms_placeholder()`, a keyword-matching stub. A complete,
  separately-built Gemini integration existed at `backend/ai/moi_doctar_ai/`
  (its own README even says "backend engineer wires it into
  `triage_service.py`... you are ready to switch") but was never imported or
  invoked anywhere in the app.
- **Fix:** Added `analyze_symptoms()` in `triage_service.py`, which calls
  Gemini with a prompt that returns strict JSON matching the existing
  `TriageResponse`/`TriageChatResponse` schema (no frontend/contract
  changes needed), keeps the old keyword engine as a deterministic result
  the AI's urgency can only escalate past (never downgrade a
  keyword-flagged emergency), and falls back to the keyword engine outright
  if the API key is missing or the call fails. Wired `backend/ai` onto
  `sys.path` so the package actually imports.

## 2. Authentication was effectively disabled

- **Where:** `backend/app/api/deps.py`
- **Root cause:** `get_current_user` caught every failure case (no header,
  invalid token, unknown user id) and silently returned a hardcoded demo
  user instead of raising `401`. `get_current_admin` called
  `get_current_user` and returned whatever it got with no role check at
  all. In effect, every "protected" and "admin-only" endpoint was open to
  anyone, and a bad token behaved identically to a valid one.
- **Fix:** Both functions now raise proper `HTTPException`s (`401` for
  missing/invalid/expired/unknown tokens, `403` for non-admins hitting
  admin routes). Confirmed via test client that a request with no token or
  a garbage token now correctly gets `401`, and a valid token still works.

## 3. `get_user_by_id` / `update_user_profile` fell back to the wrong account

- **Where:** `backend/app/services/auth_service.py`
- **Root cause:** When a lookup by id found no match, both functions
  silently fell back to returning/mutating the *first* user in the local
  store rather than reporting "not found." Combined with bug #2, this
  meant an invalid token wouldn't just get you in — it could return or
  modify a different (arbitrary) user's data.
- **Fix:** Both now correctly return `None` / raise `ValueError` when the
  id isn't found; the `PUT /user/updateProfile` endpoint catches that and
  returns `404`.

## 4. Invalid CORS configuration

- **Where:** `backend/app/main.py`
- **Root cause:** `allow_origins=settings.cors_origins_list + ["*"]` combined
  a wildcard origin with `allow_credentials=True`. Browsers refuse this
  combination per the CORS spec (a wildcard origin can't also carry
  credentials), so in a real deployment authenticated requests from the
  frontend would fail outright, even though it would appear to work in
  same-origin local dev.
- **Fix:** Removed the wildcard; CORS now only allows the explicitly
  configured origins from `settings.cors_origins_list`.

## 5. Triage/AI requests were sent with no auth token (frontend)

- **Where:** `src/lib/modelAxios.ts`
- **Root cause:** The app uses two axios instances — `apiClient` (attaches
  the bearer token) and `modelClient` (used specifically for
  `/triage`, `/triage/chat`, and cache endpoints), which never attached
  the token at all. This was invisible before because of bug #2 (the
  backend accepted requests with no valid auth anyway); once auth is
  correctly enforced, every triage request would have started failing
  with `401`.
- **Fix:** Added the same request interceptor `apiClient` uses, reading the
  stored token and setting the `Authorization` header.

## 6. AI package unreachable from the FastAPI app

- **Where:** `backend/main.py`, `backend/app/main.py`
- **Root cause:** `backend/ai/moi_doctar_ai` is a sibling directory to
  `backend/app`, not an installed package, and nothing added it to
  `sys.path`, so `import moi_doctar_ai` would fail regardless of bug #1.
- **Fix:** Both entry points now add `backend/ai` to `sys.path` on startup,
  so the import succeeds however the server is launched.

---

All six fixes were exercised against a running instance of the backend
(via FastAPI's `TestClient`) and the frontend was type-checked and
production-built after the change to `modelAxios.ts`; see `CHANGELOG.md`
for the specific checks run.
