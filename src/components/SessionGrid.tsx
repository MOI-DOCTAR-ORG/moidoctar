import { useAuth } from '../context/AuthContext'
import SessionCard from './SessionCard'
import Icon from './Icon'

export default function SessionGrid() {
  const { sessions } = useAuth()

  if (sessions.length === 0) {
    return (
      <section className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-dashed border-[var(--glass-border)] p-10 text-center shadow-[0_0_20px_rgba(148,197,253,0.06)]">
        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--neon-primary)]/10 rounded-full flex items-center justify-center text-[var(--neon-primary)]">
          <Icon icon="history" size="2xl" />
        </div>
        <h4 className="font-headline-md text-headline-md text-on-surface mb-2">No sessions yet</h4>
        <p className="font-body-md text-body-md text-secondary max-w-sm mx-auto">
          Start a new triage session to see your history here.
        </p>
      </section>
    )
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          severity={session.severity}
          condition={session.condition}
          description={session.description}
          date={session.date}
          statusLabel={session.statusLabel}
          statusIcon={session.statusIcon}
        />
      ))}
    </section>
  )
}
