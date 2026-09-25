import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useCreateTriageChat } from '../hooks/useMoiDoctor'
import { buildAiContext } from '../lib/aiContext'
import { useBodyMap } from './BodyMapContext'
import { scopeKey } from '../utils/storage'
import type { TriageChatResponse } from '../types/triage'

export type ChatMsg = {
  id: string
  role: 'ai' | 'user'
  text: string
  time: string
  result?: TriageChatResponse
  imageName?: string
}

export type Severity = 'Mild' | 'Moderate' | 'Severe'

const nowLabel = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
let counter = 0
const nextId = () => `m${Date.now().toString(36)}${counter++}`
const newSessionId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : nextId())

const GREETING =
  "Hi, I'm Liana. Tell me what you're feeling and when it started. I'll ask a few simple questions and help you decide what to do next."

const greetingFor = (bodyAreaLabels: string[]) =>
  bodyAreaLabels.length
    ? `Hi, I'm Liana. I can see you marked ${bodyAreaLabels.join(', ')}. What does it feel like, and when did it start?`
    : GREETING

function errorText(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { detail?: { msg?: string } | string } }; message?: string }
  const detail = e?.response?.data?.detail
  if (e?.response?.status === 401) return 'Your session has expired. Please sign in again.'
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && detail.msg) return detail.msg
  return 'I could not reach the server. Check your connection and try again.'
}

// Kept in sessionStorage (not localStorage): it's a live, unfinished conversation, not a saved
// record. It survives navigating between pages and refreshing the tab, and clears itself when the
// person closes the tab or explicitly starts a new triage.
const DRAFT_KEY = () => scopeKey('doctarr_triage_draft')

type Draft = { messages: ChatMsg[]; severity: Severity | null; sessionId: string }

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY())
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Draft>
    if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
      return { messages: parsed.messages, severity: parsed.severity ?? null, sessionId: parsed.sessionId || newSessionId() }
    }
  } catch {
    // Corrupt or unavailable storage — just start fresh.
  }
  return null
}

function saveDraft(draft: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY(), JSON.stringify(draft))
  } catch {
    // Storage full or unavailable — the conversation still works, it just won't survive a refresh.
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY())
  } catch {
    /* ignore */
  }
}

type TriageChatApi = {
  messages: ChatMsg[]
  latest: TriageChatResponse | null
  pending: boolean
  error: string | null
  retry: () => void
  send: (text: string) => boolean
  reset: () => void
  severity: Severity | null
  setSeverity: (s: Severity | null) => void
  image: File | null
  setImage: (f: File | null) => void
  sessionId: string
  /** True once the person has said something — used to know whether resuming a real draft or starting fresh. */
  hasStarted: boolean
}

const TriageChatCtx = createContext<TriageChatApi | null>(null)

/**
 * Holds the in-progress triage conversation above the routed pages, so navigating to another
 * screen and back (Dashboard, History, etc.) resumes exactly where the person left off instead of
 * silently wiping the chat. Only an explicit "New Triage" click (reset()) clears it.
 */
export function TriageChatProvider({ children }: { children: ReactNode }) {
  const chat = useCreateTriageChat()
  const { selectedAreas } = useBodyMap()
  const draftRef = useRef<Draft | null>(null)
  if (draftRef.current === null) draftRef.current = loadDraft()
  const initialDraft = draftRef.current

  const [messages, setMessages] = useState<ChatMsg[]>(
    () => initialDraft?.messages ?? [{ id: nextId(), role: 'ai', time: nowLabel(), text: greetingFor(selectedAreas.map((a) => a.label.toLowerCase())) }],
  )
  const [severity, setSeverityState] = useState<Severity | null>(initialDraft?.severity ?? null)
  const [error, setError] = useState<string | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const sessionIdRef = useRef(initialDraft?.sessionId ?? newSessionId())
  const lastSent = useRef<{ history: ChatMsg[]; image: File | null } | null>(null)

  // Persist on every change so a refresh (or a route change) resumes the same conversation.
  useEffect(() => {
    saveDraft({ messages, severity, sessionId: sessionIdRef.current })
  }, [messages, severity])

  // If nobody has started the conversation yet and the person marks body-map areas, fold that
  // into the still-untouched greeting. Once a real exchange has happened, leave it alone.
  useEffect(() => {
    setMessages((prev) => {
      const untouched = prev.length === 1 && prev[0].role === 'ai' && !prev[0].result
      if (!untouched || !selectedAreas.length) return prev
      const greeting = greetingFor(selectedAreas.map((a) => a.label.toLowerCase()))
      if (prev[0].text === greeting) return prev
      return [{ ...prev[0], text: greeting }]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreas])

  const latest = [...messages].reverse().find((m) => m.result)?.result ?? null
  const hasStarted = messages.some((m) => m.role === 'user')

  const run = useCallback(
    async (history: ChatMsg[], img: File | null) => {
      lastSent.current = { history, image: img }
      setError(null)
      const userText = history.filter((m) => m.role === 'user').map((m) => m.text).join('\n')
      try {
        const res = await chat.mutateAsync({
          symptoms: userText,
          messages: JSON.stringify(history.map((m) => ({ role: m.role === 'ai' ? 'model' : 'user', content: m.text }))),
          context: buildAiContext({ bodyAreas: selectedAreas, severity, sessionId: sessionIdRef.current }),
          image: img ?? undefined,
        })
        const data = res.data
        const hasSymptoms = Boolean(data.has_symptoms && data.possible_conditions && data.possible_conditions.length > 0)
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'ai',
            time: nowLabel(),
            text: data.reply || data.rationale || "Hello! How can I help you today? Please feel free to share any symptoms or health questions.",
            result: hasSymptoms ? data : undefined,
          },
        ])
      } catch (err) {
        setError(errorText(err))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chat.mutateAsync, selectedAreas, severity],
  )

  const send = useCallback(
    (text: string) => {
      const clean = text.trim()
      if (!clean || chat.isPending) return false
      const userMsg: ChatMsg = { id: nextId(), role: 'user', text: clean, time: nowLabel(), imageName: image?.name }
      const history = [...messages, userMsg]
      setMessages(history)
      const img = image
      setImage(null)
      void run(history, img)
      return true
    },
    [messages, image, chat.isPending, run],
  )

  const retry = useCallback(() => {
    if (lastSent.current && !chat.isPending) void run(lastSent.current.history, lastSent.current.image)
  }, [run, chat.isPending])

  const setSeverity = useCallback((s: Severity | null) => setSeverityState(s), [])

  const reset = useCallback(() => {
    clearDraft()
    sessionIdRef.current = newSessionId()
    setMessages([{ id: nextId(), role: 'ai', time: nowLabel(), text: greetingFor(selectedAreas.map((a) => a.label.toLowerCase())) }])
    setError(null)
    setSeverityState(null)
    setImage(null)
    lastSent.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreas])

  return (
    <TriageChatCtx.Provider
      value={{
        messages, latest, pending: chat.isPending, error, retry, send, reset,
        severity, setSeverity, image, setImage, sessionId: sessionIdRef.current, hasStarted,
      }}
    >
      {children}
    </TriageChatCtx.Provider>
  )
}

export function useTriageChat() {
  const ctx = useContext(TriageChatCtx)
  if (!ctx) throw new Error('useTriageChat must be used within TriageChatProvider')
  return ctx
}
