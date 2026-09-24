# UI pass (checkpoint 2)

- **Google sign-in**: `src/components/auth/GoogleButton.tsx` is now always shown on Sign in and Sign up
  (custom-styled, uses Google's token flow; backend already accepts `tokenType: "access_token"`).
  Set `VITE_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (backend) to the same OAuth client id.
  Without it the button still renders and tells you what is missing.
- **Colours**: neon/glow/glass/gradients removed. New calm teal + warm-neutral palette, defined once in
  `src/index.css` as `--rgb-*` channel tokens (so `bg-primary/10` style opacity utilities work).
- **Look**: removed animated auth panels, floating logos, glow shadows, backdrop blur, purple/cyan avatar
  gradient, "HIPAA compliant" claims. Headings use DM Sans instead of Manrope.
- **Mobile**: triage chat no longer hides its input behind the bottom nav; body map rebuilt as a
  mobile-first inline-SVG figure (no remote images); body-map / age routes moved inside the signed-in layout
  (they were unreachable when logged in).
