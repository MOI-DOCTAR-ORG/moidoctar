import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { api } from '../services/api'

interface Notification {
  id: number
  category: string
  barClass: string
  icon: string
  iconBg: string
  iconColor: string
  title: string
  time: string
  body: string
  actions?: { label: string; primary: boolean; to?: string }[]
  read: boolean
}

export default function Notifications() {
  const navigate = useNavigate()
  const { sessions } = useAuth()

  const buildLocalNotifications = (): Notification[] => {
    const items: Notification[] = []
    const now = Date.now()
    sessions.slice(0, 3).forEach((s, i) => {
      items.push({
        id: now + i,
        category: s.severity === 'Urgent' ? 'Urgency Alerts' : 'Session Updates',
        barClass: s.severity === 'Urgent' ? 'bg-error' : 'bg-primary',
        icon: s.severity === 'Urgent' ? 'warning' : 'clinical_notes',
        iconBg: s.severity === 'Urgent' ? 'bg-error-container' : 'bg-primary-container/10',
        iconColor: s.severity === 'Urgent' ? 'text-error' : 'text-primary',
        title: `${s.condition} — ${s.severity}`,
        time: s.date,
        body: s.description,
        actions: [{ label: 'View Details', primary: true, to: '/care-details' }],
        read: false,
      })
    })
    if (sessions.length === 0) {
      items.push({
        id: now + 100,
        category: 'Getting Started',
        barClass: 'bg-primary',
        icon: 'rocket_launch',
        iconBg: 'bg-primary-container/10',
        iconColor: 'text-primary',
        title: 'Welcome to MoiDoctar',
        time: 'Just now',
        body: 'Start a triage session to log your symptoms and get AI-powered health guidance.',
        actions: [{ label: 'Start Triage', primary: true, to: '/new-triage' }],
        read: false,
      })
    }
    return items
  }

  const [notifications, setNotifications] = useState<Notification[]>(buildLocalNotifications)

  // Fetch backend notifications and prepend them
  useEffect(() => {
    api.get<{ msg: string; data: { message: string; date: string }[] }>('/user/notifications')
      .then(res => {
        if (!res.data?.length) return
        const backendItems: Notification[] = res.data.map((n, i) => ({
          id: Date.now() + 1000 + i,
          category: 'System',
          barClass: 'bg-tertiary',
          icon: 'notifications',
          iconBg: 'bg-surface-container-high',
          iconColor: 'text-secondary',
          title: n.message,
          time: new Date(n.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          body: '',
          read: true,
        }))
        setNotifications(prev => [...backendItems, ...prev])
      })
      .catch(() => {/* silent — local notifications still show */})
  }, [])

  const [activeTab, setActiveTab] = useState('All')

  const dismiss = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const filteredNotifications = activeTab === 'All'
    ? notifications
    : activeTab === 'Unread'
      ? notifications.filter((n) => !n.read)
      : notifications

  const grouped = filteredNotifications.reduce<Record<string, Notification[]>>((acc, n) => {
    if (!acc[n.category]) acc[n.category] = []
    acc[n.category].push(n)
    return acc
  }, {})

  const tabs = ['All', 'Unread', 'Important']

  return (
    <main className="min-h-[100dvh] bg-background text-on-background">
      <div className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter py-stack-lg">
        <div className="overflow-x-auto mb-8"><div className="flex gap-2">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={'px-5 py-2 rounded-full font-label-md text-label-md transition-all min-h-[44px] ' + (activeTab === tab ? 'bg-[var(--neon-primary)] text-white shadow-sm shadow-[var(--neon-primary)]/20' : 'text-secondary hover:text-[var(--neon-primary)] hover:bg-[var(--glass-bg)]')}>
              {tab}
            </button>
          ))}
        </div></div>

        <div className="flex flex-col gap-10">
          {Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 mb-5 bg-[var(--neon-primary)]/10 rounded-full flex items-center justify-center text-[var(--neon-primary)]">
                <Icon icon="notifications_off" size="2xl" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">No notifications yet</h3>
              <p className="font-body-md text-secondary text-center max-w-sm">You will see alerts for triage updates, medication reminders, and health insights here once available.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => {
              const barClass = items[0]?.barClass || 'bg-[var(--neon-primary)]'
              return (
                <section key={category}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-6 rounded-full ${barClass}`} />
                      <h3 className="font-headline-md text-headline-md text-on-surface">{category}</h3>
                    </div>
                    {category === 'Urgency Alerts' && (
                      <button onClick={markAllRead} className="text-[var(--neon-primary)] font-label-md text-label-md hover:underline">Mark all as read</button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {items.map((n) => (
                      <div key={n.id} className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-3 md:p-5 flex items-start gap-3 md:gap-4 transition-all hover:border-[var(--neon-primary)]/30 hover:shadow-[0_0_20px_rgba(148,197,253,0.08)] relative group">
                        <div className={`w-12 h-12 rounded-full ${n.iconBg} flex items-center justify-center shrink-0`}>
                          <Icon icon={n.icon} size="lg" className={n.iconColor} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                              {n.title}
                              {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--neon-primary)]" />}
                            </h4>
                            <span className="font-caption text-caption text-secondary shrink-0">{n.time}</span>
                          </div>
                          <p className="font-body-md text-body-md text-on-surface-variant mb-4">{n.body}</p>
                          {n.actions && (
                            <div className="flex gap-3">
                              {n.actions.map((a) => a.primary ? (
                                <button key={a.label} onClick={() => a.to && navigate(a.to)} className="bg-[var(--neon-primary)] text-white px-6 py-2.5 rounded-full font-label-md text-label-md hover:opacity-90 transition-colors min-h-[44px] shadow-[0_0_16px_rgba(148,197,253,0.2)]">
                                  {a.label}
                                </button>
                              ) : (
                                <button key={a.label} onClick={() => a.to && navigate(a.to)} className="bg-[var(--glass-bg)] text-[var(--neon-primary)] border border-[var(--neon-primary)] px-6 py-2.5 rounded-full font-label-md text-label-md hover:bg-[var(--neon-primary)]/10 transition-colors min-h-[44px]">
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => dismiss(n.id)} className="opacity-0 group-hover:opacity-100 absolute top-4 right-4 p-1 text-secondary hover:text-error transition-all">
                          <Icon icon="close" size="sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
