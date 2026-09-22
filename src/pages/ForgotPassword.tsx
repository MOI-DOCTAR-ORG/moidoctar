import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import AuthShell from '../components/auth/AuthShell'
import {
  authErrorBanner,
  authField,
  authFormStack,
  authInput,
  authInputFrame,
  authInputIcon,
  authLabel,
  authLink,
  authPrimaryButton,
  authSecondaryButton,
  authSuccessBanner,
} from '../components/auth/authStyles'
import { api } from '../services/api'

type Step = 'email' | 'reset' | 'done'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/requestPasswordReset', { email: email.trim() }, null)
      setStep('reset')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (code.length !== 6) {
      setError('Enter the full 6-digit code.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await api.post('/user/forgotPassword', { email: email.trim(), verificationCode: code, newPassword }, null)
      setStep('done')
    } catch (err) {
      const e = err as { err?: string }
      setError(e?.err === 'user_not_found' ? 'Invalid code. Please try again.' : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const title = step === 'email' ? 'Forgot password' : step === 'reset' ? 'Reset password' : 'Password updated'
  const subtitle = step === 'email'
    ? 'Enter your email and we will send you a reset code.'
    : step === 'reset'
      ? <>Enter the 6-digit code sent to <span className="font-semibold text-on-surface">{email}</span> and choose a new password.</>
      : 'Your password has been updated. You can now sign in.'

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <Link className={`${authLink} inline-flex items-center justify-center gap-1`} to="/sign-in">
          <Icon icon="arrow_back" size="sm" aria-hidden="true" />
          Back to Sign In
        </Link>
      }
    >
      <div className={authFormStack}>
        {error && (
          <div className={authErrorBanner} role="alert" aria-live="polite">
            <Icon icon="error" size="lg" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {step === 'email' && (
          <form className="flex flex-col gap-5" onSubmit={handleRequestCode}>
            <div className={authField}>
              <label className={authLabel} htmlFor="reset-email">Email Address</label>
              <div className={authInputFrame}>
                <Icon icon="mail" size="lg" className={authInputIcon} aria-hidden="true" />
                <input
                  id="reset-email"
                  className={authInput}
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              className={authPrimaryButton}
              type="submit"
              disabled={!email.trim() || loading}
            >
              {loading ? (
                <>
                  <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Sending...
                </>
              ) : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form className="flex flex-col gap-5" onSubmit={handleResetPassword}>
            <div className={authField}>
              <label className={authLabel} htmlFor="reset-code">6-Digit Code</label>
              <div className={authInputFrame}>
                <Icon icon="pin" size="lg" className={authInputIcon} aria-hidden="true" />
                <input
                  id="reset-code"
                  className={`${authInput} text-center tracking-[0.35em]`}
                  placeholder="000000"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
              </div>
            </div>

            <div className={authField}>
              <label className={authLabel} htmlFor="new-password">New Password</label>
              <div className={authInputFrame}>
                <Icon icon="lock" size="lg" className={authInputIcon} aria-hidden="true" />
                <input
                  id="new-password"
                  className={`${authInput} pr-12`}
                  placeholder="Minimum 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-1 text-secondary transition duration-200 hover:scale-105 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon icon={showPassword ? 'visibility' : 'visibility_off'} size="lg" aria-hidden="true" />
                </button>
              </div>
            </div>

            <button
              className={authPrimaryButton}
              type="submit"
              disabled={code.length !== 6 || newPassword.length < 8 || loading}
            >
              {loading ? (
                <>
                  <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Updating...
                </>
              ) : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setNewPassword(''); setError('') }}
              className={authSecondaryButton}
            >
              Try another code
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="flex flex-col gap-5">
            <div className={authSuccessBanner} role="status" aria-live="polite">
              <Icon icon="check_circle" size="lg" className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="flex-1">Your password has been updated successfully.</p>
            </div>
            <button
              onClick={() => navigate('/sign-in')}
              className={authPrimaryButton}
              type="button"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
