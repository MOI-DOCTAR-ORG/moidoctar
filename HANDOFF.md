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
Status: TODO

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
Status: TODO — code is fully wired, just needs credentials. Instructions will go here.

---
