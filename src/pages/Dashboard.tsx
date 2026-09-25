import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import SessionGrid from '../components/SessionGrid'
import QuickActions from '../components/QuickActions'
import { scopeKey } from '../utils/storage'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 16) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { sessions } = useAuth()

  const medCount = useMemo(() => {
    try {
      const data = localStorage.getItem(scopeKey('doctarr_prescriptions'))
      return data ? JSON.parse(data).length : 0
    } catch { return 0 }
  }, [])

  const daysSinceFirstSession = useMemo(() => {
    if (sessions.length === 0) return 0
    const dates = sessions.map(s => new Date(s.date).getTime()).filter(t => !isNaN(t))
    if (dates.length === 0) return 0
    const first = Math.min(...dates)
    return Math.max(1, Math.floor((Date.now() - first) / 86400000))
  }, [sessions])

  const wellnessScore = useMemo(() => {
    if (sessions.length === 0) return null
    const severityValues: Record<string, number> = { Urgent: 30, Moderate: 60, Stable: 90 }
    const scores = sessions.map(s => severityValues[s.severity] || 50)
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [sessions])

  const stats = [
    { label: 'Total Sessions', value: sessions.length, icon: 'forum' },
    { label: 'Active Medications', value: medCount, icon: 'vaccines' },
    { label: 'Days Monitored', value: daysSinceFirstSession, icon: 'calendar_today' },
    { label: 'Wellness Score', value: wellnessScore !== null ? wellnessScore : '—', icon: 'favorite' },
  ]

  return (
    <main className="min-h-screen p-4 sm:p-5 md:p-gutter max-w-[1400px] mx-auto flex flex-col gap-4 md:gap-6">
      <header>
        <h2 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg text-on-surface">{greeting()}</h2>
        <p className="font-body-md text-secondary">Here is your health overview for today.</p>
      </header>

      {/* Primary call to action - the one thing every user needs to find instantly */}
      <div className="rounded-[24px] p-5 sm:p-8 md:p-10 text-on-primary-container relative overflow-hidden flex flex-col justify-between min-h-[200px] bg-primary-container border border-outline-variant">
        <div className="absolute right-[-5%] top-[-10%] opacity-10 transform rotate-12">
          <Icon icon="health_and_safety" size="3xl" />
        </div>
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 bg-surface/70 rounded-full px-4 py-1.5 mb-4 border border-primary/20">
            <Icon icon="verified_user" size="sm" />
            <span className="text-sm font-medium tracking-wide">AI-Powered Assessment</span>
          </div>
          <h3 className="font-headline-lg-mobile text-headline-lg-mobile md:text-headline-lg mb-2 md:mb-3">Feeling unwell?</h3>
          <p className="font-body-md text-body-md text-on-primary-fixed-variant mb-4 md:mb-6 opacity-90 leading-relaxed">
            Tell Liana what you're feeling. She'll ask a few questions and suggest how urgent it is and what to do next.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-3">
          <button onClick={() => navigate('/new-triage')} className="bg-primary text-on-primary hover:opacity-90 rounded-full px-6 py-3.5 font-label-md text-label-md transition-all flex items-center gap-2 w-fit">
            <Icon icon="add_circle" size="md" className="icon-fill" />
            Start New Triage
          </button>
          <button onClick={() => navigate('/history')} className="border border-primary/40 hover:bg-primary/10 text-primary rounded-full px-5 py-3.5 font-label-md text-label-md transition-all flex items-center gap-2 w-fit">
            <Icon icon="history" size="md" />
            Previous Triages
          </button>
        </div>
      </div>

      {/* At-a-glance numbers - one simple row, no charts to interpret */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-surface rounded-[16px] p-4 md:p-5 border border-outline-variant flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
              <Icon icon={s.icon} size="lg" className="icon-fill" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-secondary truncate">{s.label}</p>
              <p className="text-xl font-bold text-on-surface">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h3 className="font-headline-md text-headline-md text-on-surface">Recent Sessions</h3>
        {sessions.length > 0 && (
          <button onClick={() => navigate('/history')} className="text-primary font-label-md flex items-center gap-1 hover:gap-2 transition-all">
            See all activity{' '}
            <Icon icon="arrow_forward" size="sm" />
          </button>
        )}
      </div>

      <SessionGrid />
      <QuickActions />
    </main>
  )
}
