# MoiDoctar: things YOU must do by hand (gitignored, never pushed)

Deadline is today. Do these in order. Stop after step 6 and submit; the rest is optional.

## 1. Cencori (AIB product #2)  ~15 min
1. Sign up at https://cencori.com with GitHub and claim the $50 credit.
2. Create a project. Go to **Project > API Keys** and copy the `csk_...` key.
3. **Project > Providers**: make sure Google / Gemini is enabled for the model `gemini-2.5-flash`.
   (README says the free tier is Gemini-only; other models need credits or your own provider key.)
4. Local test: put `CENCORI_API_KEY=csk_...` in `backend/.env`, then run:
       cd backend && python cencori_check.py
   You want `OK via Cencori`. If it says FAILED, copy the message to me.
5. In the Pxxl BACKEND project > Environment variables add:
       CENCORI_API_KEY = csk_...            (never commit this)
       CENCORI_MODEL   = gemini-2.5-flash   (optional, this is the default)
   Redeploy the backend.
6. Use the live app for a real triage chat, then open the Cencori dashboard > logs.
   Screenshot the request log. That is your proof for the judges.
   If the log is empty, the backend is silently using the Gemini fallback. Check the Pxxl
   backend logs for "Cencori gateway failed" and send it to me.

## 2. Sabilytics (AIB product #3)  ~10 min
1. Sign up at https://www.sabilytics.com and add your site: https://moidoctar8.pxxlspace.cv
2. Copy the site ID from the install snippet.
3. In the Pxxl FRONTEND project > Environment variables (these are read at BUILD time) add:
       VITE_SABILYTICS_SITE_ID = <your site id>
4. COMPARE with the snippet in your dashboard. I could not read Sabilytics' install docs, so I
   assumed `<script src="https://www.sabilytics.com/script.js" data-site-id="...">`.
   If your snippet uses a different attribute name or URL, also set:
       VITE_SABILYTICS_ATTR = <attribute name from your snippet>
       VITE_SABILYTICS_SRC  = <script url from your snippet>
5. Redeploy the frontend. Open the live site, then DevTools > Network: `script.js` from
   sabilytics.com should load with status 200. Open a few pages, wait a minute, and check that
   the visit shows in the dashboard. Screenshot it.

## 3. Pxxl (AIB product #1)  already done
Your app is deployed on Pxxl. Screenshot the deployment page too, as proof.
Optional after submitting: claim the free .cv domain (not required).

## 4. Fix before judges read the repo  ~5 min
- [ ] Confirm no real keys are committed: `git log -p | grep -i "AIza\|csk_\|re_"`
      (I found none in the current files, but I cannot see your git history.)
- [ ] Decide on HANDOFF.md and BUG_FIXES.md (internal notes). Either delete them or leave them;
      they contain nothing secret that I saw, but they look unpolished.
- [ ] Remove the hardcoded Cloudinary fallback `ditu39hqh` in src/services/cloudinary.ts
      only if you have time. Not needed for submission.

## 5. Push
    git add -A && git status     # todo.md must NOT be listed
    git commit -m "Route AI through Cencori, add Sabilytics analytics" && git push

## 6. Submission text (paste and edit)
> MoiDoctar helps Nigerians get fast, safe health triage in English and Pidgin.
> AIB products used:
> - **Cencori**: AI cloud gateway and LLM infrastructure. We route and observe every AI symptom-assessment and support-chat query through it (request logs, security filtering, cost tracking), with an automatic fallback to direct Gemini so triage stays available.
> - **Sabilytics**: website analytics for real-user traffic and discoverability.
> - **Pxxl**: deployment for both frontend and backend.
Live: https://moidoctar8.pxxlspace.cv

Add your screenshots: Cencori log, Sabilytics dashboard, Pxxl deployment.

## 7. Optional, only if time remains
- SendByte for OTP emails (replace Resend in backend/app/core/email.py).
- Byteship instead of Cloudinary for image uploads.
- Claim the Helix credits (15,000) and the Pxxl .cv domain.

## Known risks
- Cencori advertises PII filtering that blocks phone numbers/emails. If a user's symptom
  message gets blocked, the app falls back to direct Gemini, so users are not affected, but
  the request will not show in the Cencori log. Test with a plain message like
  "I have a headache and a fever".
- Photo uploads in triage go straight to Gemini, not through Cencori (image format for the
  gateway is not documented in what I could read).
- I tested the gateway code against a local fake server, not the real Cencori API (I have no key).
  The endpoint `POST https://api.cencori.com/api/ai/chat` with header `CENCORI_API_KEY` comes
  from Cencori's README. Step 1.4 confirms it works for real.
