import { useState } from 'react'
import Icon from './Icon'

type FeedbackData = {
  assessmentId: string
  rating: 'helpful' | 'not_helpful' | null
  comment: string
  submittedAt: string
}

type TriageFeedbackProps = {
  assessmentId: string
}

export default function TriageFeedback({ assessmentId }: TriageFeedbackProps) {
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!rating) return
    const feedback: FeedbackData = {
      assessmentId,
      rating,
      comment,
      submittedAt: new Date().toISOString(),
    }
    const existing = JSON.parse(localStorage.getItem('moidoctar_feedback') || '[]')
    existing.push(feedback)
    localStorage.setItem('moidoctar_feedback', JSON.stringify(existing))
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
        <Icon icon="check_circle" size="lg" className="text-green-500 mx-auto mb-2" />
        <p className="font-label-md text-label-md text-green-600 dark:text-green-400">Thank you for your feedback!</p>
        <p className="text-caption text-secondary mt-1">Your input helps us improve our assessments.</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-surface border border-outline-variant rounded-2xl">
      <h4 className="font-label-md text-label-md text-on-surface mb-3 flex items-center gap-2">
        <Icon icon="rate_review" size="md" className="text-primary" />
        Was this assessment helpful?
      </h4>

      <div className="flex gap-3 mb-3">
        <button
          onClick={() => setRating('helpful')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all min-h-[44px] ${
            rating === 'helpful'
              ? 'bg-green-500/15 border-green-500/40 text-green-600 dark:text-green-400'
              : 'border-outline-variant hover:border-green-500/30 text-secondary'
          }`}
        >
          <Icon icon="thumb_up" size="md" />
          Helpful
        </button>
        <button
          onClick={() => setRating('not_helpful')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all min-h-[44px] ${
            rating === 'not_helpful'
              ? 'bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400'
              : 'border-outline-variant hover:border-red-500/30 text-secondary'
          }`}
        >
          <Icon icon="thumb_down" size="md" />
          Not Helpful
        </button>
      </div>

      {rating && (
        <div className="space-y-3 animate-[auth-rise-in_300ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: Tell us how we can improve (e.g., inaccurate symptoms, unclear recommendations)..."
            className="w-full p-3 bg-surface border border-outline-variant rounded-xl text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-bold transition-all min-h-[44px]"
          >
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  )
}
