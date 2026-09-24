import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import LianaAvatar from './LianaAvatar'
import EmergencyEscalation from './EmergencyEscalation'
import TriageFeedback from './TriageFeedback'
import { useAuth } from '../context/AuthContext'
import { useBodyMap } from '../context/BodyMapContext'
import { useTriageChat, type ChatMsg, type Severity } from '../hooks/useTriageChat'
import { getUserInitials } from '../utils/getUserInitials'
import type { TriageChatResponse } from '../types/triage'

const urgencyStyle = (level: string) => {
  switch (level.toLowerCase()) {
    case 'urgent':
    case 'emergency':
    case 'high':
      return 'bg-error-container text-on-error-container'
    case 'moderate':
      return 'bg-warning-container text-on-warning-container'
    default:
      return 'bg-success-container text-on-success-container'
  }
}

const severityOptions: Severity[] = ['Mild', 'Moderate', 'Severe']

function ResultCard({ result, onAsk, severity }: { result: TriageChatResponse; onAsk: (q: string) => void; severity: Severity | null }) {
  const navigate = useNavigate()
  const { addSession } = useAuth()
  const pct = Math.round(Math.max(0, Math.min(1, result.confidence_score)) * 100)

  const saveAndOpen = () => {
    addSession({
      id: 'sess-' + Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      condition: 'Self-reported symptoms',
      description: result.rationale || 'Triage assessment completed.',
      severity: result.urgency_level === 'Urgent' ? 'Urgent' : result.urgency_level === 'Moderate' ? 'Moderate' : 'Stable',
      statusLabel: severity ? `Self-rated ${severity.toLowerCase()}` : 'Review Sent',
      statusIcon: 'clinical_notes',
    })
    navigate('/care-details')
  }

  return (
    <div className="mt-3 rounded-xl border border-outline-variant bg-surface p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${urgencyStyle(result.urgency_level)}`}>
          {result.urgency_level}
        </span>
        <span className="text-xs text-on-surface-variant" title="How sure the assistant is">{pct}% confidence</span>
      </div>

      {result.rationale && <p className="mt-3 text-on-surface-variant">{result.rationale}</p>}

      {result.possible_conditions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Could be</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {result.possible_conditions.map((c) => (
              <span key={c} className="rounded-md bg-surface-container px-2 py-1 text-xs text-on-surface">{c}</span>
            ))}
          </div>
        </div>
      )}

      {result.recommended_actions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">What to do</p>
          <ul className="mt-1.5 space-y-1.5">
            {result.recommended_actions.map((a) => (
              <li key={a} className="flex gap-2 text-on-surface">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.red_flags_to_watch.length > 0 && (
        <div className="mt-3 rounded-lg border border-error/30 bg-error-container/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-on-error-container">
            <Icon icon="warning" size="sm" /> Go to emergency care if
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-on-error-container">
            {result.red_flags_to_watch.map((f) => <li key={f}>• {f}</li>)}
          </ul>
        </div>
      )}

      {result.follow_up_questions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Tap to answer</p>
          <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
            {result.follow_up_questions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onAsk(q)}
                className="min-h-10 rounded-lg border border-outline-variant px-3 py-2 text-left text-xs text-on-surface transition-colors hover:bg-surface-container"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {result.urgency_level === 'Urgent' && (
        <div className="mt-3"><EmergencyEscalation urgencyLevel={result.urgency_level} redFlags={result.red_flags_to_watch} /></div>
      )}

      <p className="mt-3 text-[11px] leading-snug text-on-surface-variant">{result.disclaimer}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={saveAndOpen} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90">
          Save and view care options
        </button>
        <div className="sm:ml-auto"><TriageFeedback assessmentId={result.assessment_id} /></div>
      </div>
    </div>
  )
}

function Bubble({ msg, severity, onAsk, isLatest }: { msg: ChatMsg; severity: Severity | null; onAsk: (q: string) => void; isLatest: boolean }) {
  if (msg.role === 'user') {
    return (
      <div className="flex flex-row-reverse items-end gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary-container text-xs font-bold text-on-secondary-container">{getUserInitials()}</div>
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-on-primary sm:max-w-[75%]">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{msg.text}</p>
          {msg.imageName && <p className="mt-1 flex items-center gap-1 text-xs opacity-80"><Icon icon="attach_file" size="sm" /> {msg.imageName}</p>}
        </div>
      </div>
    )
  }
  const result = msg.result
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0"><LianaAvatar size="sm" /></div>
      <div className="min-w-0 max-w-[92%] sm:max-w-[80%]">
        <div className="rounded-2xl rounded-tl-md border border-outline-variant bg-surface-container-low px-4 py-2.5">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-on-surface">{msg.text}</p>
        </div>
        {result && result.ai_source !== 'gemini' && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-on-warning-container">
            <Icon icon="info" size="sm" className="mt-px shrink-0" />
            {result.ai_notice || (result.ai_source === 'offline' ? 'Server not reachable, showing an offline safety check.' : 'AI is unavailable, showing a basic safety check.')}
          </p>
        )}
        {result?.memory_notes && result.memory_notes.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-on-surface-variant">
            <Icon icon="bookmark" size="sm" className="mt-px shrink-0" />
            {result.memory_notes.join(' · ')}
          </p>
        )}
        {result && isLatest && <ResultCard result={result} onAsk={onAsk} severity={severity} />}
        <p className="mt-1 text-[11px] text-on-surface-variant">{msg.time}</p>
      </div>
    </div>
  )
}

type SpeechCtor = new () => {
  lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void
}

export default function TriageChat() {
  const { selectedAreas, hasAreas } = useBodyMap()
  const chat = useTriageChat(selectedAreas)
  const [input, setInput] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [listening, setListening] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<InstanceType<SpeechCtor> | null>(null)
  const sessionId = useRef(Date.now().toString(36).toUpperCase()).current

  const Speech = (window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor })
  const SpeechRecognitionCtor = Speech.SpeechRecognition ?? Speech.webkitSpeechRecognition

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat.messages.length, chat.pending, chat.error])

  const submit = () => {
    if (chat.send(input)) setInput('')
  }

  const toggleVoice = () => {
    if (!SpeechRecognitionCtor) return
    if (listening) { recRef.current?.stop(); return }
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'en-NG'
    rec.interimResults = false
    rec.onresult = (e) => setInput((prev) => (prev ? prev + ' ' : '') + e.results[0][0].transcript)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const userTurns = chat.messages.filter((m) => m.role === 'user').length
  const latestId = [...chat.messages].reverse().find((m) => m.result)?.id

  const details = (
    <dl className="space-y-4 text-sm">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Started</dt>
        <dd className="mt-0.5 text-on-surface">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Marked on body map</dt>
        <dd className="mt-1 flex flex-wrap gap-1.5">
          {hasAreas
            ? selectedAreas.map((a) => (
                <span key={a.id} className="rounded-md bg-surface-container px-2 py-1 text-xs text-on-surface">{a.label} · {a.severity}</span>
              ))
            : <span className="text-on-surface-variant">Nothing marked</span>}
        </dd>
        <Link to="/body-map" className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <Icon icon="pin_drop" size="sm" /> {hasAreas ? 'Change areas' : 'Mark where it hurts'}
        </Link>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Assistant</dt>
        <dd className="mt-0.5 text-on-surface-variant">Uses your profile, medications and saved preferences. <Link className="text-primary underline underline-offset-2" to="/ai-settings">Review what it remembers</Link></dd>
      </div>
    </dl>
  )

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]">
      <aside className="hidden w-72 shrink-0 flex-col justify-between border-r border-outline-variant bg-surface-container-low p-5 lg:flex">
        <div>
          <h2 className="font-headline-md text-lg font-semibold text-on-surface">Session</h2>
          <div className="mt-4">{details}</div>
        </div>
        <p className="text-xs text-on-surface-variant">Session #{sessionId}</p>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="border-b border-outline-variant lg:hidden">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between px-4 text-left text-xs font-medium text-on-surface-variant"
            aria-expanded={showDetails}
          >
            <span>{hasAreas ? `${selectedAreas.length} area${selectedAreas.length > 1 ? 's' : ''} marked` : 'Session details'}</span>
            <Icon icon={showDetails ? 'expand_less' : 'expand_more'} size="md" />
          </button>
          {showDetails && <div className="border-t border-outline-variant bg-surface-container-low px-4 py-3">{details}</div>}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:px-6" role="log" aria-live="polite">
          <div className="mx-auto w-full max-w-3xl space-y-5">
            {chat.messages.map((m) => (
              <Bubble key={m.id} msg={m} severity={chat.severity} onAsk={(q) => chat.send(q)} isLatest={m.id === latestId} />
            ))}
            {chat.pending && (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <LianaAvatar size="sm" />
                <span className="inline-flex gap-1" aria-label="Liana is typing">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline" />
                </span>
              </div>
            )}
            {chat.error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/50 p-3 text-sm text-on-error-container">
                <Icon icon="error" size="md" className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p>{chat.error}</p>
                  <button type="button" onClick={chat.retry} className="mt-2 min-h-9 rounded-lg bg-error px-3 text-xs font-semibold text-on-error">Try again</button>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-outline-variant bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {userTurns > 0 && (
              <div className="mb-2 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs text-on-surface-variant">
                <span className="shrink-0">How bad is it?</span>
                {severityOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => chat.setSeverity(chat.severity === s ? null : s)}
                    aria-pressed={chat.severity === s}
                    className={`min-h-8 shrink-0 rounded-full border px-3 transition-colors ${
                      chat.severity === s ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {chat.image && (
              <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg bg-surface-container px-3 py-1.5 text-xs text-on-surface">
                <Icon icon="attach_file" size="sm" />
                <span className="truncate">{chat.image.name}</span>
                <button type="button" onClick={() => chat.setImage(null)} aria-label="Remove photo" className="grid h-6 w-6 place-items-center rounded-full hover:bg-surface-container-high"><Icon icon="close" size="sm" /></button>
              </div>
            )}
            <div className="flex items-end gap-1.5 rounded-2xl border border-outline-variant bg-background p-1.5 focus-within:border-primary">
              <button type="button" onClick={() => fileRef.current?.click()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container" aria-label="Attach a photo">
                <Icon icon="add_a_photo" size="md" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) chat.setImage(f); e.target.value = '' }} />
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                placeholder="Describe what you're feeling…"
                className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-base text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-0"
                aria-label="Message"
              />
              {SpeechRecognitionCtor && (
                <button type="button" onClick={toggleVoice} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-surface-container ${listening ? 'text-error' : 'text-on-surface-variant'}`} aria-label={listening ? 'Stop dictation' : 'Dictate'} aria-pressed={listening}>
                  <Icon icon="mic" size="md" />
                </button>
              )}
              <button type="button" onClick={submit} disabled={!input.trim() || chat.pending} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-on-primary transition-opacity disabled:opacity-40" aria-label="Send">
                <Icon icon="send" size="md" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-on-surface-variant">Guidance only, not a diagnosis. In an emergency call your local emergency number.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
