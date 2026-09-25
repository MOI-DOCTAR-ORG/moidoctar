# MoiDoctar — handoff notes

Internal working doc. Gitignored on purpose — do not remove it from .gitignore and do not push it;
it's just a log for whoever picks this up next (including a future Claude session).

Work is being done one feature at a time. After each one: verify (typecheck/build/tests), update this
file, re-zip. Pick up wherever "IN PROGRESS" / "TODO" is marked below.

---

## 1. Skeleton UI + triage persistence — re-checked
Status: DONE

What I checked and fixed on this pass:
- Skeleton UI (`src/components/Skeleton.tsx`, used in `TriageChat.tsx`): rendering logic is correct,
  `chat.pending` / `chat.error` are mutually exclusive so no overlap, icons used all exist in the
  subset font. No bug found here.
- Triage persistence (`src/context/TriageChatContext.tsx`): **found and fixed a real bug.** The
  provider was lifted above the router in `main.tsx` (on purpose, so nav doesn't wipe the chat) —
  but that meant it no longer got caught by `AppLayout`'s `<Outlet key={userChangeKey}>` remount,
  which is the app's existing guard against one account's data leaking into another's on a shared
  device. Fixed by watching `userChangeKey` from `AuthContext` directly inside the provider and
  reloading/resetting state whenever it changes (login, logout, or switching accounts).
- Verified: `tsc --noEmit` clean, `npm run build` clean.

## 2. Nigerian English / Pidgin support
Status: DONE

Changes in `backend/app/services/triage_service.py`:
- Added a "LANGUAGE" section to the system prompt: Liana now mirrors whatever register the user
  writes in — Nigerian Pidgin, Nigerian English, or plain standard English — replying in kind, while
  keeping care-plan instructions (especially "go to hospital") unambiguous in any register.
- Added Nigerian Pidgin greetings ("how far", "abeg", "wetin dey", "how body", etc.) to the
  rule-based greeting detector, so even the offline/no-AI fallback recognizes them as a greeting
  instead of misreading them as a symptom.
- Deliberately did NOT translate the rule-based (AI-unavailable) safety-net replies into Pidgin —
  that fallback only fires when Liana can't be reached at all, and a mistranslated safety instruction
  is riskier than a plain-English one nearly everyone can read. The live AI path (the normal case)
  is where the Pidgin/Nigerian-English mirroring actually happens.
- Frontend already had `rec.lang = 'en-NG'` set for voice input — left as is, it's correct.
- Verified: backend tests 10/10 pass.

Worth doing later if you want to push this further: a small set of real example Pidgin
question/answer pairs reviewed by a Nigerian Pidgin speaker, fed into the prompt as few-shot
examples — that would tighten the AI's Pidgin further beyond just "the AI figures it out from the
instruction."

## 3. "Drop" notifications (real delivery, not just a static feed)
Status: DONE

`GET /user/notifications` only ever returned whatever was baked into a user's record at
signup (one "Welcome to MoiDoctar!" line, sometimes two) — nothing in the app ever added
to it afterwards. Worse, for **Supabase-backed accounts it silently returned nothing at
all**: it read `notifications` off the `users` row, which has no such column — the real
`public.notifications` table already in `schema.sql` was never touched anywhere in the
code.

- Added `backend/app/services/notification_service.py` — the one place that creates,
  lists, and updates notifications. Uses the `public.notifications` Supabase table when
  configured (insert/select/update/delete), or the same local in-memory user store
  `auth_service` already falls back to otherwise (added `find_local_user_record_by_id`
  to `auth_service.py` so both modules share one store instead of drifting). All writes
  are best-effort — a notification failing to save never breaks the event that
  triggered it, it just logs and moves on, same resilience pattern as the rest of this
  backend's Supabase-with-local-fallback code.
- Wired real triggers: `triage_service.save_triage_session` now creates one notification
  per *new* triage session (not on every follow-up chat turn that updates the same
  session — those return early before reaching the new code), with the message and
  urgency framing pulled from the actual assessment (flags urgent ones distinctly from
  routine ones). `POST /medication/create` now creates a "Reminder set: …" notification
  with the real medication name/dosage/time.
- `GET /user/notifications` now calls `list_notifications()` instead of reading the
  (often-empty) field off the user record — this alone fixes it for every Supabase
  account. Added `POST /user/notifications/read` (mark all read) and
  `DELETE /user/notifications/{id}` (dismiss), both persisted now instead of only
  mutating React state that reset on refresh.
- Frontend (`src/pages/Notifications.tsx`): backend items now carry their real `id` and
  `read` state from the server (previously hardcoded to `read: true` for every backend
  item, and a synthetic timestamp-based id that `dismiss`/mark-read couldn't actually
  target). `dismiss()` and `markAllRead()` now call the new endpoints in the background
  after their existing optimistic local-state update, so the UI still feels instant but
  the change now survives a refresh or a different device.
- Not in scope for this pass: push/SMS/email delivery of these (they're in-app feed
  items only, same as before) — "real delivery" here means real, persisted, per-event
  records instead of a static seed. Worth doing later if you want actual push notifications.
- Not verified end-to-end: same caveat as the Nearby Care pass — no network access in
  this session to run the backend test suite or the frontend build. Please run
  `pytest backend/tests` and `pnpm run build` before trusting this in production.

## 4. Location data (Nearby Care)
Status: DONE

`src/pages/LocalCareDiscovery.tsx` was showing the same six hardcoded facilities to
everyone; `navigator.geolocation` coords were captured into `userLocation` but nothing
ever read that state.

- Added `fetchNearbyFacilities(lat, lng)`, which queries the OpenStreetMap Overpass API
  (no key required — two mirror endpoints, `overpass-api.de` then `overpass.kumi.systems`,
  tried in order) for hospitals/clinics/pharmacies/doctors within 6 km, computes real
  distance via haversine, and sorts nearest-first. This runs automatically once
  `getCurrentPosition` succeeds.
- Mapped OSM tags to the existing `Facility` shape: `amenity`/`healthcare` tags decide
  `type`; `addr:*` tags build the address; `phone`/`contact:phone` for the phone number.
  OSM has no rating data and `opening_hours` is too free-form to parse reliably, so
  `rating`/`openNow` are now `number | null` / `boolean | null` — the UI just omits those
  chips when the data isn't there rather than showing a fake value (`openNow` only
  resolves `true` for the unambiguous `24/7` case, `null` otherwise).
- `dataProvenance` simplified from three states to two: `current` (live OSM result) and
  `prototype` (the original hardcoded array, now only used as a fallback — relabeled
  "Sample Data" so it doesn't look like a real recommendation). Falls back to it when
  geolocation is denied/unavailable, Overpass returns nothing, or every mirror fails —
  each case sets a matching `locationError` message.
- Added a loading skeleton (reusing `SkeletonLine` from `src/components/Skeleton.tsx`)
  while the Overpass request is in flight, and a small disclaimer under the provenance
  legend when live data is showing, since OSM completeness varies by area.
- Also fixed the underlying deploy failure blocking every push to this branch: pnpm was
  aborting with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` on Pxxl's non-interactive
  build server. Added a root `pxxl.toml` (matching the pattern already used in
  `backend/pxxl.toml`) with `install_command = "CI=true pnpm install --frozen-lockfile"`,
  which is exactly the fix pnpm's own error message suggests.
- Not verified end-to-end: no network access in this session to `pnpm install` and run
  `tsc -b` / `vite build`, so this pass is a careful manual read-through, not a build-
  verified one. **Please run `pnpm install && pnpm run build` before trusting this in
  production**, and watch Overpass's public rate limit if this gets real traffic (it's a
  shared free service — fine for a demo, but a paid geocoding/places API would be the
  next step for a production-scale version).

## 5. Google Auth — manual setup needed
Status: TODO — code is fully wired (see BUG_FIXES.md #7/#8), just needs real
credentials. **This cannot be fixed from inside the repo** — the "Error 401:
invalid_client / The OAuth client was not found" screenshot Peter sent means
whatever `VITE_GOOGLE_CLIENT_ID` is set on Pxxl right now either isn't a real
Google Web-application OAuth client, or is one that was deleted/disabled. Only
Peter can fix this, in Google Cloud Console + Pxxl's env var settings (see the
step-by-step in the root `.env.example`). Once he has a real client id: set
`VITE_GOOGLE_CLIENT_ID` on the frontend service and the matching `GOOGLE_CLIENT_ID`
on the backend service in Pxxl's Secrets tab, then redeploy both (Vite bakes
`VITE_*` vars in at build time, so just editing the value does nothing until
the frontend is rebuilt).

## 6. Pxxl deploy failure — root cause found and fixed
Status: DONE

`Static release packaging failed: invalid pxxl.toml: strict mode: fields in the document are missing in the target struct` — happened *after* a successful build, at the static-release packaging step.

- **Root cause:** Root `pxxl.toml` was configured with service keys (`packageManager`, `installCommand`, `buildCommand`, `outputDirectory`) at the document top level. According to official Pxxl docs (`docs.pxxl.app/routing-and-rewrites.md`), static edge releases expect `version = 1`, optional `[build]`, and `[routing]` (`spa = true`), not service-level properties at the root. Go's strict-mode TOML unmarshaler rejected the unrecognized keys.
- **Fix:** Updated `pxxl.toml` to:
  ```toml
  version = 1

  [build]
  command = "pnpm run build"
  output = "dist"

  [routing]
  spa = true
  ```
  This satisfies Pxxl's static configuration schema and enables SPA fallback for client-side routing.
- **Verification:** Verified local build (`pnpm run build`) builds cleanly into `dist/`. Pushed to `dev`, `frontend_dev`, and `backend_dev`.

---
