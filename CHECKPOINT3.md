# Checkpoint 3 (verification + AI fixes)

Fixed
- AI memory: the profile re-sent on each chat turn no longer erases conditions/allergies/medications the AI learned in chat.
  Profile sync now replaces only what the profile itself supplied; edits made in AI settings are exact.
- Triage history: one row per conversation (client sends `session_id`), instead of one row per message.
- History API: `_id` is now actually returned (was a private pydantic attr, so History rows had undefined ids).
- Icon font: icons have a fixed 1em box and the font loads with display=block, so a slow/blocked font can't break layouts.
- Copy: removed "medical-grade"/"clinical-grade" claims. Memory note reads "Noted allergy" (was "allergie").

Verified end to end (real backend, fake Gemini server, headless Chromium at 390px and 1280px)
- Key failover (invalid key skipped), cooldowns, persistence of admin-added keys across restart.
- Preferences/allergies learned from chat show in AI settings with a change log; users are isolated.
- Safety floor: AI cannot lower an urgency the rule engine flagged (chest pain stays Urgent).

Setup you must do
- Backend: set ADMIN_EMAILS to your email (only admins can add keys), and GOOGLE_API_KEYS (comma separated) and/or add keys in AI settings.
- Google sign-in: same client id in VITE_GOOGLE_CLIENT_ID (frontend) and GOOGLE_CLIENT_ID (backend).
- Supabase: run backend/schema.sql (includes the app_settings table) so keys/memory survive redeploys on ephemeral hosts.

Not verified: real Gemini keys, real Google sign-in (sandbox blocks Google), icon rendering (font blocked in sandbox).
