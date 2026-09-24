import { useState } from 'react'
import Icon from '../components/Icon'
import { useToastContext as useToastCtx } from '../context/ToastContext'
import {
  useAiKeys, useAddAiKey, useAiMemory, useAiStatus, useDeleteAiFact, useDeleteAiKey,
  useResetAiMemory, useTestAiKey, useToggleAiKey, useUpdateAiPreferences,
} from '../hooks/useMoiDoctor'
import type { AiKeyInfo, AiPreferences } from '../types/triage'

type Tab = 'preferences' | 'memory' | 'keys'

function errMsg(err: unknown, fallback = 'Something went wrong.'): string {
  const e = err as { response?: { data?: { detail?: { msg?: string } | string } } }
  const d = e?.response?.data?.detail
  return typeof d === 'string' ? d : d?.msg || fallback
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-on-surface">{label}</legend>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`min-h-12 rounded-xl border px-3 py-2 text-left transition-colors ${
              value === o.value ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant hover:bg-surface-container'
            }`}
          >
            <span className="block text-sm font-medium">{o.label}</span>
            {o.hint && <span className="block text-xs opacity-75">{o.hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function PreferencesTab() {
  const { data: mem, isLoading, isError } = useAiMemory()
  const update = useUpdateAiPreferences()
  const { addToast } = useToastCtx()
  const [lang, setLang] = useState<string | null>(null)
  const [num, setNum] = useState<string | null>(null)
  if (isLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>
  if (isError || !mem) return <p className="text-sm text-on-surface-variant">Could not load your preferences. Check your connection and refresh.</p>
  const p = mem.preferences

  const save = (changes: Partial<AiPreferences>) =>
    update.mutate(changes, {
      onSuccess: () => addToast('Preference saved', 'success'),
      onError: (e) => addToast(errMsg(e, 'Could not save'), 'error'),
    })

  return (
    <div className="space-y-6">
      <Segmented
        label="How long should answers be?" value={p.response_style} onChange={(v) => save({ response_style: v })}
        options={[{ value: 'concise', label: 'Short', hint: '1–2 sentences' }, { value: 'balanced', label: 'Balanced', hint: '2–4 sentences' }, { value: 'detailed', label: 'Detailed', hint: 'A short paragraph' }]}
      />
      <Segmented
        label="Tone" value={p.tone} onChange={(v) => save({ tone: v })}
        options={[{ value: 'gentle', label: 'Gentle', hint: 'Warm and reassuring' }, { value: 'direct', label: 'Direct', hint: 'Straight to the point' }]}
      />
      <Segmented
        label="Units" value={p.units} onChange={(v) => save({ units: v })}
        options={[{ value: 'metric', label: 'Metric', hint: '°C, kg' }, { value: 'imperial', label: 'Imperial', hint: '°F, lb' }]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-on-surface">Reply language</span>
          <input
            value={lang ?? p.language} onChange={(e) => setLang(e.target.value)}
            onBlur={() => { if (lang !== null && lang.trim() && lang !== p.language) save({ language: lang.trim() }); setLang(null) }}
            className="mt-2 min-h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 text-base text-on-surface outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-on-surface">Local emergency number</span>
          <input
            inputMode="tel" value={num ?? p.emergency_number} onChange={(e) => setNum(e.target.value)}
            onBlur={() => { if (num !== null && num.trim() && num !== p.emergency_number) save({ emergency_number: num.trim() }); setNum(null) }}
            className="mt-2 min-h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 text-base text-on-surface outline-none focus:border-primary"
          />
        </label>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant p-4">
        <input
          type="checkbox" checked={p.remember_conversations} onChange={(e) => save({ remember_conversations: e.target.checked })}
          className="mt-0.5 h-5 w-5 rounded border-outline text-primary focus:ring-primary/30"
        />
        <span>
          <span className="block text-sm font-semibold text-on-surface">Let Liana remember things I tell her</span>
          <span className="block text-sm text-on-surface-variant">Allergies, conditions and preferences you mention in chat are saved so you don’t have to repeat them. You can review or delete them under “What Liana remembers”.</span>
        </span>
      </label>
    </div>
  )
}

const fieldLabel = (f: string) => f.replace('preferences.', 'Preference: ').replace('health.', '').replace('fact', 'Note').replace(/_/g, ' ')
const show = (v: unknown) => (v === null || v === undefined ? '—' : Array.isArray(v) ? v.join(', ') || '—' : String(v))

function MemoryTab() {
  const { data: mem, isLoading, isError } = useAiMemory()
  const delFact = useDeleteAiFact()
  const reset = useResetAiMemory()
  const { addToast } = useToastCtx()
  const [confirm, setConfirm] = useState(false)
  if (isLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>
  if (isError || !mem) return <p className="text-sm text-on-surface-variant">Could not load memory. Check your connection and refresh.</p>
  const h = mem.health_context
  const rows: [string, string][] = [
    ['Age', h.age ? String(h.age) : '—'], ['Gender', h.gender || '—'], ['Location', h.location || '—'],
    ['Conditions', h.conditions.join(', ') || '—'], ['Allergies', h.allergies.join(', ') || '—'], ['Medications', h.medications.join(', ') || '—'],
  ]
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-on-surface">Health details in use</h3>
        <p className="mt-1 text-sm text-on-surface-variant">Synced from your profile each time you use triage. Edit them on your Profile page.</p>
        <dl className="mt-3 divide-y divide-outline-variant rounded-xl border border-outline-variant">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4">
              <dt className="w-28 shrink-0 text-sm text-on-surface-variant">{k}</dt>
              <dd className="min-w-0 break-words text-sm text-on-surface">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-on-surface">Things Liana learned from your chats</h3>
        {mem.facts.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">Nothing yet. If you tell Liana something lasting, like “I’m allergic to penicillin”, it will show up here.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mem.facts.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-xl border border-outline-variant px-4 py-2.5">
                <span className="min-w-0 flex-1 break-words text-sm text-on-surface">{f.text}</span>
                <button
                  type="button" aria-label={`Forget: ${f.text}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                  onClick={() => delFact.mutate(f.id, { onError: (e) => addToast(errMsg(e), 'error') })}
                ><Icon icon="delete" size="md" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-on-surface">Recent changes</h3>
        {mem.history.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">No changes recorded yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {[...mem.history].reverse().slice(0, 25).map((c, i) => (
              <li key={i} className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
                  <time dateTime={c.at}>{new Date(c.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  <span className="rounded bg-surface-container px-1.5 py-0.5">{c.source === 'ai' ? 'Learned by Liana' : c.source === 'profile' ? 'From your profile' : 'You changed'}</span>
                </div>
                <p className="mt-1 break-words text-on-surface"><span className="font-medium capitalize">{fieldLabel(c.field)}</span>: {show(c.from)} → {show(c.to)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-xl border border-error/30 p-4">
        <h3 className="text-sm font-semibold text-on-surface">Start fresh</h3>
        <p className="mt-1 text-sm text-on-surface-variant">Erase everything Liana remembers, including preferences and the change history.</p>
        {confirm ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="min-h-10 rounded-lg bg-error px-4 text-sm font-semibold text-on-error"
              onClick={() => reset.mutate(undefined, { onSuccess: () => { setConfirm(false); addToast('Memory cleared', 'success') }, onError: (e) => addToast(errMsg(e), 'error') })}>Yes, erase it</button>
            <button type="button" className="min-h-10 rounded-lg border border-outline-variant px-4 text-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="mt-3 min-h-10 rounded-lg border border-error/40 px-4 text-sm font-medium text-error hover:bg-error-container/40" onClick={() => setConfirm(true)}>Erase memory</button>
        )}
      </section>
    </div>
  )
}

const statusStyle: Record<AiKeyInfo['status'], { label: string; cls: string }> = {
  ok: { label: 'Working', cls: 'bg-success-container text-on-success-container' },
  unknown: { label: 'Not tested', cls: 'bg-surface-container text-on-surface-variant' },
  rate_limited: { label: 'Rate limited', cls: 'bg-warning-container text-on-warning-container' },
  cooling_down: { label: 'Resting', cls: 'bg-warning-container text-on-warning-container' },
  invalid: { label: 'Rejected', cls: 'bg-error-container text-on-error-container' },
  error: { label: 'Error', cls: 'bg-error-container text-on-error-container' },
}

function KeysTab() {
  const { data: keys, isLoading, error } = useAiKeys()
  const add = useAddAiKey()
  const toggle = useToggleAiKey()
  const del = useDeleteAiKey()
  const test = useTestAiKey()
  const { addToast } = useToastCtx()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const forbidden = (error as { response?: { status?: number } } | null)?.response?.status === 403
  if (forbidden) return <p className="text-sm text-on-surface-variant">Only admins can manage API keys. Ask an admin to add your email to <code className="rounded bg-surface-container px-1">ADMIN_EMAILS</code> on the server.</p>
  if (isLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>
  if (error) return <p className="text-sm text-on-surface-variant">Could not load keys. {errMsg(error, 'Is the server running?')}</p>

  const submit = async () => {
    // One key per line. Optional "label: key" or "label,key".
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return
    setBusy(true)
    let ok = 0
    const problems: string[] = []
    for (const [i, line] of lines.entries()) {
      const m = line.match(/^(.*?)[\s]*[:,=][\s]*([A-Za-z0-9_-]{20,})$/)
      const key = m ? m[2] : line
      const label = m && m[1] ? m[1] : `Key ${(keys?.length ?? 0) + i + 1}`
      try {
        const res = await add.mutateAsync({ key, label })
        void res
        ok++
      } catch (e) {
        problems.push(`Line ${i + 1}: ${errMsg(e, 'failed')}`)
      }
    }
    setBusy(false)
    if (ok) addToast(`${ok} key${ok > 1 ? 's' : ''} added`, 'success')
    if (problems.length) addToast(problems.join(' '), 'error')
    if (!problems.length) setText('')
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-on-surface">Add Gemini API keys</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Paste one key per line, optionally as <code className="rounded bg-surface-container px-1">Label: key</code>. Requests rotate across all working keys, and a key that hits its limit is rested automatically. Get keys from Google AI Studio.
        </p>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={4} spellCheck={false} autoComplete="off"
          placeholder={'Team key: AIza…\nAIza…'}
          className="mt-3 w-full resize-y rounded-xl border border-outline-variant bg-surface px-3 py-2.5 font-mono text-sm text-on-surface outline-none focus:border-primary"
          aria-label="API keys"
        />
        <button type="button" onClick={submit} disabled={busy || !text.trim()} className="mt-2 min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-40 sm:w-auto">
          {busy ? 'Adding and testing…' : 'Add keys'}
        </button>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-on-surface">Keys ({keys?.length ?? 0})</h3>
        {!keys?.length ? (
          <p className="mt-2 text-sm text-on-surface-variant">No keys yet. Until one is added, Liana falls back to a basic safety check instead of AI.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {keys.map((k) => {
              const st = statusStyle[k.status] ?? statusStyle.unknown
              return (
                <li key={k.id} className={`rounded-xl border border-outline-variant p-4 ${k.enabled ? '' : 'opacity-60'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-on-surface">{k.label}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}{k.cooldown_seconds ? ` · ${Math.ceil(k.cooldown_seconds / 60)}m` : ''}</span>
                    {k.source === 'env' && <span className="rounded-md bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">From server settings</span>}
                  </div>
                  <p className="mt-1 font-mono text-xs text-on-surface-variant">{k.masked}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{k.uses} successful · {k.failures} failed{k.last_used ? ` · last used ${new Date(k.last_used).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : ''}</p>
                  {k.last_error && k.status !== 'ok' && <p className="mt-1 break-words text-xs text-error">{k.last_error}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="min-h-9 rounded-lg border border-outline-variant px-3 text-xs font-medium hover:bg-surface-container disabled:opacity-40" disabled={test.isPending}
                      onClick={() => test.mutate(k.id, { onSuccess: (r) => r.test?.ok ? addToast(`${k.label} works`, 'success') : addToast(`${k.label}: ${r.test?.error ?? 'failed'}`, 'error'), onError: (e) => addToast(errMsg(e), 'error') })}>
                      {test.isPending && test.variables === k.id ? 'Testing…' : 'Test'}
                    </button>
                    {k.source === 'admin' && (
                      <>
                        <button type="button" className="min-h-9 rounded-lg border border-outline-variant px-3 text-xs font-medium hover:bg-surface-container"
                          onClick={() => toggle.mutate({ id: k.id, enabled: !k.enabled }, { onError: (e) => addToast(errMsg(e), 'error') })}>
                          {k.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {deleting === k.id ? (
                          <>
                            <button type="button" className="min-h-9 rounded-lg bg-error px-3 text-xs font-semibold text-on-error" onClick={() => { del.mutate(k.id, { onError: (e) => addToast(errMsg(e), 'error') }); setDeleting(null) }}>Confirm delete</button>
                            <button type="button" className="min-h-9 rounded-lg border border-outline-variant px-3 text-xs" onClick={() => setDeleting(null)}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" className="min-h-9 rounded-lg px-3 text-xs font-medium text-error hover:bg-error-container/40" onClick={() => setDeleting(k.id)}>Delete</button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function AISettings() {
  const [tab, setTab] = useState<Tab>('preferences')
  const { data: status } = useAiStatus()
  const tabs: { id: Tab; label: string }[] = [
    { id: 'preferences', label: 'Preferences' },
    { id: 'memory', label: 'What Liana remembers' },
    { id: 'keys', label: 'API keys' },
  ]
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="font-headline-md text-2xl font-semibold text-on-surface">AI settings</h1>
      <p className="mt-1 text-sm text-on-surface-variant">Choose how Liana talks to you and review what she remembers.</p>
      {status && !status.ai_enabled && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning-container px-4 py-3 text-sm text-on-warning-container">
          <Icon icon="info" size="md" className="mt-0.5 shrink-0" />
          No working AI key right now, so triage uses a basic safety check. Add a key under “API keys” (admins only).
        </p>
      )}
      <div role="tablist" className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-outline-variant">
        {tabs.map((t) => (
          <button
            key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >{t.label}</button>
        ))}
      </div>
      <div className="mt-6" role="tabpanel">
        {tab === 'preferences' && <PreferencesTab />}
        {tab === 'memory' && <MemoryTab />}
        {tab === 'keys' && <KeysTab />}
      </div>
    </main>
  )
}
