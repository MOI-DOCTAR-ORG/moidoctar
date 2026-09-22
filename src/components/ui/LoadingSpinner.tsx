export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[linear-gradient(135deg,var(--color-background)_0%,var(--color-surface-container-low)_48%,var(--color-primary-container)_100%)] px-4 py-6 text-on-background">
      <div className="w-full max-w-sm rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-8 text-center shadow-[0_24px_70px_rgba(148,197,253,0.08)] motion-safe:animate-[auth-rise-in_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
        <img src="/moidoctar-logo.svg" alt="MoiDoctar" className="mx-auto mb-5 h-24 w-24 object-contain motion-safe:animate-[auth-float-soft_5.5s_ease-in-out_infinite]" />
        <div className="relative w-10 h-10 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--glass-border)]" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--neon-primary)] animate-spin"
            style={{ filter: 'drop-shadow(0 0 6px rgba(148,197,253,0.8))' }}
          />
        </div>
        <p className="font-body-md text-secondary">{text}</p>
      </div>
    </div>
  )
}
