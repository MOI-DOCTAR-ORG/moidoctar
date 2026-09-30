// The Support page chat's online answers: POST /support/chat (Gemini, same key pool as triage).
//
// The page sends the guides that best match the question (ranked the same way the search
// bar ranks them), and the server only answers from those. Any failure, including the
// offline fallback handler's generic 200, returns null so the chat uses its keyword answers.

import { api } from '../services/api'
import {
  SUPPORT_ARTICLES,
  SUPPORT_FAQ,
  articleFields,
  articleText,
  faqFields,
  searchTokens,
  weightedScore,
} from '../data/supportContent'

export type AssistantAnswer = {
  text: string
  articleId?: string
  offerHuman: boolean
  tone: 'default' | 'alert'
}

type ServerReply = {
  reply?: string
  article_id?: string | null
  offer_human?: boolean
  tone?: string
}

type Guide = { id: string; title: string; text: string }

const MAX_GUIDES = 12
const FULL_TEXT_GUIDES = 6

/** Best-matching guides and FAQ entries in full, then the other guides by title and summary. */
export function guidesFor(query: string): Guide[] {
  const tokens = searchTokens(query)
  const ranked = [
    ...SUPPORT_ARTICLES.map((a) => ({
      score: weightedScore(articleFields(a), tokens),
      guide: { id: a.id, title: a.title, text: articleText(a).slice(0, 1500) },
    })),
    ...SUPPORT_FAQ.map((f) => ({
      score: weightedScore(faqFields(f), tokens),
      guide: { id: f.id, title: f.question, text: f.answer.slice(0, 1500) },
    })),
  ]
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, FULL_TEXT_GUIDES)
    .map((r) => r.guide)

  const used = new Set(ranked.map((g) => g.id))
  const rest = SUPPORT_ARTICLES.filter((a) => !used.has(a.id)).map((a) => ({ id: a.id, title: a.title, text: a.summary }))
  return [...ranked, ...rest].slice(0, MAX_GUIDES)
}

export async function askSupportAssistant(
  query: string,
  history: Array<{ role: 'user' | 'model'; text: string }>,
): Promise<AssistantAnswer | null> {
  try {
    const res = await api.post<ServerReply>('/support/chat', { message: query, history, guides: guidesFor(query) })
    const text = typeof res?.reply === 'string' ? res.reply.trim() : ''
    if (!text) return null
    const articleId = SUPPORT_ARTICLES.some((a) => a.id === res.article_id) ? (res.article_id as string) : undefined
    return { text, articleId, offerHuman: Boolean(res.offer_human), tone: res.tone === 'alert' ? 'alert' : 'default' }
  } catch {
    return null
  }
}
