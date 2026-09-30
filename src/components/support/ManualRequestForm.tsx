import { useState, type FormEvent } from 'react'
import Icon from '../Icon'
import { useAuth } from '../../context/AuthContext'
import { useToastContext } from '../../context/ToastContext'
import { PremiumInput, PremiumSelect, PremiumTextarea } from '../ui/PremiumFormControls'
import { submitSupportRequest, type SubmitResult } from '../../lib/supportRequests'
import { SUPPORT_EMAIL, SUPPORT_RESPONSE_TIME } from '../../data/supportContent'
import { getDisplayName } from '../../lib/userIdentity'

// Kept in sync with CATEGORIES in backend/app/services/support_service.py — an
// unknown value is reclassified server-side as "Something else".
const REQUEST_CATEGORIES = [
  'Triage',
  'Tracking',
  'Reminders',
  'Care & safety',
  'Account & privacy',
  'Bug report',
  'Billing',
  'Something else',
]

type Errors = Partial<Record<'name' | 'email' | 'subject' | 'message', string>>

function mailtoLink(fields: { name: string; email: string; subject: string; message: string }) {
  const subject = encodeURIComponent(`[Support] ${fields.subject}`)
  const body = encodeURIComponent(
    `${fields.message}\n\n---\nFrom: ${fields.name} <${fields.email}>`,
  )
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
}

export default function ManualRequestForm() {
  const { user } = useAuth()
  const { addToast } = useToastContext()

  const [name, setName] = useState(getDisplayName(user) || '')
  const [email, setEmail] = useState(user?.email || '')
  const [category, setCategory] = useState('Something else')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)

  const validate = (): Errors => {
    const next: Errors = {}
    if (!name.trim()) next.name = 'Tell us who you are.'
    if (!email.trim()) next.email = 'We need an email to reply to.'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'That email address looks incomplete.'
    if (!subject.trim()) next.subject = 'A short summary helps us route it.'
    if (message.trim().length < 10) next.message = 'Add a little more detail (at least 10 characters).'
    return next
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const res = await submitSupportRequest({
        name: name.trim(),
        email: email.trim(),
        category,
        subject: subject.trim(),
        message: message.trim(),
        priority,
      })
      setResult(res)
      addToast(
        res.delivered ? 'Your request is with our team.' : 'Your request was saved on this device.',
        res.delivered ? 'success' : 'info',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setResult(null)
    setSubject('')
    setMessage('')
    setErrors({})
  }

  if (result) {
    const delivered = result.delivered
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6" role="status" aria-live="polite">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${delivered ? 'bg-success-container text-on-success-container' : 'bg-warning-container text-on-warning-container'}`}>
          <Icon icon={delivered ? 'check_circle' : 'schedule'} size="lg" />
        </span>
        <h3 className="mt-3 font-headline-md text-lg font-bold text-on-surface">
          {delivered ? 'Your request is with a human' : 'Your request is saved'}
        </h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          {delivered
            ? `Someone on the team will reply to ${email} — usually within ${SUPPORT_RESPONSE_TIME.toLowerCase()}.`
            : 'We could not reach the support service right now, so your message is kept on this device and sent automatically the next time you open this page.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Ticket</span>
          <span className="font-mono text-base font-bold tracking-wide text-primary">{result.ticketId}</span>
        </div>

        {!delivered && (
          <a
            href={mailtoLink({ name, email, subject, message })}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary px-5 font-label-md text-label-md text-primary transition-colors hover:bg-primary/10"
          >
            <Icon icon="mail" size="md" />
            Send it by email instead
          </a>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant pt-4">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-full bg-primary px-5 font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
          >
            Send another request
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sr-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Your name
          </label>
          <PremiumInput
            id="sr-name"
            compact
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Who are we replying to?"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className="mt-1 text-xs text-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="sr-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Email
          </label>
          <PremiumInput
            id="sr-email"
            compact
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="sr-category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            What is it about?
          </label>
          <PremiumSelect id="sr-category" compact value={category} onChange={(e) => setCategory(e.target.value)}>
            {REQUEST_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </PremiumSelect>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Priority
          </span>
          <div className="flex gap-2" role="radiogroup" aria-label="Priority">
            {([
              { value: 'normal', label: 'Normal', hint: 'When you can' },
              { value: 'urgent', label: 'Time-sensitive', hint: 'Blocks me today' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={priority === opt.value}
                onClick={() => setPriority(opt.value)}
                className={`min-h-11 flex-1 rounded-xl border px-3 py-2 text-left transition-colors ${
                  priority === opt.value
                    ? 'border-primary bg-primary/10 text-on-surface'
                    : 'border-outline-variant bg-surface-container-lowest/70 text-on-surface-variant hover:border-primary/50'
                }`}
              >
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="block text-[11px] opacity-80">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="sr-subject" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Subject
          </label>
          <PremiumInput
            id="sr-subject"
            compact
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="One line summary, e.g. “Reminder not showing on Android”"
            aria-invalid={Boolean(errors.subject)}
          />
          {errors.subject && <p className="mt-1 text-xs text-error">{errors.subject}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="sr-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Message
          </label>
          <PremiumTextarea
            id="sr-message"
            compact
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, what you expected, and anything you already tried. Screenshots can be attached when you reply to our email."
            aria-invalid={Boolean(errors.message)}
          />
          <div className="mt-1 flex items-start justify-between gap-3">
            <span className="text-xs text-error">{errors.message}</span>
            <span className="shrink-0 text-[11px] text-on-surface-variant">{message.trim().length}/4000</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-1.5 text-xs text-on-surface-variant">
          <Icon icon="schedule" size="sm" className="mt-0.5 shrink-0" />
          A person reads these — replies usually land within {SUPPORT_RESPONSE_TIME.toLowerCase()}.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Icon icon="refresh" size="md" className="animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Icon icon="send" size="md" />
              Send request
            </>
          )}
        </button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-error-container/50 px-3 py-2 text-xs text-on-error-container">
        <Icon icon="warning" size="sm" className="mt-0.5 shrink-0" />
        Support requests are not monitored as an emergency channel. If this is urgent, call your local emergency number now.
      </p>
    </form>
  )
}
