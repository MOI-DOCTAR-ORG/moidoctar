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

## 10. Auth form panel rendered grey instead of dark navy in production

- **Where:** `src/components/auth/AuthShell.tsx`
- **Root cause:** The two-panel auth layout has a visual/marketing side
  (`<aside>`) and a form side (`<section>`). The `<aside>` paints its own
  opaque dark gradient background. The `<section>` did not — it depended on
  the parent card's semi-transparent background plus `backdrop-blur-xl` to
  appear dark navy, which is a much less reliable way to get a specific
  color than just painting it directly. This rendered correctly in some
  environments and as flat grey in the live Vercel deployment, visible on
  both the sign-in and sign-up screens.
- **Fix:** Gave the form `<section>` the same kind of explicit, solid
  gradient background the visual panel already has, removing the
  dependency on backdrop compositing entirely.

## 11. Sidebar / mobile bottom nav unreadable in light mode

- **Where:** `src/components/Sidebar.tsx`, `src/components/MobileBottomNav.tsx`
- **Root cause:** Both persistent nav surfaces hardcoded their own
  background — `bg-[rgba(10,15,30,0.85)]` (sidebar) and
  `bg-[rgba(10,15,30,0.9)]` (bottom nav) — instead of using the
  theme-aware `var(--glass-bg)` token the rest of the layout (e.g.
  `Header` inside `AppLayout.tsx`) already uses. That literal never
  changes with the light/dark toggle, so it stayed dark navy in both
  themes. The nav item text colors (`text-secondary`, `text-on-surface`)
  *do* correctly follow the theme, so in light mode they resolved to
  dark, near-black colors meant to be read on a light page — placed on a
  background that stayed dark. Measured contrast for the hover/active
  state dropped as low as 1.08:1 (WCAG requires 4.5:1 for normal text).
- **Fix:** Added two new theme-aware tokens in `src/index.css`
  (`.sidebar-surface`, `.bottom-nav-surface`) whose dark-mode value is
  byte-for-byte identical to the old hardcoded one, with a new
  light-mode value (`rgba(255,255,255,0.85)` / `0.9`) added via a
  `body.light` override, matching the pattern already used elsewhere in
  this file (e.g. the Phase 3 auth panel fix). Swapped both components
  to use the new classes instead of the hardcoded `rgba(...)`.

## 12. Dashboard hero card paragraph nearly invisible in light mode

- **Where:** `src/pages/Dashboard.tsx`
- **Root cause:** The "Feeling unwell?" hero card's description used
  `text-primary-fixed-dim`, which maps to `--color-primary-fixed-dim` —
  a Material-3 "fixed" color role that's *intentionally identical in
  both themes* (`#94C5FD`). The card's own background gradient, though,
  is built from `--neon-primary`, which legitimately differs per theme
  (`#2663EB` light / `#94C5FD` dark). In dark mode this happened to look
  fine only because the fixed text color and the gradient's light-mode
  counterpart canceled out coincidentally. In light mode, measured
  contrast of the pale-blue text against the blue/navy gradient was
  2.87:1 — well under the WCAG AA minimum. The correct semantic token
  for "text placed on a fixed-tinted surface" already existed and was
  simply unused: `--color-on-primary-fixed-variant` (white in light
  mode, `#94C5FD` in dark mode — i.e. the same dark-mode value as
  before, by design).
- **Fix:** Swapped the class to `text-on-primary-fixed-variant`. Dark
  mode is pixel-identical (both tokens resolve to `#94C5FD` there);
  light mode contrast improves to 5.16–10.34:1 depending on where on
  the gradient the text sits.

## 13. Reminder "Save" button used a hardcoded dark-mode text color

- **Where:** `src/components/ReminderBanner.tsx` (rendered on the Dashboard)
- **Root cause:** Same pattern as #12: the button hardcoded
  `text-[#050816]` (the *dark-mode* value of `--color-on-primary`)
  instead of using the `text-on-primary` token itself. In light mode
  this put near-black text on the medium-blue `--neon-primary` button
  background (3.86:1 contrast, fails WCAG AA for normal text); in dark
  mode it happened to match the correct token's value exactly (11.08:1),
  which is why it wasn't noticed.
- **Fix:** Swapped to `text-on-primary`. Dark mode unchanged; light mode
  becomes white-on-blue (5.16:1).

## 14. Email verification / password reset was entirely fake

- **Where:** `backend/app/api/v1/endpoints/auth.py`,
  `backend/app/api/v1/endpoints/user.py`,
  `backend/app/services/auth_service.py`
- **Root cause:** `POST /auth/verify` accepted *any* 6-digit string and
  returned a fabricated token built from that string
  (`f"local_jwt_verified_{code}"`) without checking anything.
  `POST /auth/resendVerification` and `POST /auth/requestPasswordReset`
  were both no-ops that returned a canned success message. Worst of all,
  `POST /user/forgotPassword` returned `{"msg": "Password reset
  successfully"}` without validating the code *or actually changing the
  password* — the reset flow silently did nothing. There was also no OTP
  generation or email-sending anywhere in the backend, even though the
  frontend (`OtpVerification.tsx`, `ForgotPassword.tsx`,
  `AuthContext.tsx`) was already fully built and wired for a real,
  gated verification flow (it just had no real backend behind it) —
  `is_verified` was hardcoded to `True` at signup, which defeated the
  frontend's own `isVerified` gate.
- **Fix:** Added `backend/app/services/otp_service.py` (generates a
  cryptographically random 6-digit code, stores it with a 10-minute
  expiry and a 5-attempt limit, single-use) and
  `backend/app/core/email.py` (sends it via SMTP, using new
  `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`/
  `SMTP_USE_TLS`/`SMTP_USE_SSL` settings in `config.py` +
  `backend/.env.example`; logs the code to the console instead of
  sending when SMTP isn't configured, so local dev/demo keeps working
  without real credentials — same fallback philosophy already used for
  Supabase/Gemini/Google elsewhere in this backend). Wired both into:
  - **Signup:** now creates the account with `is_verified: False` and
    sends a verification OTP immediately.
  - **`/auth/verify`:** now requires the caller's bearer token
    (`Depends(get_current_user)`), checks the code against the real
    stored OTP for that user's email, and on success flips
    `is_verified` to `True` and issues a real token pair. Wrong/expired
    codes return `400`.
  - **`/auth/resendVerification`:** generates and emails a fresh OTP
    for the authenticated (but not-yet-verified) user.
  - **Sign-in with an unverified account:** `authenticate_user` now
    checks `is_verified` after the password check and, if unverified,
    sends a fresh OTP and raises a new `AccountNotVerifiedError`
    carrying a temp token; the endpoint turns that into `401` with
    `{"err": "account_not_verified", "authorization": <temp token>}`,
    which is exactly the shape `AuthContext.tsx` already expected and
    handled (it was just never triggered by the backend before).
  - **`/auth/requestPasswordReset`:** looks up the account and, only if
    it exists, generates and emails a reset-purpose OTP — but always
    returns the same generic response either way, so the endpoint can't
    be used to enumerate registered emails.
  - **`/user/forgotPassword`:** now actually verifies the reset code
    (`404 user_not_found` on a bad/expired code, matching the exact
    error string the frontend was already checking for) and, if valid,
    hashes and saves the new password via a new
    `reset_user_password()` helper.
  - Removed a local-fallback-only dev shortcut in `authenticate_user`
    that silently auto-created and logged in an account on a "sign-in"
    attempt for an unrecognized email. With `is_verified` now
    meaningful, that shortcut would have produced a client-side
    "signed in" state for an account the server still considered
    unverified. Sign-in for an unknown local-fallback email now
    correctly raises `invalid_account`, matching how the Supabase
    branch already behaved.
  - Added `get_user_by_email` and `mark_user_verified` helpers to
    `auth_service.py` to support the above.
- **You still need to:** set `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD`
  in `backend/.env` (e.g. an SMTP provider or a Gmail account with an
  App Password) for codes to actually be emailed; without it, codes are
  printed to the backend's console log so you can still test the flow.

---

All fourteen fixes across four phases were exercised end-to-end where
possible (FastAPI TestClient for backend changes, `tsc -b` + `vite build`
for every frontend change) — see `CHANGELOG.md` for the specific checks
run in each phase.
