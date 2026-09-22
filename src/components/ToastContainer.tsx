import Icon from './Icon'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export default function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  if (toasts.length === 0) return null

  const severityStyles = {
    success: {
      border: 'border-l-4 border-l-[#00ff88] border-t-[var(--glass-border)] border-r-[var(--glass-border)] border-b-[var(--glass-border)]',
      glow: 'shadow-[0_0_20px_rgba(0,255,136,0.15)]',
      icon: 'check_circle',
      iconColor: 'text-[#00ff88]',
    },
    error: {
      border: 'border-l-4 border-l-[#ff3366] border-t-[var(--glass-border)] border-r-[var(--glass-border)] border-b-[var(--glass-border)]',
      glow: 'shadow-[0_0_20px_rgba(255,51,102,0.15)]',
      icon: 'error',
      iconColor: 'text-[#ff3366]',
    },
    info: {
      border: 'border-l-4 border-l-[var(--neon-primary)] border-t-[var(--glass-border)] border-r-[var(--glass-border)] border-b-[var(--glass-border)]',
      glow: 'shadow-[0_0_20px_rgba(148,197,253,0.15)]',
      icon: 'info',
      iconColor: 'text-[var(--neon-primary)]',
    },
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[999] flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toasts.map(t => {
        const s = severityStyles[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-5 py-4 rounded-xl backdrop-blur-xl bg-[var(--glass-bg)] ${s.border} ${s.glow} animate-slide-up`}
          >
            <Icon icon={s.icon} size="lg" className={`icon-fill ${s.iconColor}`} />
            <p className="font-body-md flex-1">{t.message}</p>
            <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity text-secondary hover:text-[var(--neon-primary)]">
              <Icon icon="close" size="sm" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
