import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import LianaAvatar from './LianaAvatar'
import EmergencyEscalation from './EmergencyEscalation'
import TriageFeedback from './TriageFeedback'
import { useAuth, type TriageSession } from '../context/AuthContext'
import { useBodyMap } from '../context/BodyMapContext'
import { useTriageChat, type ChatMsg, type Severity } from '../hooks/useTriageChat'
import { getUserInitials } from '../utils/getUserInitials'
import type { TriageChatResponse } from '../types/triage'

const urgencyStyle = (level: string) => {
  switch (level?.toLowerCase()) {
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

  // The care plan is the locked 3-part shape: immediate relief, food & water, when to go to hospital.
  // Older sessions only have the flat recommended_actions/red_flags_to_watch fields, so fall back to those.
  const carePlan = result.care_plan ?? {
    immediate_relief: result.recommended_actions ?? [],
    food_and_water: [],
    when_to_hospital: result.red_flags_to_watch ?? [],
  }
  const planSections: { key: string; label: string; icon: string; items: string[] }[] = [
    { key: 'immediate_relief', label: 'Immediate relief', icon: 'healing', items: carePlan.immediate_relief },
    { key: 'food_and_water', label: 'Food & water', icon: 'water_drop', items: carePlan.food_and_water },
    { key: 'when_to_hospital', label: 'When to go to hospital', icon: 'local_hospital', items: carePlan.when_to_hospital },
  ]

  const saveAndOpen = () => {
    addSession({
      id: result.assessment_id || ('sess-' + Date.now()),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      condition: result.possible_conditions?.length ? result.possible_conditions[0] : 'Self-reported symptoms',
      description: result.rationale || 'Triage assessment completed.',
      severity: result.urgency_level === 'Urgent' ? 'Urgent' : result.urgency_level === 'Moderate' ? 'Moderate' : 'Stable',
      statusLabel: severity ? `Self-rated ${severity.toLowerCase()}` : result.urgency_level,
      statusIcon: result.urgency_level === 'Urgent' ? 'warning' : 'clinical_notes',
      conditions: result.possible_conditions,
      recommendedActions: result.recommended_actions,
      redFlags: result.red_flags_to_watch,
      rationale: result.rationale,
      tags: result.possible_conditions?.slice(0, 2),
    })
    navigate('/care-details')
  }

  const [showAnswerBox, setShowAnswerBox] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [focusedQuestion, setFocusedQuestion] = useState<string | null>(null)

  const handleAnswerSubmit = () => {
    const answered = Object.entries(answers)
      .map(([q, a]) => ({ q, a: a.trim() }))
      .filter(({ a }) => Boolean(a))

    if (answered.length === 0) return

    const formatted = answered.length === 1
      ? `${answered[0].q}\nAnswer: ${answered[0].a}`
      : answered.map(({ q, a }) => `• ${q}\n  Answer: ${a}`).join('\n')

    onAsk(formatted)
    setShowAnswerBox(false)
    setAnswers({})
    setFocusedQuestion(null)
  }

  return (
    <div className="mt-3 rounded-xl border border-outline-variant bg-surface p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${urgencyStyle(result.urgency_level)}`}>
          {result.urgency_level}
        </span>
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

      {/* Locked 3-part care plan: immediate relief, food & water, when to go to hospital. */}
      <div className="mt-4 rounded-xl border border-outline-variant overflow-hidden divide-y divide-outline-variant">
        <p className="bg-surface-container-low px-3 py-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          Your care plan
        </p>
        {planSections.map((section) => {
          if (section.items.length === 0) return null
          const isHospital = section.key === 'when_to_hospital'
          return (
            <div key={section.key} className={`p-3 ${isHospital ? 'bg-error-container/40' : ''}`}>
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${isHospital ? 'text-on-error-container' : 'text-on-surface'}`}>
                <Icon icon={section.icon} size="sm" />
                {section.label}
              </p>
              <ul className={`mt-1.5 space-y-1 text-xs ${isHospital ? 'text-on-error-container' : 'text-on-surface'}`}>
                {section.items.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          )
        })}
      </div>

      {result.follow_up_questions.length > 0 && !showAnswerBox && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Tap to answer</p>
            <button
              type="button"
              onClick={() => setShowAnswerBox(true)}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <Icon icon="edit_note" size="xs" /> Write answers
            </button>
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
            {result.follow_up_questions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setShowAnswerBox(true)
                  setFocusedQuestion(q)
                }}
                className="min-h-10 rounded-lg border border-outline-variant px-3 py-2 text-left text-xs text-on-surface transition-colors hover:border-primary hover:bg-surface-container flex items-center justify-between gap-2 group"
              >
                <span>{q}</span>
                <Icon icon="edit" size="xs" className="text-primary shrink-0 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {result.follow_up_questions.length > 0 && showAnswerBox && (
        <div className="mt-3 rounded-xl border border-primary/30 bg-surface-container-low p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-primary flex items-center gap-1.5">
              <Icon icon="edit_note" size="sm" />
              Answer follow-up questions
            </p>
            <button
              type="button"
              onClick={() => setShowAnswerBox(false)}
              className="text-on-surface-variant hover:text-on-surface text-xs p-1"
              title="Close"
            >
              <Icon icon="close" size="sm" />
            </button>
          </div>
          <div className="space-y-3">
            {result.follow_up_questions.map((q) => (
              <div key={q} className="space-y-1">
                <label className="text-xs font-medium text-on-surface block leading-tight">
                  {q}
                </label>
                <input
                  type="text"
                  value={answers[q] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAnswerSubmit()
                    }
                  }}
                  placeholder="Type your answer here..."
                  className="w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus={focusedQuestion === q || (!focusedQuestion && q === result.follow_up_questions[0])}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleAnswerSubmit()}
              disabled={!Object.values(answers).some(a => a && a.trim())}
              className="min-h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Icon icon="send" size="xs" />
              Submit all at once
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAnswerBox(false)
                setAnswers({})
                setFocusedQuestion(null)
              }}
              className="min-h-9 rounded-lg border border-outline-variant px-3 text-xs text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
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
            {result.ai_notice || (result.ai_source === 'offline' ? "We can't reach the server right now, so here's an offline safety check." : "We couldn't reach Liana's online assessment, so here's a basic safety check.")}
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

function PastTriageModal({
  session,
  onClose,
  onAskAbout,
}: {
  session: TriageSession
  onClose: () => void
  onAskAbout: (session: TriageSession) => void
}) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${urgencyStyle(session.severity)}`}>
              {session.severity}
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              {session.date} · {session.time}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <Icon icon="close" size="sm" />
          </button>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Symptoms & Condition</h3>
          <p className="mt-1 text-base font-semibold text-on-surface">{session.condition}</p>
        </div>

        {session.description && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Assessment Summary</h4>
            <p className="mt-1 text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{session.description}</p>
          </div>
        )}

        {session.conditions && session.conditions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Possible Conditions</h4>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {session.conditions.map(c => (
                <span key={c} className="rounded-md bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {session.recommendedActions && session.recommendedActions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Recommended Actions</h4>
            <ul className="mt-1.5 space-y-1.5 text-xs text-on-surface">
              {session.recommendedActions.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {session.redFlags && session.redFlags.length > 0 && (
          <div className="rounded-lg border border-error/30 bg-error-container/50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-on-error-container">
              <Icon icon="warning" size="sm" /> Red Flags To Watch
            </p>
            <ul className="mt-1 space-y-1 text-xs text-on-error-container">
              {session.redFlags.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-outline-variant">
          <button
            type="button"
            onClick={() => onAskAbout(session)}
            className="w-full sm:w-auto flex-1 min-h-10 rounded-lg border border-primary text-primary px-4 text-xs font-semibold hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon icon="chat" size="xs" />
            Ask Liana about this
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate('/care-details')
            }}
            className="w-full sm:w-auto flex-1 min-h-10 rounded-lg bg-primary text-on-primary px-4 text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <Icon icon="local_hospital" size="xs" />
            Care Options
          </button>
        </div>
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
  const { sessions, addSession, refreshSessions } = useAuth()
  const [input, setInput] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [showPastTriagesMobile, setShowPastTriagesMobile] = useState(false)
  const [selectedPastSession, setSelectedPastSession] = useState<TriageSession | null>(null)
  const [listening, setListening] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<InstanceType<SpeechCtor> | null>(null)
  const [sessionId, setSessionId] = useState(() => Date.now().toString(36).toUpperCase())

  // Refresh sessions from backend on mount
  useEffect(() => {
    void refreshSessions()
  }, [refreshSessions])

  // Automatically record completed triage assessments into session history
  const autoSavedRef = useRef(new Set<string>())
  useEffect(() => {
    const resultMsg = chat.messages.find(m => m.result?.assessment_id && !autoSavedRef.current.has(m.result.assessment_id))
    if (resultMsg?.result) {
      const res = resultMsg.result
      autoSavedRef.current.add(res.assessment_id)
      const userText = chat.messages.find(m => m.role === 'user')?.text || 'Self-reported symptoms'
      const title = res.possible_conditions?.length ? res.possible_conditions[0] : (userText.length > 50 ? userText.slice(0, 47) + '...' : userText)
      addSession({
        id: res.assessment_id || ('sess-' + Date.now()),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        condition: title,
        description: res.rationale || res.possible_conditions?.join(', ') || 'Triage assessment completed.',
        severity: res.urgency_level === 'Urgent' ? 'Urgent' : res.urgency_level === 'Moderate' ? 'Moderate' : 'Stable',
        statusLabel: chat.severity ? `Self-rated ${chat.severity.toLowerCase()}` : (res.urgency_level || 'Completed'),
        statusIcon: res.urgency_level === 'Urgent' ? 'warning' : 'clinical_notes',
        conditions: res.possible_conditions,
        recommendedActions: res.recommended_actions,
        redFlags: res.red_flags_to_watch,
        rationale: res.rationale,
        tags: res.possible_conditions?.slice(0, 2),
      })
    }
  }, [chat.messages, chat.severity, addSession])

  const handleStartNewTriage = () => {
    chat.reset()
    setSessionId(Date.now().toString(36).toUpperCase())
    setShowPastTriagesMobile(false)
  }

  const handleAskAboutPastSession = (s: TriageSession) => {
    setInput(`Regarding my previous triage from ${s.date} for ${s.condition}: `)
    setSelectedPastSession(null)
  }

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
      {/* Desktop Sidebar: Session details + Previous Triages list */}
      <aside className="hidden w-80 shrink-0 flex-col justify-between border-r border-outline-variant bg-surface-container-low p-4 lg:flex">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header with Title and Start New Triage Button */}
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <h2 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-2">
              <Icon icon="medical_services" size="sm" className="text-primary" />
              Triage Workspace
            </h2>
            <button
              type="button"
              onClick={handleStartNewTriage}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/25 transition-colors cursor-pointer"
              title="Start a fresh triage session"
            >
              <Icon icon="add" size="xs" />
              New Triage
            </button>
          </div>

          {/* Current session info summary */}
          <div className="py-3 border-b border-outline-variant space-y-2 text-xs">
            <div className="flex items-center justify-between text-on-surface-variant font-medium">
              <span>Active Session:</span>
              <span className="font-mono text-on-surface">#{sessionId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Body Map:</span>
              <span className="text-on-surface font-medium">
                {hasAreas ? `${selectedAreas.length} area(s) marked` : 'None marked'}
              </span>
            </div>
            <Link to="/body-map" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              <Icon icon="pin_drop" size="xs" /> {hasAreas ? 'Change marked areas' : 'Mark where it hurts'}
            </Link>
          </div>

          {/* Previous Triages Section */}
          <div className="flex items-center justify-between pt-3 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <Icon icon="history" size="xs" />
              Previous Triages
            </h3>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
              {sessions.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-0">
            {sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant p-4 text-center mt-2">
                <Icon icon="history" size="md" className="mx-auto text-secondary/60 mb-1" />
                <p className="text-xs font-medium text-on-surface">No previous triages</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Complete your assessment and it will automatically be saved here.
                </p>
              </div>
            ) : (
              sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedPastSession(s)}
                  role="button"
                  tabIndex={0}
                  className="group rounded-xl border border-outline-variant bg-surface p-3 text-left transition-all hover:border-primary/50 hover:bg-surface-container cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-on-surface-variant">
                      {s.date} · {s.time}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${urgencyStyle(s.severity)}`}>
                      {s.severity}
                    </span>
                  </div>
                  <p className="font-semibold text-xs text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                    {s.condition}
                  </p>
                  <p className="text-[11px] text-on-surface-variant line-clamp-1">
                    {s.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Aside Footer */}
        <div className="pt-3 border-t border-outline-variant space-y-2">
          <Link
            to="/history"
            className="flex items-center justify-between rounded-lg bg-surface-container px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Icon icon="manage_history" size="xs" />
              View full triage history
            </span>
            <Icon icon="arrow_forward" size="xs" />
          </Link>
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant px-1">
            <span>Session #{sessionId}</span>
            <Link to="/ai-settings" className="hover:underline">Settings</Link>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-background">
        {/* Mobile top bar */}
        <div className="border-b border-outline-variant lg:hidden bg-surface-container-low px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPastTriagesMobile(true)}
                className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-2.5 py-1.5 text-xs font-semibold text-on-surface hover:border-primary transition-colors shadow-xs"
              >
                <Icon icon="history" size="xs" className="text-primary" />
                <span>Previous Triages</span>
                <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {sessions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowDetails(v => !v)}
                className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                title="Session Details"
              >
                <Icon icon="info" size="xs" />
                <span>{hasAreas ? `${selectedAreas.length} marked` : 'Details'}</span>
                <Icon icon={showDetails ? 'expand_less' : 'expand_more'} size="xs" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleStartNewTriage}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity"
            >
              <Icon icon="add" size="xs" />
              <span>New</span>
            </button>
          </div>

          {showDetails && (
            <div className="mt-2.5 rounded-xl border border-outline-variant bg-surface p-3 text-xs">
              {details}
            </div>
          )}
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
            {userTurns > 0 && chat.latest?.has_symptoms && (
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

      {/* Mobile Past Triages Drawer */}
      {showPastTriagesMobile && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden">
          <div className="w-full max-h-[85vh] rounded-t-2xl border-t border-outline-variant bg-surface p-4 flex flex-col space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <Icon icon="history" size="sm" className="text-primary" />
                <h3 className="font-bold text-sm text-on-surface">Previous Triages ({sessions.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPastTriagesMobile(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
                aria-label="Close"
              >
                <Icon icon="close" size="sm" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[55vh] pr-1">
              {sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center">
                  <Icon icon="history" size="lg" className="mx-auto text-secondary/60 mb-2" />
                  <p className="text-sm font-semibold text-on-surface">No previous triages</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Complete your assessment with Liana to view your triage records here.
                  </p>
                </div>
              ) : (
                sessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedPastSession(s)
                      setShowPastTriagesMobile(false)
                    }}
                    role="button"
                    tabIndex={0}
                    className="rounded-xl border border-outline-variant bg-surface-container-low p-3 space-y-1.5 active:bg-surface-container cursor-pointer text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-on-surface-variant">{s.date} · {s.time}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${urgencyStyle(s.severity)}`}>
                        {s.severity}
                      </span>
                    </div>
                    <p className="font-semibold text-xs text-on-surface line-clamp-1">{s.condition}</p>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2">{s.description}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-primary font-semibold">
                      <span>Tap to view details</span>
                      <Icon icon="chevron_right" size="xs" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
              <Link
                to="/history"
                onClick={() => setShowPastTriagesMobile(false)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Icon icon="history" size="xs" />
                Open full history page
              </Link>
              <button
                type="button"
                onClick={() => {
                  handleStartNewTriage()
                  setShowPastTriagesMobile(false)
                }}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
              >
                Start New Triage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Triage Details Modal */}
      {selectedPastSession && (
        <PastTriageModal
          session={selectedPastSession}
          onClose={() => setSelectedPastSession(null)}
          onAskAbout={handleAskAboutPastSession}
        />
      )}
    </main>
  )
}
