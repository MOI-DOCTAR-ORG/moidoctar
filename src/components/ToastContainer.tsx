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
      border: 'border-l-4 border-l-primary border-t-outline-variant border-r-outline-variant border-b-outline-variant',
      glow: '',
      icon: 'check_circle',
      iconColor: 'text-primary',
    },
    error: {
      border: 'border-l-4 border-l-error border-t-outline-variant border-r-outline-variant border-b-outline-variant',
      glow: '',
      icon: 'error',
      iconColor: 'text-error',
    },
    info: {
      border: 'border-l-4 border-l-primary border-t-outline-variant border-r-outline-variant border-b-outline-variant',
      glow: '',
      icon: 'info',
      iconColor: 'text-primary',
    },
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[999] flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toasts.map(t => {
        const s = severityStyles[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-5 py-4 rounded-xl bg-surface ${s.border} ${s.glow} animate-slide-up`}
          >
            <Icon icon={s.icon} size="lg" className={`icon-fill ${s.iconColor}`} />
            <p className="font-body-md flex-1">{t.message}</p>
            <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity text-secondary hover:text-primary">
              <Icon icon="close" size="sm" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
