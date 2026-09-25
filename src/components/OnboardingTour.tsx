import { useState } from 'react'
import Icon from './Icon'
import { scopeKey } from '../utils/storage'
import { requestLocationPermission, requestNotificationPermission, type PermissionResult } from '../utils/permissions'

const TOUR_STORAGE_KEY = 'moidoctar_tour_completed'

// Scoped per account (see scopeKey) so a second account on the same shared device still
// gets the tour on their first login, instead of it being silently skipped because a
// previous user on this device already dismissed it.
export function hasCompletedTour(): boolean {
  try {
    return localStorage.getItem(scopeKey(TOUR_STORAGE_KEY)) === 'true'
  } catch {
    return false
  }
}

export function markTourCompleted() {
  try {
    localStorage.setItem(scopeKey(TOUR_STORAGE_KEY), 'true')
  } catch { /* ignore */ }
}

// Used by the "Replay welcome tour" button in Profile.
export function resetTourCompleted() {
  try {
    localStorage.removeItem(scopeKey(TOUR_STORAGE_KEY))
  } catch { /* ignore */ }
}

// Fired by Profile's "Replay welcome tour" button; AppLayout listens for this so the tour
// can be shown again without a full page reload.
export const REPLAY_TOUR_EVENT = 'moidoctar:replay-tour'

type Step = {
  icon: string
  title: string
  body: string
}

const steps: Step[] = [
  {
    icon: 'health_and_safety',
    title: 'Welcome to MoiDoctar',
    body: "This is your health triage workspace. In a few taps you'll see how the main pieces fit together — takes less than a minute.",
  },
  {
    icon: 'chat',
    title: 'Start a triage with Liana',
    body: '"Start New Triage" on your dashboard opens a chat with Liana, your triage assistant. Describe how you feel in your own words (or tap the mic to speak) and she\u2019ll ask follow-up questions and flag how urgent it is.',
  },
  {
    icon: 'medication',
    title: 'Track symptoms & medications',
    body: 'Symptom Tracker and Medication Tracker keep a timeline of how you\u2019re doing and remind you when a dose is due.',
  },
  {
    icon: 'location_on',
    title: 'Find care nearby',
    body: 'Nearby Care shows real hospitals, clinics, and pharmacies close to you — it just needs your location to work.',
  },
]

type Props = {
  onFinish: () => void
}

export default function OnboardingTour({ onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [locationStatus, setLocationStatus] = useState<PermissionResult | 'idle' | 'requesting'>('idle')
  const [notificationStatus, setNotificationStatus] = useState<PermissionResult | 'idle' | 'requesting'>('idle')

  const isLastStep = index === steps.length - 1
  const step = steps[index]

  const finish = () => {
    markTourCompleted()
    onFinish()
  }

  const handleEnablePermissions = async () => {
    setLocationStatus('requesting')
    setNotificationStatus('requesting')
    const [loc, notif] = await Promise.all([requestLocationPermission(), requestNotificationPermission()])
    setLocationStatus(loc)
    setNotificationStatus(notif)
  }

  const statusLabel = (status: PermissionResult | 'idle' | 'requesting') => {
    if (status === 'granted') return { text: 'Enabled', className: 'text-green-600 dark:text-green-400' }
    if (status === 'denied') return { text: 'Blocked — enable in browser settings', className: 'text-error' }
    if (status === 'unsupported') return { text: 'Not available on this device', className: 'text-secondary' }
    if (status === 'requesting') return { text: 'Requesting…', className: 'text-secondary' }
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div
        className="bg-surface w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-3xl border border-outline-variant shadow-2xl"
        style={{ animation: 'disclaimerEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <style>{`
          @keyframes disclaimerEnter { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        `}</style>

        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-primary' : 'w-1.5 bg-outline-variant'}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={finish}
              className="text-xs font-medium text-secondary hover:text-on-surface transition-colors"
            >
              Skip tour
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <Icon icon={step.icon} size="xl" />
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">{step.title}</h2>
          </div>
          <p className="text-body-sm text-on-surface-variant leading-relaxed mb-6">{step.body}</p>

          {isLastStep && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl mb-6 space-y-3">
              <div className="flex items-start gap-3">
                <Icon icon="notifications" size="lg" className="text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-label-md text-label-md text-primary font-bold mb-1">
                    Turn on location & notifications
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    Needed for Nearby Care to find facilities close to you, and for medication and triage reminders to reach you. You can change these anytime in your browser or from Profile.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnablePermissions}
                disabled={locationStatus === 'requesting'}
                className="w-full min-h-12 rounded-xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 bg-primary text-on-primary hover:opacity-90"
              >
                <Icon icon="location_on" size="md" />
                Enable location & notifications
              </button>
              {(locationStatus !== 'idle' || notificationStatus !== 'idle') && (
                <div className="text-xs space-y-1 pt-1">
                  <p className={statusLabel(locationStatus)?.className}>Location: {statusLabel(locationStatus)?.text}</p>
                  <p className={statusLabel(notificationStatus)?.className}>Notifications: {statusLabel(notificationStatus)?.text}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(i => i - 1)}
                className="min-h-12 px-5 rounded-2xl font-label-md text-label-md font-bold border border-outline-variant text-on-surface hover:bg-primary/5 transition-all flex items-center gap-1"
              >
                <Icon icon="chevron_left" size="md" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLastStep ? finish() : setIndex(i => i + 1))}
              className="flex-1 min-h-12 rounded-2xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 bg-primary text-on-primary hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLastStep ? (
                <>
                  <Icon icon="check_circle" size="md" />
                  Get started
                </>
              ) : (
                <>
                  Next
                  <Icon icon="chevron_right" size="md" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
