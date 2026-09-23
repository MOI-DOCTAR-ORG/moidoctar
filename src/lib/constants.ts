export const APP_NAME = 'MoiDoctar'
export const APP_TAGLINE = 'Health Triage'

// Google Sign-In only works once a real OAuth client id is configured
// (see .env.example). Pages should hide/disable the Google button when
// this is false rather than letting the Google SDK throw at runtime.
export const GOOGLE_AUTH_ENABLED = Boolean(
  import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your-client-id.apps.googleusercontent.com',
)
