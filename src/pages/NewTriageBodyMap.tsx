import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useBodyMap } from '../context/BodyMapContext'
import { getUserInitials } from '../utils/getUserInitials'
import LianaAvatar from '../components/LianaAvatar'
import EmergencyEscalation from '../components/EmergencyEscalation'
import TriageFeedback from '../components/TriageFeedback'
import { useCreateTriageChat } from '../hooks/useMoiDoctor'
import type { TriageChatResponse } from '../types/triage'

type Severity = 'Mild' | 'Moderate' | 'Severe'

export default function NewTriageBodyMap() {
  const navigate = useNavigate()
  const { addSession } = useAuth()
  const { selectedAreas, hasAreas } = useBodyMap()
  const createTriage = useCreateTriageChat()
  const sessionId = Date.now().toString(36).toUpperCase()
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [showPanel, setShowPanel] = useState(true)
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hi, I'm LIANA, your personal health assistant. I'm here to help you with your health questions, symptoms, and navigating MoiDoctar. How can I help you today?",
      time: 'Sent at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [assessment, setAssessment] = useState<TriageChatResponse | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const turnCountRef = useRef(0)

  const bodyMapContext = hasAreas
    ? '\n[Affected body areas: ' + selectedAreas.map(a => `${a.label} (${a.severity}${a.notes ? ', ' + a.notes : ''})`).join('; ') + ']'
    : ''

  const userSymptoms = messages.filter(m => m.role === 'user').map(m => m.text).join('\n') + bodyMapContext
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
    if (selectedSeverity && userSymptoms.length >= 1 && turnCountRef.current === 0) {
      turnCountRef.current = 1
      triggerAssessment()
    }
  }, [selectedSeverity, messages.length])

  useEffect(() => {
    if (turnCountRef.current > 1) {
      triggerAssessment()
    }
  }, [messages.length])

  const handleSend = (text?: string) => {
    const msg = (text ?? inputValue).trim()
    if (!msg) return
    setMessages(prev => [...prev, { role: 'user', text: msg, time: 'Just now' }])
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

  const severityOptions: { label: Severity; dot: string; border: string; hover: string }[] = [
    { label: 'Mild', dot: 'bg-blue-400', border: 'border-blue-400', hover: 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20' },
    { label: 'Moderate', dot: 'bg-yellow-400', border: 'border-primary', hover: '' },
    { label: 'Severe', dot: 'bg-error', border: 'border-error', hover: 'hover:border-error hover:bg-red-50 dark:hover:bg-red-900/20' },
  ]

  return (
    <main className="h-[calc(100vh-56px)] h-[calc(100dvh-56px)] md:h-[calc(100vh-64px)] md:h-[calc(100dvh-64px)] flex overflow-hidden relative">
      {/* Left Info Panel */}
      {showPanel && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setShowPanel(false)} />
      )}
      <aside className={`${showPanel ? 'flex' : 'hidden'} md:flex fixed md:relative inset-y-0 left-0 z-40 md:z-auto w-[85vw] max-w-[320px] md:w-80 bg-surface-container border border-outline-variant/20 shadow-sm p-stack-lg text-on-surface flex-col shrink-0 overflow-hidden`}>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-surface-container-high/70 backdrop-blur-md px-3 py-1 rounded-full mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-caption font-caption uppercase tracking-wider">Active Session</span>
          </div>
          <h2 className="font-headline-md text-headline-md mb-8">Triage Summary</h2>
          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <span className="text-secondary text-caption font-label-md">START TIME</span>
              <span className="font-body-md">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-secondary text-caption font-label-md">PATIENT ID</span>
              <span className="font-body-md">#--</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-secondary text-caption font-label-md">PRIMARY CHIEF COMPLAINT</span>
              <span className="font-body-md">{hasAreas ? selectedAreas.map(a => a.label).join(', ') : '--'}</span>
            </div>
            {hasAreas && (
              <div className="flex flex-col gap-1">
                <span className="text-secondary text-caption font-label-md">AFFECTED AREAS</span>
                <div className="flex flex-wrap gap-1">
                  {selectedAreas.map((area) => (
                    <span key={area.id} className="px-2 py-0.5 bg-primary-container/20 text-primary rounded-full text-caption font-medium">
                      {area.label} ({area.severity})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-12 bg-surface-container-low rounded-xl p-4 border border-outline-variant/20">
            <h3 className="font-label-md text-label-md mb-3 flex items-center gap-2">
              <Icon icon="info" size="md" />
              Clinical Context
            </h3>
            <p className="text-caption font-caption leading-relaxed text-on-surface-variant">
              Please describe the onset and nature of symptoms clearly. The system uses clinical-grade reasoning to suggest next steps.
            </p>
          </div>
        </div>
        <div className="mt-auto pt-6 border-t border-outline-variant/30 text-on-surface-variant/60 text-caption italic">
          Secure 256-bit HIPAA compliant session
        </div>
      </aside>

      {/* Right Chat Panel */}
      <section className="flex-grow flex flex-col bg-surface relative">
        <button
          type="button"
          className="md:hidden absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-outline-variant/50 bg-surface-container-lowest/90 px-3 py-2 text-xs font-bold text-secondary shadow-sm backdrop-blur-md"
          onClick={() => setShowPanel(true)}
        >
          <Icon icon="info" size="sm" />
          Session details
        </button>
        <header className="hidden">
          <div className="flex items-center gap-3">
            <LianaAvatar size="sm" />
            <div>
              <p className="font-label-md text-label-md font-bold">LIANA</p>
              <p className="text-caption text-secondary">Your Personal Health Assistant · MoiDoctar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 hover:bg-surface-container-high rounded-full transition-colors text-secondary"
              onClick={() => setShowPanel(!showPanel)}
            >
              <Icon icon={showPanel ? 'close' : 'info'} size="md" />
            </button>
            <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-secondary" onClick={() => navigate('/history')}>
              <Icon icon="history" size="md" />
            </button>
            <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-secondary">
              <Icon icon="more_vert" size="md" />
            </button>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto px-4 md:px-gutter pb-32 pt-14 md:pt-gutter space-y-6 md:space-y-8 chat-container">
          {messages.map((msg, i) => (
            msg.role === 'ai' ? (
              <div key={i} className="flex gap-4 max-w-full md:max-w-2xl">
                <div className="shrink-0">
                  <LianaAvatar size="sm" />
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-tl-none p-4 shadow-sm">
                  <p className="font-body-md text-on-surface">{msg.text}</p>
                  <p className="text-caption text-secondary mt-2">{msg.time}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-4 justify-end">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tr-none px-6 py-4 shadow-lg max-w-full md:max-w-xl">
                  <p className="font-body-md">{msg.text}</p>
                  <p className="text-caption text-on-primary-container mt-2 opacity-80 text-right">{msg.time}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0 font-bold text-white text-xs">
                  {getUserInitials()}
                </div>
              </div>
            )
          ))}

          {/* Severity & Body Map Selection */}
          {messages.length > 1 && !selectedSeverity && (
            <div className="flex gap-4 max-w-full md:max-w-2xl">
              <div className="shrink-0">
                <LianaAvatar size="sm" />
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-tl-none p-4 shadow-sm space-y-4">
                <p className="font-body-md text-on-surface">
                  I understand. On a scale of severity, how would you classify this pain right now?
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => navigate('/symptom-tracker-body-map')}
                    className="px-5 py-2 rounded-full border border-primary bg-primary-container/10 text-primary hover:bg-primary-container/20 transition-all font-label-md text-label-md flex items-center gap-2"
                  >
                    <Icon icon="body_system" size="sm" />
                    Map My Pain
                  </button>
                  {severityOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedSeverity(opt.label)}
                      className={`px-5 py-2 rounded-full font-label-md text-label-md flex items-center gap-2 transition-all ${
                        selectedSeverity === opt.label
                          ? `border-2 ${opt.border} bg-primary-container/5`
                          : `border border-outline-variant ${opt.hover}`
                      }`}
                    >
                      <span className={`w-2 h-2 ${opt.dot} rounded-full`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Triage Result Card */}
          {selectedSeverity && (
            <div className="flex gap-4 max-w-full md:max-w-2xl">
              <div className="shrink-0">
                <LianaAvatar size="sm" />
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-2xl rounded-tl-none p-6 shadow-md w-full border-l-4 border-l-tertiary-container">
                {createTriage.isPending ? (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-body-md text-on-surface-variant">Analyzing your symptoms...</p>
                  </div>
                ) : createTriage.isError ? (
                  <div className="flex flex-col items-center py-6">
                    <Icon icon="error" size="lg" />
                    <p className="font-body-md text-on-surface-variant mt-3 mb-4">
                      Unable to complete assessment. Please try again.
                    </p>
                    <button
                      className="bg-primary text-on-primary px-6 py-2 rounded-xl font-label-md text-label-md"
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
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-headline-md text-headline-md text-on-surface">Preliminary Assessment</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-caption font-label-md uppercase tracking-wide ${urgencyColor(assessment.urgency_level)}`}>
                          {assessment.urgency_level}
                        </span>
                        <span className="text-caption font-label-md text-on-surface-variant" title="Confidence Score">
                          {confidencePercent(assessment.confidence_score)}%
                        </span>
                      </div>
                    </div>

                    {assessment.needs_more_info && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                        <Icon icon="info" size="sm" />
                        <p className="text-caption text-amber-800">
                          Additional details would help refine this assessment. Consider answering the follow-up questions below.
                        </p>
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="w-full bg-surface-container-high rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${confidencePercent(assessment.confidence_score)}%` }}
                        />
                      </div>
                    </div>

                    <p className="font-body-md text-on-surface-variant mb-4">{assessment.rationale}</p>

                    {assessment.possible_conditions.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-label-md text-label-md text-on-surface-variant mb-2">Possible Conditions</h5>
                        <div className="flex flex-wrap gap-2">
                          {assessment.possible_conditions.map((cond, i) => (
                            <span key={i} className="px-3 py-1 bg-surface-container-high rounded-full text-caption font-medium">
                              {cond}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {assessment.recommended_actions.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-label-md text-label-md text-on-surface-variant mb-2">Recommended Actions</h5>
                        <ul className="space-y-1.5">
                          {assessment.recommended_actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 font-body-md text-on-surface-variant">
                              <span className="text-primary mt-0.5 shrink-0">•</span>
                              <span className="flex-1">{action}</span>
                              {action.toLowerCase().includes('hospital') || action.toLowerCase().includes('emergency') || action.toLowerCase().includes('doctor') || action.toLowerCase().includes('clinic') ? (
                                <button
                                  onClick={() => navigate('/local-care')}
                                  className="shrink-0 px-2 py-0.5 text-caption font-bold text-primary bg-primary-container/15 rounded-lg hover:bg-primary-container/25 transition-colors"
                                >
                                  Find Near Me
                                </button>
                              ) : action.toLowerCase().includes('pharmacy') || action.toLowerCase().includes('medication') ? (
                                <button
                                  onClick={() => navigate('/medication-tracker')}
                                  className="shrink-0 px-2 py-0.5 text-caption font-bold text-purple-500 bg-purple-500/10 rounded-lg hover:bg-purple-500/15 transition-colors"
                                >
                                  Track Meds
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {assessment.follow_up_questions.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-label-md text-label-md text-on-surface-variant mb-2">Follow-up Questions</h5>
                        <div className="flex flex-wrap gap-2">
                          {assessment.follow_up_questions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => handleFollowUpClick(q)}
                              className="px-3 py-1.5 bg-surface-container-high hover:bg-primary-container/20 rounded-full text-caption font-medium text-primary border border-outline-variant/40 transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {assessment.red_flags_to_watch.length > 0 && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <h5 className="font-label-md text-label-md text-error mb-2 flex items-center gap-1.5">
                          <Icon icon="warning" size="sm" />
                          Red Flags to Watch
                        </h5>
                        <ul className="space-y-1">
                          {assessment.red_flags_to_watch.map((flag, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-caption text-red-700">
                              <span className="mt-0.5 shrink-0">⚠</span>
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-caption text-secondary italic mb-6">{assessment.disclaimer}</p>

                    <EmergencyEscalation urgencyLevel={assessment.urgency_level} redFlags={assessment.red_flags_to_watch} />

                    <div className="mt-4">
                      <TriageFeedback assessmentId={assessment.assessment_id} />
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        className="flex-grow bg-primary text-on-primary py-3 rounded-xl font-label-md text-label-md hover:bg-primary-container transition-colors shadow-md shadow-primary/20"
                        onClick={() => {
                          addSession({
                            id: 'sess-' + Date.now(),
                            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                            condition: 'Self-reported symptoms',
                            description: 'Triage assessment completed.',
                            severity: selectedSeverity === 'Severe' ? 'Urgent' : selectedSeverity === 'Moderate' ? 'Moderate' : 'Stable',
                            statusLabel: 'Review Sent',
                            statusIcon: 'clinical_notes',
                          })
                          navigate('/care-details')
                        }}
                      >
                        View Care Details
                      </button>
                      <button className="px-4 py-3 border border-outline rounded-xl hover:bg-surface-container transition-colors">
                        <Icon icon="share" size="md" />
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Input Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-gutter bg-surface pt-8 md:pt-12 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-2 shadow-xl flex items-center gap-2 group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <button className="p-3 text-secondary hover:text-primary transition-colors hover:bg-surface-container-low rounded-xl relative" onClick={() => fileInputRef.current?.click()} title="Attach Image">
                <Icon icon="attach_file" size="md" />
                {selectedImage && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                className="flex-grow bg-transparent border-none focus:ring-0 font-body-md text-on-surface placeholder:text-secondary px-2"
                placeholder="Type your symptoms or questions..."
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              />
              <div className="flex items-center gap-1">
                <button className="p-3 text-secondary hover:text-primary transition-colors hover:bg-surface-container-low rounded-xl">
                  <Icon icon="mic" size="md" />
                </button>
                <button
                  className="bg-primary text-on-primary p-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center"
                  onClick={() => handleSend()}
                >
                  <Icon icon="send" size="md" />
                </button>
              </div>
            </div>
            <p className="text-center text-[11px] text-secondary mt-3 uppercase tracking-widest font-label-md">
              Encrypted Medical Dialogue • Session ID: #TR-{sessionId}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
