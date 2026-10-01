import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import {
  SUPPORT_ARTICLES,
  formatPublishedDate,
  type SupportArticle,
} from '../../data/supportContent'

type Props = {
  article: SupportArticle
  onClose: () => void
  onOpenArticle: (id: string) => void
  onRequestHelp: () => void
}

type ArticleNoteTone = 'info' | 'warning' | 'error'

const toneClass = (tone?: ArticleNoteTone) =>
  tone === 'error'
    ? 'border-error/30 bg-error-container/50 text-on-error-container'
    : tone === 'warning'
      ? 'border-warning/30 bg-warning-container/50 text-on-warning-container'
      : 'border-primary/30 bg-primary/10 text-on-surface'

/**
 * The article reader: a modal over the Support page so opening a guide never
 * loses the search results behind it.
 */
export default function ArticleReader({ article, onClose, onOpenArticle, onRequestHelp }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const related = SUPPORT_ARTICLES.filter((a) => a.id !== article.id && a.category === article.category).slice(0, 3)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-reader-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-outline-variant bg-surface shadow-2xl sm:rounded-2xl animate-in fade-in duration-200">
        <header className="border-b border-outline-variant px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                <Icon icon={article.icon} size="xs" />
                {article.category}
              </span>
              <h2 id="article-reader-title" className="mt-2 font-headline-md text-xl font-bold leading-snug text-on-surface">
                {article.title}
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
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
                  {article.readMinutes} min read
                </span>
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close article"
              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon icon="close" size="lg" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-[15px] leading-relaxed text-on-surface-variant">{article.summary}</p>

          <div className="mt-5 space-y-6">
            {article.sections.map((section, i) => (
              <section key={section.heading || i}>
                {section.heading && (
                  <h3 className="text-base font-bold text-on-surface">{section.heading}</h3>
                )}
                {section.paragraphs?.map((p) => (
                  <p key={p} className="mt-2 text-[15px] leading-relaxed text-on-surface-variant">
                    {p}
                  </p>
                ))}
                {section.steps && section.steps.length > 0 && (
                  <ol className="mt-3 space-y-2">
                    {section.steps.map((step, si) => (
                      <li key={step} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-on-surface">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                          {si + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {section.note && (
                  <p className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${toneClass(section.noteTone)}`}>
                    <Icon icon={section.noteTone === 'info' ? 'info' : 'warning'} size="sm" className="mt-0.5 shrink-0" />
                    <span>{section.note}</span>
                  </p>
                )}
              </section>
            ))}
          </div>

          {related.length > 0 && (
            <section className="mt-7 border-t border-outline-variant pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Keep reading</h3>
              <div className="mt-2 flex flex-col gap-2">
                {related.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpenArticle(a.id)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest/70 px-3.5 py-3 text-left transition-colors hover:border-primary/60 hover:bg-surface-container"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-on-surface">{a.title}</span>
                      <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                        Published {formatPublishedDate(a.publishedAt)} · {a.readMinutes} min read
                      </span>
                    </span>
                    <Icon icon="arrow_forward" size="sm" className="shrink-0 text-primary" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">Was this helpful?</span>
              {(['up', 'down'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  aria-pressed={feedback === dir}
                  onClick={() => setFeedback(dir)}
                  className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
                    feedback === dir
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                  }`}
                  aria-label={dir === 'up' ? 'Yes, this helped' : 'No, this did not help'}
                >
                  <Icon icon={dir === 'up' ? 'thumb_up' : 'thumb_down'} size="sm" />
                </button>
              ))}
              {feedback && (
                <span className="text-xs font-semibold text-primary" role="status">
                  Thanks — noted.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onRequestHelp}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
            >
              <Icon icon="chat" size="md" />
              Still need help?
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
