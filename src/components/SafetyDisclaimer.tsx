import { useState } from 'react'
import Icon from './Icon'

const DISCLAIMER_STORAGE_KEY = 'moidoctar_disclaimer_accepted'

export function hasAcceptedDisclaimer(): boolean {
  return localStorage.getItem(DISCLAIMER_STORAGE_KEY) === 'true'
}

export function acceptDisclaimer() {
  localStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true')
}

type SafetyDisclaimerProps = {
  onAccept: () => void
}

export default function SafetyDisclaimer({ onAccept }: SafetyDisclaimerProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  const handleAccept = () => {
    acceptDisclaimer()
    onAccept()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className="bg-surface w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--glass-border)] shadow-2xl"
        style={{ animation: 'disclaimerEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <style>{`
          @keyframes disclaimerEnter { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        `}</style>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--neon-primary)]/15 flex items-center justify-center text-[var(--neon-primary)]">
              <Icon icon="health_and_safety" size="xl" />
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Welcome to MoiDoctar</h2>
              <p className="text-caption text-secondary">AI-Powered Health Triage</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <Icon icon="warning" size="lg" className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-label-md text-label-md text-amber-600 dark:text-amber-400 font-bold mb-1">
                    Non-Clinical Disclaimer
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    MoiDoctar does <strong>not</strong> diagnose illnesses, prescribe medications, alter drug dosages,
                    replace qualified medical professionals, or guarantee facility availability, operating hours, or wait times.
                    All results serve strictly as <strong>informational guidance indicators</strong> rather than definitive medical conclusions.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <Icon icon="emergency" size="lg" className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-label-md text-label-md text-blue-600 dark:text-blue-400 font-bold mb-1">
                    Emergency Situations
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    If you are experiencing a medical emergency, please <strong>call your local emergency number immediately</strong>
                    (e.g., 911 in the US, 112 in Europe, 199 in Nigeria).
                    Do not rely on this application for emergency medical guidance.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <Icon icon="verified_user" size="lg" className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-label-md text-label-md text-green-600 dark:text-green-400 font-bold mb-1">
                    Data & Privacy
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    Your health data is encrypted and stored securely. We comply with applicable data protection regulations.
                    Your information is used solely to provide you with personalized health guidance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer mb-6 group">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-outline text-primary focus:ring-primary/30 focus:ring-2 transition-colors cursor-pointer"
            />
            <span className="text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors leading-relaxed">
              I understand that MoiDoctar provides <strong>guidance only</strong> and does not replace professional medical advice.
              I have read and agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!acknowledged}
            className="w-full min-h-14 rounded-2xl font-label-md text-label-md font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-accent)] text-white shadow-[0_0_24px_rgba(148,197,253,0.25)] hover:shadow-[0_0_32px_rgba(148,197,253,0.35)] hover:-translate-y-0.5 active:translate-y-0"
          >
            <Icon icon="check_circle" size="md" />
            I Understand & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
