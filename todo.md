# MoiDoctar: things YOU must do by hand (gitignored, never pushed)

Code is done and verified here: 160 backend tests pass, frontend builds clean.
Cencori endpoint (POST https://api.cencori.com/api/ai/chat, header CENCORI_API_KEY) matches
Cencori's public README. What remains needs your accounts/keys.

## 0. FIRST: make sure this file is not pushed
.gitignore now lists todo.md, HANDOFF.md, BUG_FIXES.md. If you ever committed them before,
gitignore does not help. Check and untrack:
    git ls-files | grep -E "todo.md|HANDOFF.md|BUG_FIXES.md"
    git rm --cached todo.md HANDOFF.md BUG_FIXES.md     # only if the line above printed them
    git status                                          # todo.md must NOT be listed

## 1. Cencori (AIB product)  ~15 min
1. Sign up at https://cencori.com with GitHub, claim the $50 credit.
2. Create a project > API Keys > copy the `csk_...` key.
3. Local test:  put CENCORI_API_KEY=csk_... in backend/.env, then
       cd backend && pip install -r requirements.txt && python cencori_check.py
   Want: `OK via Cencori`.
   If it FAILS on the model, Cencori's own README shows `groq/compound-mini` as the free-to-start
   model. Try:  CENCORI_MODEL=groq/compound-mini  in backend/.env and rerun. Keep whichever works.
4. Pxxl BACKEND project > Environment variables:
       CENCORI_API_KEY = csk_...
       CENCORI_MODEL   = (the model that worked in step 3)
   Redeploy backend.
5. Use the live app for a real triage chat (plain text like "I have a headache and fever").
   Cencori dashboard > logs: screenshot the request. That is your proof.
   Empty log = backend fell back to Gemini. Check Pxxl backend logs for "Cencori gateway failed".

## 2. Sabilytics (AIB product)  ~5 min. NO env var needed
The snippet is now written literally into the BUILT index.html by vite.config.ts (so Sabilytics'
"verify installation" can see it), with the same values as your dashboard:
    <script async src="https://www.sabilytics.com/script.js" data-site="45js3fu9vug6" data-domain="moidoctar8.pxxlspace.cv"></script>
1. Redeploy the FRONTEND (the tag only exists after a fresh build).
2. Open the live site > right-click > View Page Source: you must see the script tag in <head>.
3. DevTools > Network, filter "sabilytics": `script.js` = 200 AND a POST to `/api/e` = 200/204.
   - script.js blocked/red = ad blocker or Brave Shields. Test in a clean/incognito window.
   - /api/e fails with a CORS or redirect error = tell me the exact error text.
4. Dashboard: click "verify installation", browse a few pages, wait ~1 min, screenshot the visit.
5. Custom events now sent: signup_submitted, triage_started, triage_followup (no health data).
   They show under events in the dashboard. Screenshot those too for the judges.
Notes: localhost (npm run dev) sends nothing on purpose. If your domain changes (e.g. the free
.cv domain), set VITE_SABILYTICS_DOMAIN on the Pxxl frontend (build-time) and redeploy.

## 3. Byteship (AIB product, safe extra)  ~10 min
1. Sign up at https://byteship.dev, create project, copy `bship_...` key.
2. Local test:  cd backend && python byteship_check.py   -> want `OK via Byteship: https://...`
3. Pxxl BACKEND env:  BYTESHIP_API_KEY = bship_...   (server only, never in frontend). Redeploy.
4. Live site: Profile > change photo. Response should say provider "byteship".
   Screenshot the file in the Byteship dashboard.
   (`byteship` is already in requirements.txt, so Pxxl installs it on deploy.)

## 4. Pxxl (AIB product)  already done
Screenshot the deployment page. Optional: claim the free .cv domain and the Plus perk.
If you change domain, update CORS_ORIGINS (backend env) and the Sabilytics domain above.

## 5. Before pushing
- [ ] `git log -p | grep -iE "AIza|csk_|bship_|re_"` shows no real keys (I found none in the files).
- [ ] backend/.env is NOT committed (it is gitignored).
- [ ] Set a strong SECRET_KEY on the Pxxl backend (the .env.example value is only a placeholder).
- [ ] Optional: the hardcoded Cloudinary fallback `ditu39hqh` is in backend/app/api/v1/endpoints/user.py
      (not needed for submission).

## 6. Push
    git add -A && git status      # todo.md, HANDOFF.md, BUG_FIXES.md must NOT be listed
    git commit -m "Route AI through Cencori, add Sabilytics + Byteship" && git push

## 7. Submission text (paste and edit)
> MoiDoctar helps Nigerians get fast, safe health triage in English and Pidgin.
> AIB products used:
> - **Cencori**: Used Cencori as our AI cloud gateway and LLM infrastructure to route and observe AI symptom assessment queries (request logs, security filtering, cost tracking), with automatic fallback to direct Gemini so triage stays available.
> - **Sabilytics**: website analytics for real-user traffic and discoverability.
> - **Byteship**: storage and CDN delivery for profile photos.
> - **Pxxl**: deployment for frontend and backend.
Live: https://moidoctar8.pxxlspace.cv
Attach screenshots: Cencori log, Sabilytics dashboard, Byteship file, Pxxl deployment.

## 8. Optional
- Claim Helix credits (15,000) and the Pxxl .cv domain.
- SendByte for OTP emails (replace Resend in backend/app/core/email.py).
- Google sign-in still needs a real VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID (see HANDOFF.md #5).

## Known risks
- Cencori PII filtering may block messages with phone numbers/emails. App then falls back to
  Gemini (users unaffected) but that request won't appear in the Cencori log.
- Triage photo uploads go straight to Gemini, not through Cencori.
- The gateway code was tested against a fake local server, not the real API. Step 1.3 is the real test.
