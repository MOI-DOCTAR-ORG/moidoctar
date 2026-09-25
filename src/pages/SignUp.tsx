import { useState, useMemo } from 'react'
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

export default function SignUp() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false })

  const emailError = touched.email && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordsMatch = password === confirmPassword
  const hasMinLen = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const strengthChecks = [hasMinLen, hasUpper, hasNumber, hasSpecial]
  const strengthScore = strengthChecks.filter(Boolean).length
  const isStrong = strengthScore === 4

  const strengthLabel = useMemo(() => {
    if (password.length === 0) return { text: '', color: '' }
    if (strengthScore <= 1) return { text: 'Weak', color: 'text-error' }
    if (strengthScore <= 2) return { text: 'Fair', color: 'text-amber-500' }
    if (strengthScore <= 3) return { text: 'Good', color: 'text-primary' }
    return { text: 'Strong', color: 'text-green-500' }
  }, [strengthScore, password.length])

  const strengthProgressColor = useMemo(() => {
    if (password.length === 0) return 'bg-secondary-fixed-dim'
    if (strengthScore <= 1) return 'bg-error'
    if (strengthScore <= 2) return 'bg-amber-500'
    if (strengthScore <= 3) return 'bg-primary'
    return 'bg-green-500'
  }, [strengthScore, password.length])

  const validate = () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.')
      setShakeKey(k => k + 1)
      return false
    }
    if (emailError) {
      setError('Please enter a valid email address.')
      setShakeKey(k => k + 1)
      return false
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      setShakeKey(k => k + 1)
      return false
    }
    if (!isStrong) {
      setError('Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.')
      setShakeKey(k => k + 1)
      return false
    }
    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      setShakeKey(k => k + 1)
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setTouched({ name: true, email: true, password: true, confirm: true })
    if (!validate()) return
    setIsSubmitting(true)
    const result = await signUp(fullName.trim(), email.trim(), password)
    setIsSubmitting(false)
    if (result.success) {
      navigate('/verify-email', {
        state: {
          email: email.trim(),
          emailDelivered: result.emailDelivered,
          devCode: result.devCode,
        },
      })
    } else {
      setError(result.error)
      setShakeKey(k => k + 1)
    }
  }

  const requirements = [
    { label: 'At least 8 characters', met: hasMinLen },
    { label: '1 uppercase letter', met: hasUpper },
    { label: '1 number', met: hasNumber },
    { label: '1 special character', met: hasSpecial },
  ]

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your profile and start managing your health triage history."
      maxWidthClass="max-w-[500px]"
      visualPosition="left"
      footer={
        <>
          Already have an account?{' '}
          <Link className={authLink} to="/sign-in">Log in</Link>
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
          label="Sign up with Google"
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
            <label className={authLabel} htmlFor="signup-name">Full Name</label>
            <div className={authInputFrame}>
              <Icon icon="badge" size="lg" className={authInputIcon} aria-hidden="true" />
              <input
                id="signup-name"
                className={authInput}
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, name: true }))}
                aria-required="true"
                aria-invalid={touched.name && !fullName.trim() ? true : undefined}
              />
            </div>
          </div>

          <div className={authField}>
            <label className={authLabel} htmlFor="signup-email">Email Address</label>
            <div className={emailError ? authInputFrameError : authInputFrame}>
              <Icon icon="mail" size="lg" className={authInputIcon} aria-hidden="true" />
              <input
                id="signup-email"
                className={authInput}
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, email: true }))}
                aria-required="true"
                aria-invalid={emailError || undefined}
                aria-describedby={emailError ? 'signup-email-error' : undefined}
              />
            </div>
            {emailError && (
              <p id="signup-email-error" className="font-caption text-caption text-error mt-0.5 flex items-center gap-1" role="alert">
                <Icon icon="error" size="sm" aria-hidden="true" />
                Enter a valid email address.
              </p>
            )}
          </div>

          <div className={authField}>
            <label className={authLabel} htmlFor="signup-password">Password</label>
            <div className={authInputFrame}>
              <Icon icon="lock" size="lg" className={authInputIcon} aria-hidden="true" />
              <input
                id="signup-password"
                className={`${authInput} pr-12`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, password: true }))}
                aria-required="true"
                aria-describedby="password-requirements"
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

            {password.length > 0 && (
              <div className="mt-2 space-y-2 animate-fade-in" id="password-requirements">
                <div className="flex justify-between items-center">
                  <span className="font-caption text-caption text-secondary">Password strength</span>
                  <span className={`font-caption text-caption font-medium ${strengthLabel.color}`}>{strengthLabel.text}</span>
                </div>
                <div className="h-1.5 bg-secondary-fixed-dim rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${strengthProgressColor}`}
                    style={{ width: `${(strengthScore / 4) * 100}%` }}
                  />
                </div>
                <ul className="space-y-1.5 mt-3">
                  {requirements.map((req) => (
                    <li
                      key={req.label}
                      className={`flex items-center gap-2 font-caption text-caption transition-colors duration-300 ${
                        req.met ? 'text-green-500' : 'text-secondary'
                      }`}
                    >
                      <Icon icon="check_circle" size="sm" aria-hidden="true" />
                      {req.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={authField}>
            <label className={authLabel} htmlFor="signup-confirm">Confirm Password</label>
            <div className={touched.confirm && !passwordsMatch ? authInputFrameError : authInputFrame}>
              <Icon icon="lock" size="lg" className={authInputIcon} aria-hidden="true" />
              <input
                id="signup-confirm"
                className={authInput}
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, confirm: true }))}
                aria-required="true"
                aria-invalid={touched.confirm && !passwordsMatch ? true : undefined}
              />
            </div>
            {touched.confirm && !passwordsMatch && confirmPassword.length > 0 && (
              <p className="font-caption text-caption text-error mt-0.5 flex items-center gap-1" role="alert">
                <Icon icon="error" size="sm" aria-hidden="true" />
                Passwords do not match.
              </p>
            )}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-outline text-primary focus:ring-primary/30 focus:ring-2 transition-colors cursor-pointer"
              aria-label="I agree to the Terms of Service and Privacy Policy"
            />
            <span className="font-body-md text-sm text-on-surface group-hover:text-primary transition-colors">
              I agree to the{' '}
              <a href="#" className={authLink} onClick={(e) => e.preventDefault()}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" className={authLink} onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            </span>
          </label>

          <button
            type="submit"
            disabled={!fullName.trim() || !email.trim() || !password || !confirmPassword || !agreeTerms || isSubmitting}
            className={authPrimaryButton}
            aria-label="Create your account"
          >
            {isSubmitting ? (
              <>
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
