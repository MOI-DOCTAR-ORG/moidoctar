import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { TriageSession } from '../context/AuthContext'
import Icon from '../components/Icon'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const severityConfig: Record<string, { badge: string; border: string; icon: string; label: string }> = {
  Urgent: {
    badge: 'bg-error/15 text-error border border-error/30',
    border: 'border-l-error',
    icon: 'warning',
    label: 'Urgent',
  },
  Moderate: {
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    border: 'border-l-amber-400',
    icon: 'info',
    label: 'Moderate',
  },
  Stable: {
    badge: 'bg-green-500/15 text-success border border-green-500/30',
    border: 'border-l-green-400',
    icon: 'check_circle',
    label: 'Stable',
  },
}

/* ─── Empty State ──────────────────────────────────────────────────────────── */

function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="min-h-[70dvh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-5 bg-primary/10 rounded-full flex items-center justify-center text-primary">
        <Icon icon="local_hospital" size="2xl" />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">No triage sessions yet</h3>
      <p className="font-body-md text-body-md text-secondary max-w-md mx-auto mb-6">
        Complete a triage session with Liana to see your personalised care details here.
      </p>
      <button
        onClick={() => navigate('/new-triage')}
        className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-label-md hover:opacity-90 transition-all min-h-[44px]"
      >
        <Icon icon="add" size="md" />
        Start New Triage
      </button>
    </div>
  )
}

/* ─── Session Not Found ────────────────────────────────────────────────────── */

function SessionNotFound({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-[70dvh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-5 bg-error/10 rounded-full flex items-center justify-center text-error">
        <Icon icon="search_off" size="2xl" />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Session not found</h3>
      <p className="font-body-md text-body-md text-secondary max-w-md mx-auto mb-6">
        The session ID <code className="bg-surface px-1 rounded text-xs">{sessionId}</code> could not be found in your history.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-3 rounded-full font-label-md hover:bg-primary/10 transition-all min-h-[44px]"
        >
          <Icon icon="history" size="md" />
          View History
        </button>
        <button
          onClick={() => navigate('/new-triage')}
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-label-md hover:opacity-90 transition-all min-h-[44px]"
        >
          <Icon icon="add" size="md" />
          Start New Triage
        </button>
      </div>
    </div>
  )
}

/* ─── Session Detail View ──────────────────────────────────────────────────── */

function SessionDetail({ session }: { session: TriageSession }) {
  const navigate = useNavigate()
  const config = severityConfig[session.severity] ?? severityConfig.Stable

  return (
    <main className="min-h-[100dvh] p-4 md:p-6 max-w-[1100px] mx-auto bg-background text-on-surface font-body-md">
      {/* Breadcrumb */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-secondary mb-2">
            <button
              onClick={() => navigate('/history')}
              className="text-caption font-caption hover:text-primary transition-colors flex items-center gap-1"
            >
              <Icon icon="arrow_back" size="sm" />
              History
            </button>
            <Icon icon="chevron_right" size="sm" />
            <span className="text-caption font-caption text-primary font-bold">Care Details</span>
          </nav>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Care Details</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-caption text-secondary">
            {session.date}{session.time ? ` · ${session.time}` : ''}
          </span>
          <span className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 ${config.badge}`}>
            <Icon icon={config.icon} size="xs" />
            {config.label}
          </span>
        </div>
      </header>

      {/* Condition headline */}
      <div className={`bg-surface rounded-xl border border-l-4 border-outline-variant ${config.border} p-5 md:p-6 mb-6`}>
        <p className="text-caption text-secondary uppercase tracking-widest font-bold mb-1">Chief Complaint</p>
        <h3 className="font-headline-md text-headline-md text-on-surface">{session.condition}</h3>
        {session.description && (
          <p className="mt-2 text-body-md text-on-surface-variant leading-relaxed">{session.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — rich detail */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Possible Conditions */}
          {session.conditions && session.conditions.length > 0 && (
            <section className="bg-surface rounded-xl border border-outline-variant p-5 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                  <Icon icon="biotech" size="lg" />
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface">Possible Conditions</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.conditions.map(c => (
                  <span
                    key={c}
                    className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-md text-label-md border border-outline-variant"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Recommended Actions / Care Plan */}
          {session.recommendedActions && session.recommendedActions.length > 0 && (
            <section className="bg-surface rounded-xl border border-outline-variant p-5 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                  <Icon icon="checklist" size="lg" />
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface">Recommended Actions</h4>
              </div>
              <ol className="space-y-3">
                {session.recommendedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <p className="text-body-md text-on-surface leading-relaxed pt-0.5">{action}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Red Flags */}
          {session.redFlags && session.redFlags.length > 0 && (
            <section className="bg-error/8 rounded-xl border border-error/30 p-5 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-error/15 flex items-center justify-center text-error">
                  <Icon icon="warning" size="lg" />
                </div>
                <h4 className="font-headline-sm text-headline-sm text-error">Red Flags — Seek Help Immediately If You Notice:</h4>
              </div>
              <ul className="space-y-2">
                {session.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-on-error-container">
                    <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-error" />
                    <span className="text-body-md leading-relaxed">{flag}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Fallback if no structured data at all */}
          {!session.conditions?.length && !session.recommendedActions?.length && !session.redFlags?.length && (
            <section className="bg-surface rounded-xl border border-outline-variant p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Icon icon="psychology" size="xl" />
              </div>
              <p className="text-body-md text-secondary">
                This session was logged without structured condition data. Start a new triage with Liana for a detailed breakdown.
              </p>
            </section>
          )}
        </div>

        {/* Right column — quick actions */}
        <div className="flex flex-col gap-6">

          {/* Urgency summary card */}
          <section className="bg-surface rounded-xl border border-outline-variant p-5">
            <h4 className="font-label-md text-label-md text-secondary uppercase tracking-widest mb-3">Urgency Summary</h4>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${config.badge} mb-3`}>
              <Icon icon={config.icon} size="lg" />
              <div>
                <p className="font-bold font-label-md">{config.label}</p>
                <p className="text-caption opacity-70">
                  {session.severity === 'Urgent'
                    ? 'Immediate attention recommended'
                    : session.severity === 'Moderate'
                    ? 'See a doctor soon'
                    : 'Monitor and rest'}
                </p>
              </div>
            </div>
            <p className="text-caption text-secondary">Session logged on {session.date}</p>
          </section>

          {/* Quick Action — Find Care */}
          <section className="bg-surface rounded-xl border border-outline-variant p-5 flex flex-col gap-3">
            <h4 className="font-label-md text-label-md text-secondary uppercase tracking-widest">Quick Actions</h4>

            <button
              onClick={() => navigate('/local-care')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all group min-h-[44px]"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <Icon icon="local_hospital" size="md" />
              </div>
              <div className="text-left">
                <p className="font-label-md text-on-surface">Find Care Near Me</p>
                <p className="text-caption text-secondary">Hospitals, clinics &amp; pharmacies</p>
              </div>
              <Icon icon="chevron_right" size="sm" className="ml-auto text-secondary group-hover:text-primary" />
            </button>

            <button
              onClick={() => navigate('/new-triage')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all group min-h-[44px]"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <Icon icon="add_circle" size="md" />
              </div>
              <div className="text-left">
                <p className="font-label-md text-on-surface">Start New Triage</p>
                <p className="text-caption text-secondary">New symptoms? Ask Liana</p>
              </div>
              <Icon icon="chevron_right" size="sm" className="ml-auto text-secondary group-hover:text-primary" />
            </button>

            <button
              onClick={() => navigate('/history')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all group min-h-[44px]"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <Icon icon="history" size="md" />
              </div>
              <div className="text-left">
                <p className="font-label-md text-on-surface">All Sessions</p>
                <p className="text-caption text-secondary">View your full triage history</p>
              </div>
              <Icon icon="chevron_right" size="sm" className="ml-auto text-secondary group-hover:text-primary" />
            </button>
          </section>

          {/* Emergency call — only show for urgent */}
          {session.severity === 'Urgent' && (
            <section className="bg-error/10 rounded-xl border border-error/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="emergency" size="md" className="text-error" />
                <h4 className="font-label-md text-label-md text-error font-bold uppercase tracking-wide">
                  Emergency?
                </h4>
              </div>
              <p className="text-caption text-on-surface-variant mb-3">
                If you have chest pain, difficulty breathing, or any life-threatening symptoms, call emergency services immediately.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { number: '112', label: 'Emergency' },
                  { number: '199', label: 'Ambulance' },
                ].map(item => (
                  <a
                    key={item.number}
                    href={`tel:${item.number}`}
                    className="flex flex-col items-center gap-1 p-3 bg-error/15 border border-error/20 rounded-xl hover:bg-error/25 transition-all text-error"
                  >
                    <Icon icon="call" size="md" />
                    <span className="font-bold font-label-md">{item.number}</span>
                    <span className="text-caption text-secondary">{item.label}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 flex flex-col md:flex-row items-center justify-between p-4 md:p-5 bg-surface rounded-xl gap-4 border border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon icon="verified_user" size="md" className="text-primary" />
          </div>
          <div>
            <h4 className="font-label-md text-label-md">Medical Disclaimer</h4>
            <p className="text-caption text-secondary">This is triage guidance, not a medical diagnosis. In case of emergency, call local medical services immediately.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/new-triage')}
          className="w-full md:w-auto px-8 py-3 bg-primary text-on-primary rounded-full font-label-md flex items-center justify-center gap-2 hover:opacity-90 transition-all min-h-[44px]"
        >
          <Icon icon="add" size="md" />
          Start New Triage
        </button>
      </footer>
    </main>
  )
}

/* ─── Page Entry Point ─────────────────────────────────────────────────────── */

export default function CareDetails() {
  const { sessions, refreshSessions } = useAuth()
  const [searchParams] = useSearchParams()

  // Refresh sessions from backend on mount so data is always fresh
  useEffect(() => {
    void refreshSessions()
  }, [refreshSessions])

  const sessionId = searchParams.get('id')

  if (sessions.length === 0) {
    return <EmptyState />
  }

  if (sessionId) {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return <SessionNotFound sessionId={sessionId} />
    return <SessionDetail session={session} />
  }

  // No ID provided — show the most recent session
  return <SessionDetail session={sessions[0]} />
}
