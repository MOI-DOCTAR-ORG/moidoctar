# CHANGELOG — Engineering Polish Pass (Phase 2)

Phase 2 fixed Google Sign-In end-to-end and added a public landing page with
brand-accurate colors. See `BUG_FIXES.md` for root-cause detail.

## Google Sign-In — fixed

- **Backend (`backend/app/services/auth_service.py`):** `authenticate_google`
  previously ignored the token entirely and always logged everyone in as the
  same hardcoded `google.user@moidoctar.com` account. It now verifies the
  Google ID token against Google's `tokeninfo` endpoint, checks the audience
  matches `GOOGLE_CLIENT_ID`, and signs in the real user by their verified
  email (creating the account on first sign-in). Invalid/expired/forged
  tokens now correctly return `401` instead of a fake login or a crash.
- **Config:** added `GOOGLE_CLIENT_ID` to `backend/app/core/config.py` and
  `backend/.env.example`.
- **Frontend:** added a root `.env.example` with `VITE_GOOGLE_CLIENT_ID` (this
  didn't exist before, so the Google button was always initializing with no
  client id). `GoogleOAuthProvider` no longer crashes when the variable is
  unset, and the "Continue with Google" button (SignIn + SignUp) now only
  renders when a real client id is configured, so email/password sign-in is
  unaffected either way. Added `GOOGLE_AUTH_ENABLED` in
  `src/lib/constants.ts` to drive this.
- **You still need to:** create an OAuth Client ID in Google Cloud Console and
  set the same value as `VITE_GOOGLE_CLIENT_ID` (frontend `.env`) and
  `GOOGLE_CLIENT_ID` (backend `.env`).

## Landing page

- Added `src/pages/Landing.tsx`: hero, feature grid (triage, nearby care,
  symptom tracking, medications), trust strip, CTA, footer disclaimer.
  Auto-redirects signed-in visitors straight to `/dashboard`.
- Rewired routing: `/` is now the public landing page; the existing
  Dashboard moved to `/dashboard`. Updated every internal reference that
  assumed `/` was the dashboard: `AuthLayout`'s post-login redirect,
  `Sidebar.tsx` (nav link + logo link + active-route check),
  `MobileBottomNav.tsx` (same), `AppLayout.tsx`'s page-title logic, and the
  "Dashboard" breadcrumb in `LocalCareDiscovery.tsx`.

## Colors

- Checked the existing Tailwind/CSS color tokens (`src/index.css`) against
  `public/moidoctar-logo.svg`: they already matched almost exactly
  (`#2663EB` primary, `#94C5FD` light accent, `#1F3A8A` dark navy), so no
  token changes were needed. The new Landing page uses these same tokens and
  the exact logo gradient for its hero/CTA accents, so it's visually
  consistent with the rest of the app.

## Verified working end-to-end (this pass)

- Google auth: invalid/garbage tokens correctly return `401` (tested via
  FastAPI TestClient); a real token would now resolve to the real Google
  account instead of a shared demo user.
- Full auth + triage flow re-verified after the routing changes (login →
  protected route → triage) still returns `200` with real assessment data.
- Frontend type-checks (`tsc -b`) and production-builds (`vite build`)
  cleanly with the new page and routing changes.

---

See `CHANGELOG` history below for Phase 1 (auth enforcement + AI wiring).

## Phase 1 — Auth enforcement + AI wiring

This pass focused on the highest-severity issues: broken authentication and the
missing AI integration, plus the bugs that surfaced while verifying those fixes
end-to-end. See `BUG_FIXES.md` for root-cause detail on each item.

## Backend

- **AI integration (priority item):** `backend/app/services/triage_service.py`
  now calls Gemini (`backend/ai/moi_doctar_ai`) for real symptom analysis
  instead of returning keyword-placeholder text. The existing keyword engine
  is kept as a deterministic *safety floor* — the AI is only ever allowed to
  raise the assigned urgency level, never lower it — and as an automatic
  offline fallback when `GOOGLE_API_KEY` is unset or the API call fails, so
  the feature degrades gracefully instead of breaking the demo.
- **Authentication:** `get_current_user` / `get_current_admin` in
  `backend/app/api/deps.py` now correctly reject missing/invalid/expired
  tokens with `401`, and `get_current_admin` now actually checks for the
  `admin` role (`403` otherwise) instead of accepting any logged-in user.
- `backend/app/services/auth_service.py`: `get_user_by_id` no longer silently
  returns an arbitrary user when the id doesn't match; `update_user_profile`
  raises instead of writing to the wrong account.
- `backend/app/api/v1/endpoints/user.py`: handles the "user not found" case
  from the above with a proper `404` instead of an unhandled exception.
- Fixed an invalid CORS configuration (`app/main.py`) that combined
  `allow_credentials=True` with a wildcard `"*"` origin — browsers reject
  this combination outright, which would have silently broken every
  authenticated cross-origin request in deployment.
- `backend/main.py` / `backend/app/main.py`: added the `backend/ai` directory
  to `sys.path` so the `moi_doctar_ai` package is importable regardless of
  how the server is launched (`uvicorn main:app`, `uvicorn app.main:app`, or
  test harnesses).

## Frontend

- `src/lib/modelAxios.ts` was missing the `Authorization` header entirely, so
  every triage/AI request went out unauthenticated. Added the same
  bearer-token request interceptor that `apiClient` already has. This was
  latent (masked by the backend's old auth-bypass bug) and would have broken
  triage the moment auth was fixed, so it's fixed alongside it.

## Verified working end-to-end (this pass)

- Backend boots cleanly (`uvicorn`), all routers mount.
- Sign-in issues a token; protected routes reject requests with no/garbage
  token (`401`) and accept requests with a valid one.
- `/api/v1/triage` returns a real assessment, correctly falls back to the
  rule engine when no `GOOGLE_API_KEY` is configured, and logs which path
  was used.
- Frontend type-checks (`tsc -b`) and production-builds (`vite build`)
  cleanly.

## Not yet done — see "What's left" in the final chat message

This phase deliberately scoped to auth + AI integration, since those were
flagged as highest priority and because fixing them safely required tracing
the full request path from React through both axios clients into FastAPI.
The rest of the checklist in the original brief (full endpoint-by-endpoint
review, DB/model review, frontend screen-by-screen pass, admin panel,
medication/symptom services, etc.) has not been audited yet in this pass.
