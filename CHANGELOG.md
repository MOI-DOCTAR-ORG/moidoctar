# CHANGELOG — Phase 5

Phase 5 covered two HANDOFF.md TODOs: real Nearby Care data (was 100%
hardcoded) and real notification delivery (was a static, per-account seed
that didn't even work for Supabase accounts). Full detail for both is in
`HANDOFF.md` items #3 and #4.

## Nearby Care — now live data

- `src/pages/LocalCareDiscovery.tsx` previously showed the same six fake
  facilities to every user; the geolocation coords it captured were never
  used. Now queries the OpenStreetMap Overpass API (no key needed) for real
  nearby hospitals/clinics/pharmacies once location permission is granted,
  computed distance sorted nearest-first, with the old hardcoded list kept
  only as a clearly-labeled fallback.
- Also fixed the deploy failure blocking pushes to this branch
  (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`): added a root `pxxl.toml`
  setting `CI=true` for the install step, matching the fix pnpm's own error
  message suggests.

## Notifications — now real, persisted events

- `GET /user/notifications` read a `notifications` field off the `users`
  table row — a field that only exists for the local in-memory fallback,
  not for Supabase accounts, so it silently returned nothing for anyone on
  real Supabase. The dedicated `public.notifications` table already in
  `schema.sql` was never actually used anywhere in the code.
- Added `backend/app/services/notification_service.py`, backed by that
  table (or the same local fallback store `auth_service` uses), and wired
  real triggers: a new triage assessment now creates a notification
  (urgent ones flagged distinctly), and so does adding a medication
  reminder. Added `POST /user/notifications/read` and
  `DELETE /user/notifications/{id}` so mark-all-read/dismiss persist
  instead of only living in React state until the next refresh.

## Verified

- Backend: all edited files pass `python3 -m py_compile`. No existing
  tests reference the old notification shape.
- **Not build-verified this pass** — no network access in this session to
  run `pnpm install`/`vite build`/`tsc -b` or `pytest`. Please run those
  before trusting this in production.

---

# CHANGELOG — Engineering Polish Pass (Phase 4)

Phase 4 covered two things: a light-mode contrast bug on the Dashboard, and
making email verification / password reset actually real (they were
previously accept-anything stubs with no email sending at all).

## Dashboard light-mode contrast — fixed

- **Sidebar / mobile bottom nav:** `src/components/Sidebar.tsx` and
  `src/components/MobileBottomNav.tsx` hardcoded their background to a
  literal dark-navy `rgba(10,15,30,0.85/0.9)` that never changed with the
  theme, instead of the theme-aware `var(--glass-bg)` pattern the rest of
  the layout uses. Nav item text *did* follow the theme correctly, so in
  light mode it resolved to dark, near-black colors placed on a
  background that stayed dark — contrast as low as 1.08:1. Added
  theme-aware `.sidebar-surface` / `.bottom-nav-surface` classes to
  `src/index.css` (dark value unchanged, new light value added via
  `body.light`) and swapped both components to use them.
- **Hero card paragraph:** `src/pages/Dashboard.tsx`'s "Feeling unwell?"
  card description used `text-primary-fixed-dim`, a token that's
  deliberately identical in both themes, instead of the correct
  `text-on-primary-fixed-variant` token (which already existed, unused,
  and differs correctly per theme — white in light mode). Measured
  contrast went from 2.87:1 to 5.16–10.34:1 in light mode; dark mode is
  pixel-identical since both tokens already resolved to the same value
  there.
- **Reminder "Save" button:** `src/components/ReminderBanner.tsx`
  hardcoded `text-[#050816]` (the dark-mode value) instead of
  `text-on-primary`. Same fix, same reasoning.
- See `BUG_FIXES.md` #11–13 for full root-cause detail.

## Email verification / password reset — made real

- Both flows were previously stubs: `/auth/verify` accepted any code,
  `/auth/resendVerification` and `/auth/requestPasswordReset` were
  no-ops, and `/user/forgotPassword` "succeeded" without checking the
  code or changing the password. The frontend was already fully built
  for a real, gated flow — it just had nothing real behind it.
- Added `backend/app/services/otp_service.py` (6-digit codes, 10-minute
  expiry, 5-attempt limit, single-use, in-memory) and
  `backend/app/core/email.py` (SMTP sending via new `SMTP_*` settings in
  `backend/app/core/config.py` / `backend/.env.example`; falls back to
  logging the code to the console when SMTP isn't configured, so
  local/demo use keeps working without real credentials).
- Signup now creates unverified accounts and emails a code immediately.
  `/auth/verify` validates it and flips `is_verified` + issues a real
  token. Signing in to an unverified account is now correctly blocked
  (`401 account_not_verified`, with a fresh code sent) instead of
  silently logging in. `/user/forgotPassword` now actually verifies the
  reset code and changes the password.
- See `BUG_FIXES.md` #14 for full detail, including a local-fallback
  dev shortcut that had to be removed for the verification gate to be
  meaningful.
- **You still need to:** set `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD`
  in `backend/.env` for codes to actually be emailed (see
  `backend/.env.example` for a Gmail App Password example). Without it,
  codes print to the backend console so the flow is still testable.

## Verified

- Full signup → blocked-signin-while-unverified → wrong-code-rejected →
  correct-code-verifies → signin-now-succeeds flow, and the full
  request-reset → wrong-code-rejected → correct-code-resets → signin
  -with-new-password flow, both exercised end-to-end via FastAPI
  TestClient.
- Frontend type-checks (`tsc -b`) and production-builds (`vite build`)
  cleanly after the contrast changes.

---

See below for Phase 3 (auth panel background), Phase 2 (Google Sign-In +
landing page), and Phase 1 (auth enforcement + AI wiring).

## Phase 3 — Auth panel background

Phase 3 fixed a real visual bug reported from the live deployment: the
sign-in/sign-up form panel rendered as a washed-out grey instead of the
intended dark-navy theme, while the adjacent visual panel rendered
correctly.

## Grey auth panel — fixed

- **Where:** `src/components/auth/AuthShell.tsx`
- **Root cause:** The visual side of the auth screen (`<aside>`) paints its
  own solid dark gradient background directly on itself. The form side
  (`<section>`) had no background of its own at all — it relied entirely on
  the parent card's translucent `rgba(10,15,30,0.55)` overlay plus
  `backdrop-blur-xl` to read as dark navy. That composition wasn't
  rendering reliably in production (a `backdrop-filter` compositing
  difference between the local dev environment and the deployed
  Vercel/browser combination), so the form panel came out flat grey instead
  of navy while the visual panel — which doesn't depend on backdrop-blur —
  looked correct.
- **Fix:** Gave the form `<section>` its own solid gradient background
  (`linear-gradient(165deg,#0a0f1e_0%,#0d1a2d_60%,#0a1628_100%)`), matching
  the same approach the visual panel already used, instead of depending on
  backdrop compositing. This affects every screen that uses `AuthShell`:
  sign in, sign up, forgot password, OTP verification, age selection, body
  map, pinpoint pain.

## Verified

- Frontend type-checks (`tsc -b`) and production-builds (`vite build`)
  cleanly after the change.

---

See below for Phase 2 (Google Sign-In + landing page) and Phase 1 (auth
enforcement + AI wiring).


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

---

# CHANGELOG — Phase 6

Covered a live Pxxl deploy failure and the "no permissions/onboarding" gap
Peter flagged. Full detail in `HANDOFF.md` items #5 and #6.

## Pxxl deploy — root cause found and fixed

- `Static release packaging failed: invalid pxxl.toml: strict mode: fields
  in the document are missing in the target struct`, happening *after* a
  successful build, at the static-release packaging step.
- Root cause: `pxxl.toml` (root) and `backend/pxxl.toml` used snake_case
  keys (`install_command`, `build_command`, `start_command`). Pxxl's real
  schema is camelCase (confirmed against docs.pxxl.app) —
  `installCommand`, `buildCommand`, `startCommand`, `outputDirectory`,
  `packageManager`. Every key in both files was an unrecognized field,
  which strict-mode TOML deserialization rejects outright.
- Fixed both files; added `outputDirectory = "dist"` to the root one.
  **Not verified against a live redeploy** (no network access in this
  session) — please confirm the next Pxxl deploy completes.

## Onboarding tour + permissions request

- New `src/components/OnboardingTour.tsx`: a short, skippable multi-step
  tour shown once per account (scoped like the rest of the app's
  per-account local storage, so a second account on a shared device still
  sees it) after the safety disclaimer. Ends with a single button that
  requests both location (for Nearby Care) and notification (for
  reminders) permissions via `src/utils/permissions.ts`.
- New "App Permissions & Tour" section in Profile: shows live status for
  both permissions (Enabled / Blocked / Unavailable), a button to
  request them again, and a "Replay welcome tour" button.
- Neither permission is requested automatically on page load — both only
  fire from an explicit button click, which is what makes the browser's
  native prompt reliable in the first place (silent auto-prompts are
  often suppressed).

## Bug scan

- Read through the Google Sign-In path end to end (frontend button →
  `@react-oauth/google` → `AuthContext.signInWithGoogle` → `POST
  /auth/google` → `_verify_google_id_token`) — already correctly wired
  from a previous pass (see BUG_FIXES.md #7/#8); no code bug found. The
  `Error 401: invalid_client` Peter hit is a Google Cloud Console
  configuration issue (see HANDOFF.md #5), not something fixable in this
  repo.
- No leftover `console.log`/`debugger` statements or `TODO`/`FIXME`
  markers found in `src` or `backend/app`.
