import { useState } from 'react'
import Icon from './Icon'
import { useNavigate } from 'react-router-dom'
import { EMERGENCY_NUMBERS } from '../lib/triageDisplay'
import { useAiMemory } from '../hooks/useMoiDoctor'

type EmergencyEscalationProps = {
  urgencyLevel: string
  redFlags: string[]
  /** Heading override, so the panel never contradicts the result's own urgency badge. */
  title?: string
  subtitle?: string
}

export default function EmergencyEscalation({ urgencyLevel, redFlags, title, subtitle }: EmergencyEscalationProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)
  const own = useAiMemory().data?.preferences.emergency_number?.replace(/[^\d+]/g, '')

  const isEmergency = ['emergency', 'high', 'urgent'].includes(urgencyLevel.toLowerCase())
  if (!isEmergency) return null

  // Nigeria's numbers, with the one the user set in Assistant Settings first.
  const emergencyNumbers = own && !EMERGENCY_NUMBERS.some((n) => n.number === own)
    ? [{ label: 'Your emergency number', number: own, icon: 'call' }, ...EMERGENCY_NUMBERS]
    : EMERGENCY_NUMBERS

  return (
    <div className="rounded-2xl border-2 border-red-500/40 bg-red-500/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center animate-pulse">
            <Icon icon="emergency" size="lg" className="text-red-500" />
          </div>
          <div>
            <h3 className="font-label-md text-label-md text-red-600 dark:text-red-400 font-bold uppercase tracking-wide">
              {title ?? 'Urgent Care Recommended'}
            </h3>
            <p className="text-caption text-secondary">{subtitle ?? 'Immediate medical attention may be needed'}</p>
          </div>
        </div>
        <Icon icon={expanded ? 'expand_less' : 'expand_more'} size="lg" className="text-red-500" />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {redFlags.length > 0 && (
            <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
              <h4 className="font-label-md text-label-md text-red-600 dark:text-red-400 font-bold mb-2 flex items-center gap-2">
                <Icon icon="warning" size="sm" />
                Critical Warning Signs
              </h4>
              <ul className="space-y-1.5">
                {redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-body-sm text-red-700 dark:text-red-300">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {emergencyNumbers.map((item) => (
              <a
                key={item.number}
                href={`tel:${item.number}`}
                className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/15 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <Icon icon={item.icon} size="md" className="text-red-500" />
                </div>
                <div>
                  <p className="font-label-md text-label-md text-red-600 dark:text-red-400 font-bold">{item.number}</p>
                  <p className="text-caption text-secondary">{item.label}</p>
                </div>
              </a>
            ))}
          </div>

          <div className="p-3 bg-surface border border-outline-variant rounded-xl">
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              <strong>Important:</strong> If you are experiencing chest pain, difficulty breathing, severe bleeding,
              loss of consciousness, or any life-threatening symptoms, <strong>call emergency services immediately</strong> before
              using this app.
            </p>
          </div>

          <button
            onClick={() => navigate('/care-details')}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Icon icon="local_hospital" size="md" />
            View Care Details & Find Nearby Help
          </button>
        </div>
      )}
    </div>
  )
}
