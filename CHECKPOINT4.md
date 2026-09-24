# Checkpoint 4: merge + logo theme + Theme page

Merge
- Your latest upload (OTP email verification, password reset, richer triage history) was three-way merged with the checkpoint 3 fixes.
  Conflicts were in triage endpoint/service; both sides kept (greetings not saved + one history row per chat via session_id).

Look and feel
- Palette is the logo blue (#2763eb). Neutrals are tinted cool. Urgency colours (red/amber/green) are fixed and never follow the theme.
- Fonts: Quicksand (headings/buttons, close to the wordmark) + Nunito Sans (body). Self-hosted via @fontsource, no Google requests.
- Icon font is a 39 KB subset of Material Symbols (only icons the app uses, FILL axis kept). If you use a new icon name,
  run scripts/subset-icons.py, otherwise it shows blank.

Theme page (/theme, sidebar)
- Light / Dark / Auto, 8 preset colours, custom colour picker + hex box, live preview, reset.
- src/lib/palette.ts turns one accent colour into the full token set and adjusts it so text stays readable (WCAG AA 4.5:1).
- src/context/ThemeContext.tsx applies it; choice is stored in localStorage and applied by the boot script in index.html before first paint.
- Default token CSS in src/index.css is generated: node scripts/gen-theme-css.mjs (see header of that file).

Not verified: real Google sign-in, real Gemini keys.

Late fixes (after screenshots)
- Mobile header: History shortcut hidden below md (it duplicates the bottom nav) so the page title is no longer cut to "Dashbo...".
- Dashboard hero card used white-on-pale styling (invisible "Previous Triages" button, faint heading). Now uses theme tokens.
- Pale greens (text-green-300/400) and white-on-pale icons replaced with theme tokens (text-success / text-on-primary-container) so they read in light mode.
- Note: CareDetails and SymptomTrackerBodyMap load stock photos from lh3.googleusercontent.com. That is an external dependency; consider hosting them yourself.
