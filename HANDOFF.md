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
Status: TODO — currently 100% hardcoded sample data, geolocation coords are captured but never used.

## 5. Google Auth — manual setup needed
Status: TODO — code is fully wired, just needs credentials. Instructions will go here.

---
