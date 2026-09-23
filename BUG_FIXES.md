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

## 7. Google Sign-In was completely fake (backend never verified anything)

- **Where:** `backend/app/services/auth_service.py` (`authenticate_google`)
- **Root cause:** The function never validated the token it received from
  the frontend against Google at all. It just checked/created a single
  hardcoded account (`google.user@moidoctar.com`) and logged whoever called
  it in as that same account, regardless of what token — real, expired, or
  completely made up — was sent.
- **Fix:** Added `_verify_google_id_token`, which sends the token to
  Google's `tokeninfo` endpoint, confirms the audience (`aud`) matches the
  configured `GOOGLE_CLIENT_ID`, and confirms the email is verified.
  `authenticate_google` now finds-or-creates the *real* user by their
  verified email instead of a shared placeholder. The endpoint
  (`backend/app/api/v1/endpoints/auth.py`) now catches the resulting
  `ValueError` and returns `401` instead of letting it fall through as an
  unhandled `500`.

## 8. Google Sign-In was unusable on the frontend (no client id was ever configured)

- **Where:** `src/main.tsx`, `src/pages/SignIn.tsx`, `src/pages/SignUp.tsx`
- **Root cause:** There was no `.env.example` anywhere in the repo, so
  `VITE_GOOGLE_CLIENT_ID` was always `undefined`. `GoogleOAuthProvider`
  received `undefined` as its `clientId`, and the `GoogleLogin` button
  rendered against a Google Identity Services client that was never
  correctly initialized.
- **Fix:** Added a root `.env.example` documenting `VITE_GOOGLE_CLIENT_ID`
  (and the existing `VITE_API_BASE_URL` / `VITE_MODEL_API_URL`, which also
  had no documented example before). `GoogleOAuthProvider` now falls back to
  a placeholder string so it doesn't throw when unset, and the "Continue
  with Google" button only renders once a real client id is present
  (`GOOGLE_AUTH_ENABLED` in `src/lib/constants.ts`), so the rest of sign-in
  works normally either way.

## 9. `/` assumed to be the dashboard in several places after adding the landing page

- **Where:** `src/layouts/AuthLayout.tsx`, `src/components/Sidebar.tsx`,
  `src/components/MobileBottomNav.tsx`, `src/layouts/AppLayout.tsx`,
  `src/pages/LocalCareDiscovery.tsx`
- **Root cause:** Adding a public landing page at `/` meant every place that
  previously treated `/` as "the authenticated dashboard" needed updating:
  the post-login redirect, the sidebar's Dashboard link and active-route
  check, the mobile bottom nav's Home tab, the page-title lookup, and a
  breadcrumb link literally labeled "Dashboard".
- **Fix:** Dashboard now lives at `/dashboard`; all five references above
  were updated to point there instead of `/`. `Landing.tsx` itself
  auto-redirects an already-authenticated visitor straight to `/dashboard`,
  so any link that still points at `/` (e.g. `NotFound.tsx`'s "back home"
  link) still resolves correctly either way.

---

All nine fixes were exercised against a running instance of the backend
(via FastAPI's `TestClient`) and the frontend was type-checked and
production-built after each round of changes; see `CHANGELOG.md` for the
specific checks run.
