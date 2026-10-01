import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import {
  SUPPORT_ARTICLES,
  SUPPORT_FAQ,
  articleFields,
  faqFields,
  searchTokens,
  weightedScore,
} from '../../data/supportContent'
import { askSupportAssistant } from '../../lib/supportAssistant'

type ChatMessage = {
  id: number
  from: 'bot' | 'user'
  text: string
  /** Renders an "Open guide" button under the reply. */
  articleId?: string
  /** Renders a "Send a request" button under the reply. */
  offerHuman?: boolean
  tone?: 'default' | 'alert'
}

type Props = {
  onOpenArticle: (id: string) => void
  onRequestHuman: () => void
}

/** Best-scoring knowledge hit above the threshold, or null. */
function bestMatch<T>(items: T[], queryTokens: string[], fieldsOf: (item: T) => Array<[string, number]>, threshold: number): T | null {
  if (queryTokens.length === 0) return null
  let best: T | null = null
  let bestScore = 0

  for (const item of items) {
    const score = weightedScore(fieldsOf(item), queryTokens)
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  return bestScore >= threshold ? best : null
}

const GREETING = /^(hi|hello|hey|good (morning|afternoon|evening)|how far|how body|wetin dey|abeg)\b/i
const THANKS = /^(thanks|thank you|cheers|appreciate|nice one|danke)\b/i
/** "Show me how to…" — route these to a guide rather than a short answer. */
const HOW_TO = /\b(how (do|to|can|would)|where (do|can|is|are)|show me|walk me|set up|add|create|start|open|find|steps|guide)\b/i

type Intent = {
  test: RegExp
  reply: Omit<ChatMessage, 'id' | 'from'>
}

const INTENTS: Intent[] = [
  {
    test: /\b(emergency|ambulance|911|999|112|dying|cannot breathe|can't breathe|unconscious|bleeding heavily|seizure|chest pain|stroke)\b/i,
    reply: {
      text:
        'This sounds like an emergency — do not wait for an app. Call your local emergency number now, or go to the nearest emergency department. Once you are safe, I can help with anything else.',
      tone: 'alert',
      offerHuman: false,
    },
  },
  {
    test: /\b(human|person|agent|someone|talk to|call me|speak to|real person|representative|staff)\b/i,
    reply: {
      text:
        'Of course — a person reads every request. Use the "Talk to a person" form on this page and leave your email; replies usually land within a working day.',
      offerHuman: true,
    },
  },
  {
    test: /\b(refund|billing|payment|price|cost|pay|subscription|free|charge)\b/i,
    reply: {
      text:
        'MoiDoctar is free to use — triage, history, symptom tracking, medication reminders and nearby care all work without a payment method. If you were charged by something that looks like us, send a request with the category "Billing" and we will check it.',
      offerHuman: true,
    },
  },
  {
    test: /\b(delete|erase|remove)\b.?\b(account|data|my info|records|history)\b|\b(close|close down) (my|the) account\b/i,
    reply: {
      text:
        'Deletion is handled by a person so nothing is removed by accident. Send a request with the category "Account & privacy" and the word delete in the subject.',
      offerHuman: true,
    },
  },
  {
    test: /\b(offline|no internet|no network|disconnected|connection|server error|not loading|bug|broken|crash)\b/i,
    reply: {
      text:
        'If the connection drops, saved history and logs stay readable and you get an offline safety check instead of a live assessment. If something is broken, send a request with the category "Bug report" — describe what you did and what you expected.',
      offerHuman: true,
    },
  },
]

const QUICK_REPLIES = [
  'How do I start a triage?',
  'Set a medication reminder',
  'Is my data private?',
  'Talk to a person',
]

const OPENING: ChatMessage = {
  id: 1,
  from: 'bot',
  text:
    "Hi! I'm the MoiDoctar support assistant. Ask me how anything works, search the guides, or say \"talk to a person\" and I'll take you to a human.",
  offerHuman: true,
}

/** The keyword answer: used at once for the instant intents, and whenever the online assistant can't reply. */
function localReply(query: string): { instant: boolean; message: Omit<ChatMessage, 'id' | 'from'> } {
  const tokens = searchTokens(query)

  if (GREETING.test(query) && tokens.length <= 3) {
    return {
      instant: true,
      message: {
        text: 'Hello! Ask me anything about how MoiDoctar works — triage, tracking, reminders, your data — or say "talk to a person" to reach the team.',
        offerHuman: true,
      },
    }
  }

  const intent = INTENTS.find((i) => i.test.test(query))
  if (intent) return { instant: INTENTS.indexOf(intent) < 2, message: intent.reply }

  if (THANKS.test(query) && tokens.length <= 3) {
    return { instant: true, message: { text: 'Any time. If something is still unclear, I can take you to a person.', offerHuman: true } }
  }

  // A guide is the better answer for "how do I…", a FAQ for "is/does/can…".
  // Without this, "how do I set a medication reminder" gets the FAQ about
  // reminders not showing up, which answers a question nobody asked.
  const wantsHowTo = HOW_TO.test(query)
  const article = bestMatch(SUPPORT_ARTICLES, tokens, articleFields, 4)
  const faq = bestMatch(SUPPORT_FAQ, tokens, faqFields, 4)

  if (article && (wantsHowTo || !faq)) {
    return { instant: false, message: { text: `Here's a guide that covers it: ${article.summary}`, articleId: article.id, offerHuman: true } }
  }
  if (faq) {
    return { instant: false, message: { text: `${faq.question}\n\n${faq.answer}`, offerHuman: true } }
  }
  return {
    instant: false,
    message: {
      text:
        "I couldn't find a guide that matches that yet. Try rephrasing it with a feature name (triage, symptom tracker, medication, history, nearby care) — or send a request and a person will pick it up.",
      offerHuman: true,
    },
  }
}

export default function SupportChatbot({ onOpenArticle, onRequestHuman }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const nextId = useRef(2)
  const logRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing, open])

  const push = (msg: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: nextId.current++ }])
  }

  const answer = (raw: string) => {
    const query = raw.trim()
    if (!query || typing) return

    const history = messages.slice(-6).map((m) => ({ role: m.from === 'user' ? ('user' as const) : ('model' as const), text: m.text }))
    push({ from: 'user', text: query })
    setTyping(true)

    const local = localReply(query)
    const reply = (msg: Omit<ChatMessage, 'id' | 'from'>) => {
      if (!mounted.current) return
      setTyping(false)
      push({ from: 'bot', ...msg })
    }

    // Emergencies, "talk to a person", greetings and thanks are answered here at once.
    if (local.instant) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => reply(local.message), 400)
      return
    }
    // Everything else: the online assistant first, the keyword answer if it can't reply.
    void askSupportAssistant(query, history).then((online) => reply(online ?? local.message))
  }

  const handleQuickReply = (text: string) => {
    if (/talk to a person/i.test(text)) {
      push({ from: 'user', text })
      onRequestHuman()
      setOpen(false)
      return
    }
    answer(text)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    answer(input)
    setInput('')
  }

  const requestHuman = () => {
    onRequestHuman()
    setOpen(false)
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="support-chat-panel"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        className={`fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full px-4 shadow-lg transition-all bottom-20 md:bottom-6 ${
          open ? 'bg-surface-container-high text-on-surface ring-1 ring-outline-variant' : 'bg-primary text-on-primary hover:opacity-90'
        }`}
      >
        <Icon icon={open ? 'close' : 'chat'} size="lg" />
        <span className="hidden text-sm font-bold xs:inline">Chat with us</span>
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-success" aria-hidden="true" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <section
          id="support-chat-panel"
          aria-label="Support chat"
          className="fixed right-2 left-2 z-40 flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-2xl bottom-20 sm:left-auto sm:w-[380px] md:bottom-24"
          style={{ height: 'min(70dvh, 560px)' }}
        >
          <header className="flex items-center gap-3 border-b border-outline-variant bg-primary-container/60 px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary" aria-hidden="true">
              <Icon icon="forum" size="lg" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-on-surface">MoiDoctar Support</p>
              <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                Instant answers · humans on request
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Minimise chat"
              className="grid min-h-10 min-w-10 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon icon="close" size="md" />
            </button>
          </header>

          <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%]">
                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.from === 'user'
                        ? 'rounded-br-md bg-primary text-on-primary'
                        : m.tone === 'alert'
                          ? 'rounded-tl-md border border-error/40 bg-error-container text-on-error-container'
                          : 'rounded-tl-md border border-outline-variant bg-surface-container-low text-on-surface'
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.articleId && (
                    <button
                      type="button"
                      onClick={() => {
                        const id = m.articleId!
                        setOpen(false)
                        onOpenArticle(id)
                      }}
                      className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/50 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <Icon icon="arrow_forward" size="xs" />
                      Open guide
                    </button>
                  )}

                  {m.offerHuman && m.from === 'bot' && (
                    <button
                      type="button"
                      onClick={requestHuman}
                      className="mt-1.5 ml-1 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-outline-variant px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                    >
                      <Icon icon="person" size="xs" />
                      Talk to a person
                    </button>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start" aria-label="Assistant is typing">
                <div className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md border border-outline-variant bg-surface-container-low px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {messages.length <= 3 && (
            <div className="flex flex-wrap gap-1.5 border-t border-outline-variant px-3 py-2.5">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQuickReply(q)}
                  className="min-h-8 rounded-full border border-primary/40 px-3 py-1.5 text-xs text-on-surface transition-colors hover:bg-primary hover:text-on-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="border-t border-outline-variant bg-surface-container-low px-3 py-2.5">
            <div className="flex items-end gap-1.5 rounded-2xl border border-outline-variant bg-background p-1.5 focus-within:border-primary">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask how something works…"
                aria-label="Message the support assistant"
                className="min-h-11 flex-1 border-0 bg-transparent px-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                aria-label="Send message"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary transition-opacity disabled:opacity-40"
              >
                <Icon icon="send" size="md" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-on-surface-variant">
              Answers come from the guides below · not medical advice
            </p>
          </form>
        </section>
      )}

      {/* Shown once so the launcher is discoverable without being noisy. */}
      {!open && messages.length === 1 && (
        <div className="pointer-events-none fixed right-4 bottom-36 z-30 hidden max-w-[220px] rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs text-on-surface-variant shadow-lg md:bottom-24 md:block">
          Looking for something? Ask the assistant or browse the guides.
          <span className="absolute right-6 -bottom-2 h-3 w-3 rotate-45 border-r border-b border-outline-variant bg-surface" aria-hidden="true" />
        </div>
      )}
    </>
  )
}
