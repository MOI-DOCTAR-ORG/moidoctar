import { Link } from 'react-router-dom'
import Icon from '../components/Icon'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="text-center max-w-md w-full bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] p-8 md:p-12">
        <div className="relative inline-block mb-6">
          <h1 className="font-bold text-[80px] sm:text-[100px] md:text-[120px] leading-none text-[var(--neon-primary)]" style={{ textShadow: '0 0 40px rgba(148,197,253,0.3), 0 0 80px rgba(148,197,253,0.15)' }}>
            404
          </h1>
          <div className="absolute inset-0 bg-[var(--neon-primary)]/5 blur-3xl rounded-full" />
        </div>
        <div className="w-16 h-16 mx-auto mb-6 bg-[var(--neon-primary)]/10 rounded-full flex items-center justify-center text-[var(--neon-primary)] border border-[var(--neon-primary)]/20">
          <Icon icon="explore_off" size="xl" />
        </div>
        <p className="font-headline-md text-headline-md text-on-surface mb-2">Page not found</p>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[var(--neon-primary)] text-white px-8 py-3 rounded-full font-label-md text-label-md hover:opacity-90 transition-all shadow-lg shadow-[var(--neon-primary)]/20 min-h-[44px]"
        >
          <Icon icon="arrow_back" size="md" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
