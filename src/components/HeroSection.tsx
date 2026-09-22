import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function HeroSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-gutter">
      <div className="md:col-span-2 relative overflow-hidden rounded-[16px] p-6 md:p-10 bg-gradient-to-br from-[var(--neon-primary)]/80 via-[#2763EB] to-[#1F3A8A] text-on-primary flex flex-col justify-center min-h-[220px] md:min-h-[300px] border border-[var(--neon-primary)]/20 shadow-[0_0_40px_rgba(148,197,253,0.15)]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className="absolute right-[-5%] top-[-10%] opacity-10 transform rotate-12">
          <Icon icon="health_and_safety" size="3xl" />
        </div>
        <h3 className="font-headline-lg-mobile md:font-headline-xl text-headline-lg-mobile md:text-headline-xl mb-2 md:mb-4 relative z-10">
          Check your symptoms now.
        </h3>
        <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg mb-6 md:mb-8 max-w-md opacity-90 relative z-10">
          Our AI-driven triage system provides clinical-grade guidance in under
          3 minutes.
        </p>
        <Link
          to="/new-triage"
          className="inline-block w-fit px-8 py-4 bg-white text-[var(--neon-primary)] rounded-full font-label-md text-label-md hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_24px_rgba(148,197,253,0.3)] relative z-10 min-h-[44px] flex items-center"
        >
          Start New Triage
        </Link>
      </div>

      <TrendChart />
    </section>
  )
}

const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const dayData = [
  { height: '40%', isPrimary: false },
  { height: '60%', isPrimary: false },
  { height: '85%', isPrimary: true },
  { height: '45%', isPrimary: false },
  { height: '30%', isPrimary: false },
  { height: '20%', isPrimary: false },
  { height: '25%', isPrimary: false },
]

function TrendChart() {
  return (
    <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-[16px] p-4 md:p-6 flex flex-col justify-between border border-[var(--glass-border)] shadow-[0_0_20px_rgba(148,197,253,0.08)]">
      <div>
        <h4 className="font-label-md text-label-md text-secondary mb-1">
          Symptom Trend
        </h4>
        <p className="font-headline-md text-headline-md text-on-surface">
          Stable
        </p>
      </div>

      <div className="h-32 w-full flex items-end gap-2 px-2">
        {dayData.map((day, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-lg transition-all ${
              day.isPrimary
                ? 'bg-[var(--neon-primary)] shadow-[0_0_12px_rgba(148,197,253,0.4)]'
                : 'bg-[var(--glass-border)] hover:bg-[var(--neon-primary)]/30'
            }`}
            style={{ height: day.height }}
            title={dayLabels[i]}
          />
        ))}
      </div>

      <div className="flex justify-between font-caption text-caption text-secondary px-2 mt-4">
        {dayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  )
}
