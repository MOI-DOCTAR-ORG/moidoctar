import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import GoogleIcon from '../GoogleIcon'
import { GOOGLE_AUTH_ENABLED } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { authSecondaryButton } from './authStyles'

type Props = {
  label?: string
  onError: (message: string) => void
}

/**
 * Always-visible "Continue with Google" button.
 * Uses Google's token flow so the button can be styled like the rest of the
 * form; the backend verifies the returned access token with Google.
 * If VITE_GOOGLE_CLIENT_ID isn't set the button still renders and explains
 * what's missing instead of silently disappearing.
 */
export default function GoogleButton({ label = 'Continue with Google', onError }: Props) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)

  const login = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setBusy(true)
      const result = await signInWithGoogle(tokenResponse.access_token, 'access_token')
      setBusy(false)
      if (!result.success) onError(result.error)
    },
    onError: () => {
      setBusy(false)
      onError('Google sign-in was cancelled or failed. Please try again.')
    },
    onNonOAuthError: () => setBusy(false),
  })

  const handleClick = () => {
    if (!GOOGLE_AUTH_ENABLED) {
      onError('Google sign-in is not set up yet. Add VITE_GOOGLE_CLIENT_ID to your .env file and restart the app.')
      return
    }
    setBusy(true)
    login()
  }

  return (
    <button type="button" onClick={handleClick} disabled={busy} className={authSecondaryButton}>
      <GoogleIcon size="md" />
      {busy ? 'Connecting to Google...' : label}
    </button>
  )
}
