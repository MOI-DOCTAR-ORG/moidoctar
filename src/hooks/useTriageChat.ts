import { useCallback, useRef, useState } from 'react'
import { useCreateTriageChat } from './useMoiDoctor'
import { buildAiContext, type BodyAreaLike } from '../lib/aiContext'
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

const GREETING =
  "Hi, I'm Liana. Tell me what you're feeling and when it started. I'll ask a few questions and help you decide what to do next."

function errorText(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { detail?: { msg?: string } | string } }; message?: string }
  const detail = e?.response?.data?.detail
  if (e?.response?.status === 401) return 'Your session has expired. Please sign in again.'
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && detail.msg) return detail.msg
  return 'I could not reach the server. Check your connection and try again.'
}

/**
 * Conversation state for triage. Every send posts the full history, so the
 * assistant answers in context, and the reply is shown as a chat message.
 */
export function useTriageChat(bodyAreas: BodyAreaLike[] = []) {
  const chat = useCreateTriageChat()
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: nextId(),
      role: 'ai',
      time: nowLabel(),
      text: bodyAreas.length
        ? `Hi, I'm Liana. I can see you marked ${bodyAreas.map((a) => a.label.toLowerCase()).join(', ')}. What does it feel like, and when did it start?`
        : GREETING,
    },
  ])
  const [error, setError] = useState<string | null>(null)
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const lastSent = useRef<{ history: ChatMsg[]; image: File | null } | null>(null)

  const latest = [...messages].reverse().find((m) => m.result)?.result ?? null

  const run = useCallback(
    async (history: ChatMsg[], img: File | null) => {
      lastSent.current = { history, image: img }
      setError(null)
      const userText = history.filter((m) => m.role === 'user').map((m) => m.text).join('\n')
      try {
        const res = await chat.mutateAsync({
          symptoms: userText,
          messages: JSON.stringify(history.map((m) => ({ role: m.role === 'ai' ? 'model' : 'user', content: m.text }))),
          context: buildAiContext({ bodyAreas, severity }),
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
    [chat.mutateAsync, bodyAreas, severity],
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

  return { messages, latest, pending: chat.isPending, error, retry, send, severity, setSeverity, image, setImage }
}
