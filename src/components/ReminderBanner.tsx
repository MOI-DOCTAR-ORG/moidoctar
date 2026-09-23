import { useState } from 'react'
import Icon from './Icon'
import { usePersistState } from '../hooks/usePersistState'
import { PremiumDateInput, PremiumInput } from './ui/PremiumFormControls'

export default function ReminderBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reminderText, setReminderText] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminders, setReminders] = usePersistState<{ text: string; date: string }[]>('doctarr_reminders', [])

  const addReminder = () => {
    if (!reminderText.trim()) return
    setReminders([...reminders, { text: reminderText, date: reminderDate || 'today' }])
    setReminderText('')
    setReminderDate('')
    setShowForm(false)
  }

  const dismissReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index))
  }

  if (dismissed && reminders.length === 0) return null

  return (
    <div className="space-y-3">
      {reminders.map((r, i) => (
        <div
          key={i}
          className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] border-l-4 border-l-[var(--neon-accent)] rounded-xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-[0_0_20px_rgba(148,197,253,0.08)]"
        >
          <Icon icon="priority_high" size="lg" className="text-[var(--neon-accent)] drop-shadow-[0_0_6px_rgba(148,197,253,0.6)]" />
          <p className="font-body-md flex-1">
            <strong>Reminder:</strong> {r.text}
            {r.date && <span className="text-sm ml-2 opacity-70">({r.date})</span>}
          </p>
          <button onClick={() => dismissReminder(i)} className="font-label-md text-[var(--neon-primary)] underline underline-offset-4">Dismiss</button>
        </div>
      ))}

      {!dismissed && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {!showForm ? (
            <>
              <p className="font-body-md text-secondary text-sm">No reminders set.</p>
              <button onClick={() => setShowForm(true)} className="text-[var(--neon-primary)] font-label-md text-sm flex items-center gap-1 hover:underline">
                <Icon icon="add" size="sm" />
                Add a health reminder
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl border border-[var(--glass-border)] p-3 shadow-[0_0_16px_rgba(148,197,253,0.06)]">
              <PremiumInput compact containerClassName="flex-1 min-w-0" placeholder="e.g. Drink more water" value={reminderText} onChange={e => setReminderText(e.target.value)} />
              <PremiumDateInput compact containerClassName="min-w-0 sm:min-w-[170px]" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
              <button onClick={addReminder} className="bg-[var(--neon-primary)] text-on-primary px-5 py-2 rounded-lg font-label-md hover:shadow-[0_0_20px_rgba(148,197,253,0.4)] transition-all min-h-[44px]">Save</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-secondary font-label-md hover:text-[var(--neon-primary)] min-h-[44px]">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
