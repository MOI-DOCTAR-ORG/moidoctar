import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/auth/GoogleButton'
import AuthShell from '../components/auth/AuthShell'
import {
  authDivider,
  authErrorBanner,
  authField,
  authFormStack,
  authInput,
  authInputFrame,
  authInputFrameError,
  authInputIcon,
  authLabel,
  authLink,
  authPrimaryButton,
  authSecondaryButton,
} from '../components/auth/authStyles'

export default function SignIn() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [touched, setTouched] = useState({ email: false, password: false })

  const emailError = touched.email && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const validate = () => {
    if (!email.trim() || !password) {
      setError('Incorrect email or password')
      setShakeKey(k => k + 1)
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setIsSubmitting(true)
    const result = await signIn(email.trim(), password, rememberMe)
    setIsSubmitting(false)
    if (!result.success) {
      if (result.needsVerification) {
        navigate('/verify-email', { state: { email: result.pendingEmail ?? email.trim() } })
        return
      }
      setError(result.error)
      setShakeKey(k => k + 1)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to access your health records and continue your triage workflow."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link className={authLink} to="/sign-up">Sign up</Link>
        </>
      }
    >
      <div key={shakeKey} className={`${authFormStack} ${error ? 'animate-shake' : ''}`}>
        {error && (
          <div className={authErrorBanner} role="alert" aria-live="polite">
            <Icon icon="error" size="lg" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <GoogleButton
          label="Continue with Google"
          onError={(msg) => {
            setError(msg)
            setShakeKey(k => k + 1)
          }}
        />

        <div className={authDivider} role="separator" aria-orientation="horizontal">
            or use your email
          </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className={authField}>
            <label className={authLabel} htmlFor="login-email">Email</label>
            <div className={emailError ? authInputFrameError : authInputFrame}>
              <Icon icon="mail" size="lg" className={authInputIcon} aria-hidden="true" />
              <input
                id="login-email"
                className={authInput}
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                onBlur={() => setTouched(p => ({ ...p, email: true }))}
                aria-invalid={emailError || undefined}
                aria-describedby={emailError ? 'login-email-error' : undefined}
                aria-required="true"
              />
            </div>
            {emailError && (
              <p id="login-email-error" className="font-caption text-caption text-error mt-0.5 flex items-center gap-1" role="alert">
                <Icon icon="error" size="sm" aria-hidden="true" />
                Enter a valid email address.
              </p>
            )}
          </div>

          <div className={authField}>
            <div className="flex justify-between items-center gap-4">
              <label className={authLabel} htmlFor="login-password">Password</label>
              <Link className={`${authLink} font-label-md text-label-md`} to="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <div className={authInputFrame}>
              <Icon icon="lock" size="lg" className={authInputIcon} aria-hidden="true" />
              <input
                id="login-password"
                className={`${authInput} pr-12`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onBlur={() => setTouched(p => ({ ...p, password: true }))}
                aria-required="true"
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

          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-outline text-primary focus:ring-primary/30 focus:ring-2 transition-colors cursor-pointer"
              aria-label="Remember me for 30 days"
            />
            <span className="font-body-md text-sm text-on-surface group-hover:text-primary transition-colors">Remember me for 30 days</span>
          </label>

          <button
            type="submit"
            disabled={!email.trim() || !password || isSubmitting}
            className={authPrimaryButton}
            aria-label="Log in to your account"
          >
            {isSubmitting ? (
              <>
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
