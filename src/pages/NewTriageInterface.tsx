import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { getUserInitials } from '../utils/getUserInitials'
import LianaAvatar from '../components/LianaAvatar'
import { useCreateTriageChat } from '../hooks/useMoiDoctor'
import type { TriageChatResponse } from '../types/triage'

const initialMessages = [
  { role: 'ai', text: "Hello. I'm ready to help assess your symptoms. Could you please describe what you're feeling and when it started?" },
]

export default function NewTriageInterface() {
  const navigate = useNavigate()
  const createTriage = useCreateTriageChat()
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const [assessment, setAssessment] = useState<TriageChatResponse | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const turnCountRef = useRef(0)

  const userSymptoms = messages.filter(m => m.role === 'user').map(m => m.text).join('\n')
  const messagesJson = JSON.stringify(messages.map(m => ({ role: m.role, content: m.text })))

  const triggerAssessment = useCallback(() => {
    if (userSymptoms.length < 1) return
    createTriage.mutate(
      {
        symptoms: userSymptoms,
        messages: messagesJson,
        image: selectedImage ?? undefined,
      },
      {
        onSuccess: (res) => {
          setAssessment(res.data)
        },
      },
    )
  }, [userSymptoms, messagesJson, selectedImage])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedImage(file)
  }

  useEffect(() => {
    if (userSymptoms.length >= 1 && turnCountRef.current === 0) {
      turnCountRef.current = 1
      triggerAssessment()
    }
  }, [messages.length])

  useEffect(() => {
    if (turnCountRef.current > 1) {
      triggerAssessment()
    }
  }, [messages.length])

  const handleSend = (text?: string) => {
    const msg = (text ?? inputValue).trim()
    if (!msg) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInputValue('')
    if (assessment) {
      turnCountRef.current++
    }
  }

  const handleFollowUpClick = (question: string) => {
    handleSend(question)
  }

  const urgencyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
      case 'emergency':
      case 'urgent':
        return 'bg-error text-on-error'
      case 'moderate':
        return 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
      default:
        return 'bg-blue-400 text-white'
    }
  }

  const confidencePercent = (score: number) => Math.round(Math.max(0, Math.min(1, score)) * 100)

  return (
    <div className="flex flex-col h-full relative z-10">
      <main className="flex-1 max-w-container-max-width mx-auto w-full p-margin-mobile md:p-gutter flex flex-col md:flex-row gap-4 md:gap-gutter h-[calc(100vh-56px)] h-[calc(100dvh-56px)] md:h-[calc(100vh-64px)] md:h-[calc(100dvh-64px)] pb-6 overflow-hidden">
        <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-stack-md">
          <div className="bg-surface-container rounded-xl p-6 shadow-sm border border-outline-variant/20 flex-1 flex flex-col relative overflow-hidden">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-surface-container-highest text-on-surface-variant text-xs font-semibold rounded-full mb-3 shadow-sm border border-outline-variant/30">In Progress</span>
              <h3 className="font-headline-md text-headline-md text-on-primary-fixed font-bold">New Session</h3>
              <p className="font-caption text-caption text-secondary mt-1 flex items-center gap-1">
                <Icon icon="schedule" size="xs" /> Started {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            </div>
            <div className="flex-1">
              <h4 className="font-label-md text-label-md text-on-surface-variant mb-2 font-bold uppercase tracking-wider text-xs">Primary Complaint</h4>
              <div className="bg-surface/60 rounded-lg p-3 backdrop-blur-sm border border-outline-variant/30 mb-4">
                <p className="font-body-md text-body-md text-on-surface">--</p>
              </div>
              <h4 className="font-label-md text-label-md text-on-surface-variant mb-2 font-bold uppercase tracking-wider text-xs">Identified Symptoms</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-surface/60 rounded-full text-sm font-medium text-on-surface border border-outline-variant/30 shadow-sm backdrop-blur-sm">--</span>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-primary/10">
                <div className="flex items-center gap-3">
                  <LianaAvatar size="sm" />
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-bold">LIANA</p>
                    <p className="font-caption text-caption text-secondary">Your Personal Health Assistant</p>
                  </div>
                </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
            {messages.map((msg, i) => (
              msg.role === 'ai' ? (
                <div key={i} className="flex gap-3 md:gap-4 max-w-[90%] md:max-w-[85%]">
                  <div className="mt-1">
                    <LianaAvatar size="sm" />
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-2xl rounded-tl-sm border border-outline-variant/20 shadow-sm">
                    <p className="font-body-md text-body-md text-on-surface">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-4 max-w-[85%] self-end flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-secondary-container flex-shrink-0 flex items-center justify-center mt-1 font-bold text-on-surface-variant text-sm">
                    {getUserInitials()}
                  </div>
                  <div className="bg-primary text-on-primary p-4 rounded-2xl rounded-tr-sm shadow-md">
                    <p className="font-body-md text-body-md">{msg.text}</p>
                  </div>
                </div>
              )
            ))}

            {messages.filter(m => m.role === 'user').length >= 1 && (
              <div className="mt-4 mb-2 mx-auto w-full max-w-md bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary-container" />
                {createTriage.isPending ? (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="font-body-md text-on-surface-variant">Analyzing your symptoms...</p>
                  </div>
                ) : createTriage.isError ? (
                  <div className="flex flex-col items-center py-4">
                    <Icon icon="error" size="md" />
                    <p className="font-body-md text-on-surface-variant mt-2 mb-3">Unable to complete assessment.</p>
                    <button
                      className="bg-primary text-on-primary px-5 py-2 rounded-lg font-label-md text-label-md"
                      onClick={() => {
                        createTriage.reset()
                        triggerAssessment()
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : assessment ? (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-headline-md text-[18px] font-bold text-on-surface">Preliminary Assessment</h4>
                        <p className="font-caption text-caption text-secondary">Based on current data</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${urgencyColor(assessment.urgency_level)}`}>
                          {assessment.urgency_level}
                        </span>
                        <span className="text-caption font-label-md text-on-surface-variant" title="Confidence Score">
                          {confidencePercent(assessment.confidence_score)}%
                        </span>
                      </div>
                    </div>

                    {assessment.needs_more_info && (
                      <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-1.5">
                        <Icon icon="info" size="sm" />
                        <p className="text-caption text-amber-800 text-[11px]">
                          Additional details would help refine this assessment.
                        </p>
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="w-full bg-surface-container-high rounded-full h-1">
                        <div
                          className="h-1 rounded-full bg-primary transition-all"
                          style={{ width: `${confidencePercent(assessment.confidence_score)}%` }}
                        />
                      </div>
                    </div>

                    <p className="font-body-md text-[14px] text-on-surface-variant mb-3">{assessment.rationale}</p>

                    {assessment.possible_conditions.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-label-md text-label-md text-on-surface-variant mb-1.5">Possible Conditions</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {assessment.possible_conditions.map((cond, i) => (
                            <span key={i} className="px-2.5 py-1 bg-surface-container-high rounded-full text-xs font-medium">
                              {cond}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {assessment.recommended_actions.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-label-md text-label-md text-on-surface-variant mb-1.5">Recommended Actions</h5>
                        <ul className="space-y-1">
                          {assessment.recommended_actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                              <span className="text-primary mt-0.5 shrink-0">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {assessment.follow_up_questions.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-label-md text-label-md text-on-surface-variant mb-1.5">Follow-up Questions</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {assessment.follow_up_questions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => handleFollowUpClick(q)}
                              className="px-2.5 py-1 bg-surface-container-high hover:bg-primary-container/20 rounded-full text-xs font-medium text-primary border border-outline-variant/40 transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {assessment.red_flags_to_watch.length > 0 && (
                      <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                        <h5 className="font-label-md text-label-md text-error mb-1.5 flex items-center gap-1 text-[11px]">
                          <Icon icon="warning" size="sm" />
                          Red Flags to Watch
                        </h5>
                        <ul className="space-y-0.5">
                          {assessment.red_flags_to_watch.map((flag, i) => (
                            <li key={i} className="flex items-start gap-1 text-caption text-red-700 text-[11px]">
                              <span className="mt-0.5 shrink-0">⚠</span>
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-caption text-secondary italic text-[11px] mb-3">{assessment.disclaimer}</p>

                    <button className="w-full py-2.5 rounded-lg bg-surface-container-high text-primary font-label-md text-label-md font-bold hover:bg-surface-variant transition-colors border border-outline-variant/30" onClick={() => navigate('/care-details')}>
                      View Detailed Care Pathway
                    </button>
                  </>
                ) : (
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-headline-md text-[18px] font-bold text-on-surface">Preliminary Assessment</h4>
                      <p className="font-caption text-caption text-secondary">Based on current data</p>
                    </div>
                    <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-bold rounded-full uppercase tracking-wide">Pending</span>
                  </div>
                )}
              </div>
            )}

            <div className="h-4" />
          </div>

          <div className="p-3 md:p-4 bg-surface-container-lowest border-t border-outline-variant/30">
            <div className="flex items-center gap-2 bg-surface-container-low rounded-xl p-2 border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <button className="p-2 text-secondary hover:text-primary transition-colors rounded-full hover:bg-surface-variant shrink-0 relative" onClick={() => fileInputRef.current?.click()} title="Attach Photo">
                <Icon icon="add_a_photo" size="md" />
                {selectedImage && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-md placeholder:text-outline p-2 min-w-0"
                placeholder="Describe your symptoms or reply..."
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              />
              <button className="p-2 text-secondary hover:text-primary transition-colors rounded-full hover:bg-surface-variant shrink-0" title="Voice Input">
                <Icon icon="mic" size="md" />
              </button>
              <button className="p-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors shrink-0 ml-1 shadow-sm flex items-center justify-center w-10 h-10" title="Send" onClick={() => handleSend()}>
                <Icon icon="send" size="md" />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="font-caption text-[11px] text-secondary">Moidoctar provides triage guidance, not a medical diagnosis. In an emergency, dial 911.</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
