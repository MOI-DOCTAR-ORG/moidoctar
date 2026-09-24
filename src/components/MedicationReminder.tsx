import { useState, useEffect, useCallback } from 'react'
import Icon from '../components/Icon'
import { usePersistState } from '../hooks/usePersistState'

interface MedicationReminder {
  id: string
  medicationName: string
  dosage: string
  time: string
  frequency: string
  enabled: boolean
  lastNotified?: string
}

export default function MedicationReminderWidget() {
  const [reminders, setReminders] = usePersistState<MedicationReminder[]>('moidoctar_med_reminders', [])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDosage, setNewDosage] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newFrequency, setNewFrequency] = useState('daily')
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted')
    }
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setPermissionGranted(permission === 'granted')
      if (permission === 'granted') {
        checkReminders()
      }
    }
  }, [])

  const checkReminders = useCallback(() => {
    if (!permissionGranted || !('Notification' in window)) return

    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    reminders.forEach((reminder) => {
      if (!reminder.enabled) return
      if (reminder.time === currentTime && reminder.lastNotified !== currentTime) {
        new Notification(`Medication Reminder`, {
          body: `Time to take ${reminder.medicationName} - ${reminder.dosage}`,
          icon: '/moidoctar-logo.svg',
          tag: reminder.id,
        })
        setReminders(prev =>
          prev.map(r => r.id === reminder.id ? { ...r, lastNotified: currentTime } : r)
        )
      }
    })
  }, [permissionGranted, reminders, setReminders])

  useEffect(() => {
    const interval = setInterval(checkReminders, 30000)
    return () => clearInterval(interval)
  }, [checkReminders])

  const addReminder = () => {
    if (!newName.trim() || !newTime) return
    const reminder: MedicationReminder = {
      id: 'rem-' + Date.now(),
      medicationName: newName.trim(),
      dosage: newDosage.trim() || 'As prescribed',
      time: newTime,
      frequency: newFrequency,
      enabled: true,
    }
    setReminders(prev => [...prev, reminder])
    setNewName('')
    setNewDosage('')
    setNewTime('')
    setShowForm(false)
  }

  const toggleReminder = (id: string) => {
    setReminders(prev =>
      prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    )
  }

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tertiary/15 flex items-center justify-center">
            <Icon icon="notifications_active" size="lg" className="text-tertiary" />
          </div>
          <div>
            <h3 className="font-label-md text-label-md text-on-surface font-bold">Medication Reminders</h3>
            <p className="text-caption text-secondary">Never miss a dose</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Icon icon={showForm ? 'close' : 'add'} size="md" />
        </button>
      </div>

      {!permissionGranted && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon icon="notifications_off" size="md" className="text-amber-500" />
            <p className="text-caption text-amber-600 dark:text-amber-400">Enable notifications for reminders</p>
          </div>
          <button
            onClick={requestNotificationPermission}
            className="px-3 py-1.5 bg-tertiary text-on-primary rounded-lg text-caption font-bold hover:bg-amber-600 transition-colors min-h-[36px]"
          >
            Enable
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-4 p-4 bg-surface-container rounded-xl border border-outline-variant/30 space-y-3 animate-[auth-rise-in_300ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Medication name"
            className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-xl text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          <input
            type="text"
            value={newDosage}
            onChange={(e) => setNewDosage(e.target.value)}
            placeholder="Dosage (e.g., 500mg)"
            className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-xl text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="px-3 py-2.5 bg-surface border border-outline-variant rounded-xl text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            <select
              value={newFrequency}
              onChange={(e) => setNewFrequency(e.target.value)}
              className="px-3 py-2.5 bg-surface border border-outline-variant rounded-xl text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/30"
            >
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice Daily</option>
              <option value="weekly">Weekly</option>
              <option value="as_needed">As Needed</option>
            </select>
          </div>
          <button
            onClick={addReminder}
            disabled={!newName.trim() || !newTime}
            className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all min-h-[44px]"
          >
            Add Reminder
          </button>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="text-center py-8 text-secondary">
          <Icon icon="notifications_none" size="2xl" className="mx-auto mb-2 opacity-40" />
          <p className="text-caption font-caption">No reminders set. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                reminder.enabled
                  ? 'bg-surface border-outline-variant'
                  : 'bg-surface/50 border-outline-variant/50 opacity-60'
              }`}
            >
              <button
                onClick={() => toggleReminder(reminder.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  reminder.enabled
                    ? 'bg-primary/15 text-primary'
                    : 'bg-outline-variant/30 text-secondary'
                }`}
              >
                <Icon icon={reminder.enabled ? 'notifications_active' : 'notifications_off'} size="md" />
              </button>
              <div className="flex-grow min-w-0">
                <p className="font-label-md text-label-md text-on-surface font-bold truncate">{reminder.medicationName}</p>
                <p className="text-caption text-secondary">{reminder.dosage} · {reminder.time} · {reminder.frequency.replace('_', ' ')}</p>
              </div>
              <button
                onClick={() => deleteReminder(reminder.id)}
                className="p-2 text-secondary hover:text-error hover:bg-error/10 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              >
                <Icon icon="delete" size="md" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-outline-variant text-caption text-secondary italic flex items-center gap-2">
        <Icon icon="info" size="sm" />
        Reminders are for schedule tracking only and do not constitute medical advice.
      </div>
    </div>
  )
}
