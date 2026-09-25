import { useEffect, useRef, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import GoogleIcon from '../GoogleIcon'
import { GOOGLE_AUTH_ENABLED } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { authSecondaryButton } from './authStyles'

type Props = {
  label?: string
  onError: (message: string) => void
}

// If Google itself rejects the OAuth client (e.g. "Error 401: invalid_client —
// The OAuth client was not found"), it shows that error *inside its own popup*
// and never calls our onSuccess/onError — the person is left staring at
// Google's raw error page with no way back into the app. We can't intercept
// what Google renders in that popup, but we can time-box the attempt so the
// button recovers with our own message instead of spinning forever.
const GOOGLE_POPUP_TIMEOUT_MS = 15000

/**
 * Always-visible "Continue with Google" button.
 * Uses Google's token flow so the button can be styled like the rest of the
 * form; the backend verifies the returned access token with Google.
 * If VITE_GOOGLE_CLIENT_ID isn't set (or isn't shaped like a real Google
 * client id) the button still renders and explains what's missing instead
 * of silently disappearing or sending a bad request to Google.
 */
export default function GoogleButton({ label = 'Continue with Google', onError }: Props) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const timeoutRef = useRef<number | undefined>(undefined)

  const clearPopupTimeout = () => {
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = undefined
  }

  useEffect(() => () => clearPopupTimeout(), [])

  const login = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      clearPopupTimeout()
      setBusy(true)
      const result = await signInWithGoogle(tokenResponse.access_token, 'access_token')
      setBusy(false)
      if (!result.success) onError(result.error)
    },
    onError: () => {
      clearPopupTimeout()
      setBusy(false)
      onError('Google sign-in was cancelled or failed. Please try again.')
    },
    onNonOAuthError: () => {
      clearPopupTimeout()
      setBusy(false)
    },
  })

  const handleClick = () => {
    if (!GOOGLE_AUTH_ENABLED) {
      onError('Google sign-in is not set up yet. Add a valid VITE_GOOGLE_CLIENT_ID to your .env file and restart the app.')
      return
    }
    setBusy(true)
    login()
    clearPopupTimeout()
    timeoutRef.current = window.setTimeout(() => {
      setBusy(false)
      onError(
        'Google sign-in couldn\u2019t complete. The Google OAuth client may be misconfigured (double-check VITE_GOOGLE_CLIENT_ID matches an active Web application client in Google Cloud Console). You can sign in with email and password instead.'
      )
    }, GOOGLE_POPUP_TIMEOUT_MS)
  }

  return (
    <button type="button" onClick={handleClick} disabled={busy} className={authSecondaryButton}>
      <GoogleIcon size="md" />
      {busy ? 'Connecting to Google...' : label}
    </button>
  )
}
