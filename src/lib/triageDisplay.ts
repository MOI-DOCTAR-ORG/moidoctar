import type { TriageChatResponse, Urgency } from '../types/triage'

/**
 * Fixed UI copy for each urgency level (AI Engineer Handoff, section 5).
 *
 * The screen is driven by the `urgency` value the server's rules decide. It never
 * infers urgency from the model's prose, and these labels and actions are not
 * model text.
 */
export const URGENCY_DISPLAY: Record<Urgency, { label: string; action: string; badge: string; panel: string; icon: string }> = {
  EMERGENCY: {
    label: 'Emergency',
    action: 'Call emergency services or go to the nearest emergency department now.',
    badge: 'bg-red-600 text-white',
    panel: 'border-red-500/50 bg-red-500/10',
    icon: 'emergency',
  },
  URGENT: {
    label: 'Urgent',
    action: 'Get medical help today.',
    badge: 'bg-orange-500 text-white',
    panel: 'border-orange-500/50 bg-orange-500/10',
    icon: 'warning',
  },
  SOON: {
    label: 'See a clinician soon',
    action: 'Arrange care within 24–72 hours.',
    badge: 'bg-yellow-400 text-black',
    panel: 'border-yellow-500/50 bg-yellow-400/10',
    icon: 'event',
  },
  SELF_CARE: {
    label: 'Monitor at home',
    action: 'Monitor, and seek help if symptoms get worse.',
    badge: 'bg-green-600 text-white',
    panel: 'border-green-600/40 bg-green-600/10',
    icon: 'home',
  },
  INSUFFICIENT_INFORMATION: {
    label: 'More information needed',
    action: 'Answer the next question so Liana can guide you safely.',
    badge: 'bg-gray-500 text-white',
    panel: 'border-outline-variant bg-surface-container-low',
    icon: 'help',
  },
}

/** Nigeria first: 112 is the national emergency number on every network. */
export const EMERGENCY_NUMBERS = [
  { label: 'Nigeria emergency (all networks)', number: '112', icon: 'local_hospital' },
  { label: 'Nigeria emergency (alternative line)', number: '199', icon: 'local_hospital' },
]

/** True for a server answer that uses the handoff contract (not an older saved session). */
export const usesContract = (r: TriageChatResponse | null | undefined): r is TriageChatResponse & { urgency: Urgency } =>
  Boolean(r && r.urgency && r.urgency in URGENCY_DISPLAY)

/** The legacy three-level severity the History and Care pages still read. */
export const legacySeverity = (u: Urgency): 'Urgent' | 'Moderate' | 'Stable' =>
  u === 'EMERGENCY' || u === 'URGENT' ? 'Urgent' : u === 'SOON' ? 'Moderate' : 'Stable'
