import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

type SessionCardProps = {
  severity: 'Urgent' | 'Moderate' | 'Stable'
  condition: string
  description: string
  date: string
  statusLabel: string
  statusIcon: string
}

const severityBorderColors: Record<string, string> = {
  Urgent: 'border-l-red-500',
  Moderate: 'border-l-amber-400',
  Stable: 'border-l-green-400',
}

const severityBadgeStyles: Record<string, string> = {
  Urgent: 'bg-red-500/15 text-red-400 border border-red-500/30',
  Moderate: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  Stable: 'bg-green-500/15 text-success border border-green-500/30',
}

export default function SessionCard({
  severity,
  condition,
  description,
  date,
  statusLabel,
  statusIcon,
}: SessionCardProps) {
  const navigate = useNavigate()

  return (
    <div className={`bg-surface rounded-[16px] p-6 border border-l-4 border-outline-variant ${severityBorderColors[severity]} transition-all group`}>
      <div className="flex justify-between items-start mb-6">
        <span
          className={`px-3 py-1 rounded-full font-label-md text-xs ${severityBadgeStyles[severity]}`}
        >
          {severity}
        </span>
        <span className="font-caption text-caption text-secondary">{date}</span>
      </div>
      <h4 className="font-headline-md text-[20px] mb-2 group-hover:text-primary transition-colors">
        {condition}
      </h4>
      <p className="font-body-md text-on-surface-variant mb-8 line-clamp-2">
        {description}
      </p>
      <div className="pt-4 border-t border-outline-variant flex justify-between items-center">
        <span className="flex items-center gap-2 text-secondary text-caption">
          <Icon icon={statusIcon} size="sm" />
          {statusLabel}
        </span>
        <button onClick={() => navigate('/care-details')} className="min-h-[44px] text-primary font-label-md hover:underline flex items-center px-2">
          View Details
        </button>
      </div>
    </div>
  )
}
