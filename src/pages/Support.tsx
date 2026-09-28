import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import ArticleReader from '../components/support/ArticleReader'
import ManualRequestForm from '../components/support/ManualRequestForm'
import SupportChatbot from '../components/support/SupportChatbot'
import {
  SUPPORT_ARTICLES,
  SUPPORT_CATEGORIES,
  SUPPORT_EMAIL,
  SUPPORT_FAQ,
  SUPPORT_RESPONSE_TIME,
  articleFields,
  articleText,
  faqFields,
  faqText,
  formatPublishedDate,
  matchThreshold,
  searchTokens,
  tokenHits,
  weightedScore,
  type SupportArticle,
} from '../data/supportContent'
import { flushSupportQueue } from '../lib/supportRequests'

const ALL = 'All'

export default function Support() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [openArticleId, setOpenArticleId] = useState<string | null>(null)
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)
  const requestRef = useRef<HTMLElement>(null)

  // Anything filed while the support service was unreachable goes out now.
  useEffect(() => {
    void flushSupportQueue()
  }, [])

  const tokens = useMemo(() => searchTokens(query), [query])
  // No query means "show everything" — matchThreshold(0) would otherwise
  // demand one token hit and empty the page on first load.
  const threshold = tokens.length ? matchThreshold(tokens.length) : 0

  const { articles, faqs } = useMemo(() => {
    // Recall matters more than precision when browsing: keep anything that
    // matches most of the query, but rank by the weighted score so the guide
    // that is actually about the words lands first.
    const articles = SUPPORT_ARTICLES
      .filter((a) => category === ALL || a.category === category)
      .map((a) => ({ article: a, hits: tokens.length ? tokenHits(articleText(a), tokens) : 0 }))
      .filter(({ hits }) => hits >= threshold)
      .sort((a, b) =>
        tokens.length
          ? weightedScore(articleFields(b.article), tokens) - weightedScore(articleFields(a.article), tokens)
          : b.article.publishedAt.localeCompare(a.article.publishedAt),
      )
      .map(({ article }) => article)

    const faqs = SUPPORT_FAQ
      .filter((f) => category === ALL || f.category === category)
      .map((f) => ({ faq: f, hits: tokens.length ? tokenHits(faqText(f), tokens) : 0 }))
      .filter(({ hits }) => hits >= threshold)
      .sort((a, b) =>
        tokens.length ? weightedScore(faqFields(b.faq), tokens) - weightedScore(faqFields(a.faq), tokens) : 0,
      )
      .map(({ faq }) => faq)

    return { articles, faqs }
  }, [tokens, threshold, category])

  const searching = tokens.length > 0
  const openArticle = openArticleId ? (SUPPORT_ARTICLES.find((a) => a.id === openArticleId) ?? null) : null
  const nothing = articles.length === 0 && faqs.length === 0

  const scrollToRequest = () => {
    requestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ---------- header ---------- */}
      <header>
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <Icon icon="help" size="sm" />
          Help centre
        </p>
        <h1 className="mt-1 font-headline-lg text-headline-lg font-bold text-on-surface">Support</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-on-surface-variant">
          Guides that walk you through every feature, answers to the questions we get most, and a form
          that puts your question in front of a person.
        </p>
      </header>

      {/* ---------- search ---------- */}
      <div className="mt-6">
        <label htmlFor="support-search" className="sr-only">
          Search guides and questions
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:px-4">
          <Icon icon="search" size="lg" className="shrink-0 text-secondary" />
          <input
            id="support-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpenFaqId(null)
            }}
            placeholder="Search guides — try “medication reminder” or “is my data private”"
            className="min-h-14 w-full border-0 bg-transparent text-base text-on-surface outline-none placeholder:text-on-surface-variant/70"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="grid min-h-9 min-w-9 shrink-0 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon icon="close" size="md" />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[ALL, ...SUPPORT_CATEGORIES].map((c) => {
            const active = category === c
            const count = c === ALL
              ? SUPPORT_ARTICLES.length
              : SUPPORT_ARTICLES.filter((a) => a.category === c).length
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`min-h-9 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface'
                }`}
              >
                {c}
                <span className={active ? 'ml-1.5 opacity-80' : 'ml-1.5 text-on-surface-variant/70'}>{count}</span>
              </button>
            )
          })}
        </div>

        {(searching || category !== ALL) && (
          <p className="mt-3 text-xs text-on-surface-variant" role="status" aria-live="polite">
            {searching ? (
              <>
                {articles.length} {articles.length === 1 ? 'guide' : 'guides'} and {faqs.length}{' '}
                {faqs.length === 1 ? 'answer' : 'answers'} for “{query}”
                {category !== ALL && ` in ${category}`}
              </>
            ) : (
              `${articles.length} ${articles.length === 1 ? 'guide' : 'guides'} in ${category}`
            )}
          </p>
        )}
      </div>

      {/* ---------- guides ---------- */}
      <section className="mt-8" aria-labelledby="guides-h">
        <div className="flex items-center justify-between gap-3">
          <h2 id="guides-h" className="font-headline-md text-lg font-bold text-on-surface">
            Guides &amp; how-tos
          </h2>
          {searching && (
            <button
              type="button"
              onClick={() => { setQuery(''); setCategory(ALL) }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {articles.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} onOpen={() => setOpenArticleId(article.id)} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-outline-variant px-4 py-6 text-center text-sm text-on-surface-variant">
            No guides match that.
          </p>
        )}
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="mt-10" aria-labelledby="faq-h">
        <h2 id="faq-h" className="font-headline-md text-lg font-bold text-on-surface">Questions people ask</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Short answers to the things people ask most. Anything longer lives in the guides above.
        </p>

        {faqs.length > 0 ? (
          <ul className="mt-4 divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface">
            {faqs.map((faq) => {
              const open = openFaqId === faq.id
              return (
                <li key={faq.id}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(open ? null : faq.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-container-low"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-on-surface">{faq.question}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                          {faq.category}
                        </span>
                      </span>
                      <Icon
                        icon={open ? 'expand_less' : 'expand_more'}
                        size="md"
                        className="shrink-0 text-secondary"
                      />
                    </button>
                  </h3>
                  {open && (
                    <div className="px-4 pb-4">
                      <p className="max-w-3xl text-sm leading-relaxed text-on-surface-variant">{faq.answer}</p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-outline-variant px-4 py-6 text-center text-sm text-on-surface-variant">
            No questions match that.
          </p>
        )}
      </section>

      {/* ---------- nothing found ---------- */}
      {nothing && (
        <section className="mt-8 rounded-2xl border border-primary/30 bg-primary-container/30 p-5 sm:p-6" aria-labelledby="noresults-h">
          <h2 id="noresults-h" className="font-headline-md text-lg font-bold text-on-surface">
            Still stuck? Two ways forward
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Ask the assistant in the corner for an instant answer, or send a request and let a person
            pick it up. Include what you were doing and what you expected — it speeds the reply up.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={scrollToRequest}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
            >
              <Icon icon="mail" size="md" />
              Send a manual request
            </button>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[Support] Help needed')}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline px-5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
            >
              <Icon icon="send" size="md" />
              Email {SUPPORT_EMAIL}
            </a>
          </div>
        </section>
      )}

      {/* ---------- talk to a person ---------- */}
      <section ref={requestRef} className="mt-12 scroll-mt-20" aria-labelledby="request-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="request-h" className="font-headline-md text-lg font-bold text-on-surface">
              Talk to a person
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Some questions are not for a bot. Send this and a person replies to your email — usually
              within {SUPPORT_RESPONSE_TIME.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ManualRequestForm />

          <aside className="space-y-4">
            <div className="rounded-2xl border border-outline-variant bg-surface p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface">
                <Icon icon="schedule" size="sm" className="text-primary" />
                What happens next
              </h3>
              <ol className="mt-3 space-y-2.5 text-sm text-on-surface-variant">
                {[
                  'You get a ticket number straight away — keep it for any follow-up.',
                  'A person picks the request up and replies to the email you left.',
                  'We do not share your message with anyone outside the support team.',
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-outline-variant bg-surface p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface">
                <Icon icon="check" size="sm" className="text-primary" />
                Faster replies when you include
              </h3>
              <ul className="mt-2.5 space-y-1.5 text-sm text-on-surface-variant">
                {[
                  'Which page you were on',
                  'What you did, and what you expected instead',
                  'Your phone or browser, if it looks like a bug',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-error/30 bg-error-container/40 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-on-error-container">
                <Icon icon="warning" size="sm" />
                This is not an emergency line
              </h3>
              <p className="mt-1.5 text-sm text-on-error-container">
                Support replies are not monitored around the clock. For anything urgent, call your local
                emergency number or go to the nearest emergency department.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ---------- reader + assistant ---------- */}
      {openArticle && (
        <ArticleReader
          article={openArticle}
          onClose={() => setOpenArticleId(null)}
          onOpenArticle={setOpenArticleId}
          onRequestHelp={() => {
            setOpenArticleId(null)
            scrollToRequest()
          }}
        />
      )}

      <SupportChatbot
        onOpenArticle={setOpenArticleId}
        onRequestHuman={() => scrollToRequest()}
      />
    </main>
  )
}

function ArticleCard({ article, onOpen }: { article: SupportArticle; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-2xl border border-outline-variant bg-surface p-4 text-left transition-all hover:border-primary/60 hover:bg-surface-container-lowest"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Icon icon={article.icon} size="md" />
        </span>
        <span className="rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          {article.category}
        </span>
      </div>

      <h3 className="mt-3 text-[15px] font-bold leading-snug text-on-surface transition-colors group-hover:text-primary">
        {article.title}
      </h3>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{article.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-outline-variant pt-3 text-[11px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <Icon icon="calendar_month" size="xs" />
          Published {formatPublishedDate(article.publishedAt)}
        </span>
        {article.updatedAt && (
          <span className="inline-flex items-center gap-1">
            <Icon icon="history" size="xs" />
            Updated {formatPublishedDate(article.updatedAt)}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Icon icon="schedule" size="xs" />
          {article.readMinutes} min
        </span>
        <span className="ml-auto inline-flex items-center gap-1 font-bold text-primary">
          Read
          <Icon icon="arrow_forward" size="xs" />
        </span>
      </div>
    </button>
  )
}
