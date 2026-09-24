import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { scopeKey } from '../utils/storage'
import { api, getAccessToken, setTokens, clearTokens } from '../services/api'

// ---------- Types ----------

export type BackendUser = {
  _id: string
  userName: string
  email: string
  isVerified: boolean
  role: 'user' | 'admin'
  demographics?: {
    gender?: string
    age?: string
    currentCondition?: string
    bloodType?: string
    country?: string
  }
  phone?: string
  preference?: {
    emailNotification: boolean
    smsAlert: boolean
    twoFactorAuth: boolean
  }
  notifications?: Array<{ message: string; date: string }>
  createdAt?: string
  lastLogin?: string
}

export type TriageSession = {
  id: string
  date: string
  time: string
  condition: string
  description: string
  severity: 'Urgent' | 'Moderate' | 'Stable'
  statusLabel: string
  statusIcon: string
  tags?: string[]
  summary?: string
  severityClass?: string
  severityIcon?: string
  conditions?: string[]
  recommendedActions?: string[]
  redFlags?: string[]
  rationale?: string
}

type AuthTokens = { authorization: string; refreshToken: string }
type VerifyResponse = { msg: string; authorization?: string; refreshToken?: string }

type LoginResult =
  | { success: true }
  | { success: false; error: string; needsVerification?: true; pendingEmail?: string }
type SignUpResult = { success: true } | { success: false; error: string }

type AuthState = {
  user: BackendUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>
  signUp: (fullName: string, email: string, password: string) => Promise<SignUpResult>
  signInWithGoogle: (token: string, tokenType?: 'id_token' | 'access_token') => Promise<LoginResult>
  verifyEmail: (code: string, email?: string) => Promise<boolean>
  resendVerificationCode: (email?: string) => Promise<{ msg?: string; dev_code?: string } | void>
  signOut: () => Promise<void>
  sessions: TriageSession[]
  addSession: (session: TriageSession) => void
  removeSession: (id: string) => void
  refreshSessions: () => Promise<void>
  userChangeKey: number
}

// ---------- Helpers ----------

function loadSessions(): TriageSession[] {
  try {
    const data = localStorage.getItem(scopeKey('doctarr_sessions'))
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

function saveSessions(sessions: TriageSession[]) {
  try { localStorage.setItem(scopeKey('doctarr_sessions'), JSON.stringify(sessions)) } catch {}
}

async function fetchUser(): Promise<BackendUser | null> {
  try {
    const res = await api.get<{ msg: string; data: BackendUser }>('/user/listData')
    return res.data ?? null
  } catch { return null }
}

function seedLocalStorage(user: BackendUser) {
  try { localStorage.setItem('doctarr_current_user_email', user.email) } catch {}
  try { localStorage.setItem(scopeKey('doctarr_name'), user.userName) } catch {}
}

function mapApiError(err: unknown): string {
  const e = err as { err?: string; status?: number; msg?: string; detail?: { err?: string; msg?: string } }
  const code = e?.err || e?.detail?.err
  switch (code) {
    case 'account_exist': return 'This email is already registered. Log in instead?'
    case 'invalid_account': return 'Incorrect email or password. If you do not have an account yet, please sign up first.'
    case 'invalid_google_token': return 'Google sign-in failed. Please try again or use email login.'
    case 'account_restricted': return 'Your account has been restricted. Contact support.'
    case 'account_not_verified': return 'Please verify your email before signing in.'
    default: return e?.msg || e?.detail?.msg || 'Something went wrong. Please try again.'
  }
}

// ---------- Context ----------

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false, isLoading: true })
  const [sessions, setSessions] = useState<TriageSession[]>(loadSessions)
  const [userChangeKey, setUserChangeKey] = useState(0)

  const refreshSessions = useCallback(async () => {
    try {
      const res = await api.get<{ msg: string; data: Array<{
        _id: string
        symptoms: string[]
        duration?: string
        severity?: 'Mild' | 'Moderate' | 'Severe' | string
        notes?: string
        triageStatus?: { level: string }
        actionPlan?: string
        createdAt?: string
        possible_conditions?: string[]
        recommended_actions?: string[]
        urgency_level?: string
        rationale?: string
      }> }>('/triage/list')

      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        const fetched: TriageSession[] = res.data.map(item => {
          const urg = item.urgency_level || (item.triageStatus?.level === 'Emergency' ? 'Urgent' : item.triageStatus?.level === 'Urgent' ? 'Moderate' : 'Stable')
          const sev: 'Urgent' | 'Moderate' | 'Stable' = urg === 'Urgent' ? 'Urgent' : urg === 'Moderate' ? 'Moderate' : 'Stable'
          const dateObj = item.createdAt ? new Date(item.createdAt) : new Date()
          return {
            id: item._id,
            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            condition: Array.isArray(item.symptoms) && item.symptoms.length > 0 ? item.symptoms.join(', ') : 'Reported symptoms',
            description: item.rationale || item.actionPlan || item.notes || 'Triage completed',
            severity: sev,
            statusLabel: item.triageStatus?.level || urg,
            statusIcon: sev === 'Urgent' ? 'warning' : 'clinical_notes',
            tags: item.possible_conditions?.length ? item.possible_conditions : [item.severity || 'Evaluated'],
            conditions: item.possible_conditions,
            recommendedActions: item.recommended_actions,
            rationale: item.rationale || item.notes,
          }
        })

        setSessions(prev => {
          const map = new Map<string, TriageSession>()
          fetched.forEach(s => map.set(s.id, s))
          prev.forEach(s => {
            if (!map.has(s.id)) map.set(s.id, s)
          })
          const merged = Array.from(map.values())
          saveSessions(merged)
          return merged
        })
      }
    } catch {
      // ignore
    }
  }, [])

  // Restore session on mount
  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setState({ user: null, isAuthenticated: false, isLoading: false })
      return
    }
    fetchUser().then(user => {
      if (user?.isVerified) {
        seedLocalStorage(user)
        setState({ user, isAuthenticated: true, isLoading: false })
        void refreshSessions()
      } else {
        clearTokens()
        setState({ user: null, isAuthenticated: false, isLoading: false })
      }
    })
  }, [refreshSessions])

  useEffect(() => { saveSessions(sessions) }, [sessions])

  const signIn = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await api.post<AuthTokens>('/auth/manualAuthentication', {
        type: 'SIGNIN_MANUALLY',
        email: email.toLowerCase().trim(),
        password,
      }, null)
      setTokens(res.authorization, res.refreshToken)
      const user = await fetchUser()
      if (!user) return { success: false, error: 'Could not load user data.' }
      seedLocalStorage(user)
      setState({ user, isAuthenticated: true, isLoading: false })
      setUserChangeKey(k => k + 1)
      void refreshSessions()
      return { success: true }
    } catch (err) {
      const e = err as { err?: string; authorization?: string; msg?: string }
      if (e?.err === 'account_not_verified' && e.authorization) {
        // Store the temp token so the verify page can call /auth/verify
        setTokens(e.authorization, '')
        return {
          success: false,
          error: "Your email is not verified. We've sent a fresh code — check your inbox.",
          needsVerification: true,
          pendingEmail: email.toLowerCase().trim(),
        }
      }
      return { success: false, error: mapApiError(err) }
    }
  }, [])

  const signUp = useCallback(async (fullName: string, email: string, password: string): Promise<SignUpResult> => {
    try {
      const res = await api.post<AuthTokens>('/auth/manualAuthentication', {
        type: 'SIGNUP_MANUALLY',
        email: email.toLowerCase().trim(),
        password,
        fullName,
      }, null)
      setTokens(res.authorization, res.refreshToken)
      return { success: true }
    } catch (err) {
      return { success: false, error: mapApiError(err) }
    }
  }, [])

  const signInWithGoogle = useCallback(async (accessToken: string, tokenType: 'id_token' | 'access_token' = 'id_token'): Promise<LoginResult> => {
    try {
      const res = await api.post<AuthTokens>('/auth/google', { accessToken, tokenType }, null)
      setTokens(res.authorization, res.refreshToken)
      const user = await fetchUser()
      if (!user) return { success: false, error: 'Could not load user data.' }
      seedLocalStorage(user)
      setState({ user, isAuthenticated: true, isLoading: false })
      setUserChangeKey(k => k + 1)
      void refreshSessions()
      return { success: true }
    } catch (err) {
      return { success: false, error: mapApiError(err) }
    }
  }, [refreshSessions])

  const verifyEmail = useCallback(async (code: string, email?: string): Promise<boolean> => {
    try {
      const res = await api.post<VerifyResponse>('/auth/verify', {
        verificationCode: code,
        email: email && email !== 'your email' ? email.toLowerCase().trim() : undefined,
      })
      if (res.authorization && res.refreshToken) {
        setTokens(res.authorization, res.refreshToken)
      }
      const user = await fetchUser()
      if (!user) return false
      seedLocalStorage(user)
      setState({ user, isAuthenticated: true, isLoading: false })
      setUserChangeKey(k => k + 1)
      void refreshSessions()
      return true
    } catch { return false }
  }, [refreshSessions])

  const resendVerificationCode = useCallback(async (email?: string) => {
    try {
      const res = await api.post<{ msg?: string; dev_code?: string }>(
        '/auth/resendVerification',
        email && email !== 'your email' ? { email: email.toLowerCase().trim() } : undefined
      )
      return res
    } catch { /* silent — toast is shown by the caller */ }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout', undefined)
    } catch { /* best-effort logout */ }
    clearTokens()
    try { localStorage.removeItem('doctarr_current_user_email') } catch {}
    setState({ user: null, isAuthenticated: false, isLoading: false })
    setSessions([])
    setUserChangeKey(k => k + 1)
  }, [])

  const addSession = useCallback((session: TriageSession) => {
    setSessions(prev => [session, ...prev])
  }, [])

  const removeSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithGoogle, verifyEmail, resendVerificationCode, signOut, sessions, addSession, removeSession, refreshSessions, userChangeKey }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
