// Sending a manual support request (the "talk to a person" form).
//
// The request goes to POST /support/requests. Two things can go wrong and both
// are handled without lying to the person who just wrote a message:
//   - the backend is offline (the axios fallback handler answers unknown routes
//     with a generic 200, so we only count a response that carries the ticket id
//     the server acknowledged), or
//   - the deployed backend predates the endpoint and returns a 404.
// In both cases the request is queued in localStorage and retried the next time
// the Support page opens, and the UI says "saved on this device" rather than
// "sent".
import { api } from '../services/api'

export type SupportRequestPayload = {
  name: string
  email: string
  category: string
  subject: string
  message: string
  /** "urgent" is surfaced first on the human side; it does not mean medical urgency. */
  priority: 'normal' | 'urgent'
}

export type SubmitResult = {
  ticketId: string
  delivered: boolean
}

type QueuedRequest = SupportRequestPayload & {
  ticketId: string
  queuedAt: string
}

const QUEUE_KEY = 'moidoctar_support_request_queue'
const MAX_QUEUED = 10

type ServerResponse = { ticket_id?: string; id?: string; reference?: string }

function readQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const parsed = raw ? (JSON.parse(raw) as QueuedRequest[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(items: QueuedRequest[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUED)))
  } catch {
    // Private browsing / quota — nothing else we can do, the form still shows
    // the ticket id it generated so the person has something to quote.
  }
}

export function queuedRequestCount(): number {
  return readQueue().length
}

/** Client-generated so the ticket number exists even when delivery fails. */
export function newTicketId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `SUP-${suffix}`
}

async function post(payload: SupportRequestPayload & { ticket_id: string }): Promise<ServerResponse | null> {
  try {
    const res = await api.post<ServerResponse>('/support/requests', payload)
    return res ?? null
  } catch {
    return null
  }
}

function acknowledged(res: ServerResponse | null): string | null {
  if (!res) return null
  const id = res.ticket_id || res.id || res.reference
  return typeof id === 'string' && id ? id : null
}

/** Retry anything still sitting in the local queue. Best-effort, never throws. */
export async function flushSupportQueue(): Promise<number> {
  const queued = readQueue()
  if (queued.length === 0) return 0

  const remaining: QueuedRequest[] = []
  let sent = 0
  for (const item of queued) {
    const res = await post({
      name: item.name,
      email: item.email,
      category: item.category,
      subject: item.subject,
      message: item.message,
      priority: item.priority,
      ticket_id: item.ticketId,
    })
    if (acknowledged(res)) sent += 1
    else remaining.push(item)
  }
  writeQueue(remaining)
  return sent
}

export async function submitSupportRequest(payload: SupportRequestPayload): Promise<SubmitResult> {
  // Anything unsent goes out first, so the newest request is not the only one
  // that gets a fresh attempt.
  await flushSupportQueue()

  const ticketId = newTicketId()
  const res = await post({ ...payload, ticket_id: ticketId })
  const serverTicket = acknowledged(res)
  if (serverTicket) return { ticketId: serverTicket, delivered: true }

  const queue = readQueue()
  queue.push({ ...payload, ticketId, queuedAt: new Date().toISOString() })
  writeQueue(queue)
  return { ticketId, delivered: false }
}
