export const APP_NAME = 'MoiDoctar'
export const APP_TAGLINE = 'Health Triage'

// Google Sign-In only works once a real OAuth client id is configured
// (see .env.example). Pages should hide/disable the Google button when
// this is false rather than letting the Google SDK throw at runtime.
//
// A real Google Web OAuth client id always looks like
// "123456789012-abc...xyz.apps.googleusercontent.com". We check the shape,
// not just "is something set", because a client id that's present but
// mistyped/truncated/copied-from-the-wrong-credential still reaches Google
// and comes back as "Error 401: invalid_client — The OAuth client was not
// found" — which is a Google Cloud Console configuration problem, not
// something this app can silently work around. Catching the obviously-wrong
// shapes here at least avoids sending those to Google's servers at all.
const GOOGLE_CLIENT_ID_PATTERN = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

export const GOOGLE_AUTH_ENABLED = Boolean(
  GOOGLE_CLIENT_ID &&
  GOOGLE_CLIENT_ID !== 'your-client-id.apps.googleusercontent.com' &&
  GOOGLE_CLIENT_ID_PATTERN.test(GOOGLE_CLIENT_ID),
)
