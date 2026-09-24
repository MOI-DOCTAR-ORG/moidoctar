import TriageChat from '../components/TriageChat'

export default function NewTriage() {
<<<<<<< HEAD
  const navigate = useNavigate()
  const { addSession } = useAuth()
  const { selectedAreas, hasAreas } = useBodyMap()
  const createTriage = useCreateTriageChat()
  const sessionId = Date.now().toString(36).toUpperCase()
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | null>('Moderate')
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const bodyMapContext = hasAreas
    ? '\n[Affected body areas: ' + selectedAreas.map(a => `${a.label} (${a.severity}${a.notes ? ', ' + a.notes : ''})`).join('; ') + ']'
    : ''

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, createTriage.isPending, assessment])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedImage(file)
  }

  const handleSend = (text?: string) => {
    const msg = (text ?? inputValue).trim()
    if (!msg || createTriage.isPending) return

    const userMsg = { role: 'user', text: msg, time: 'Just now' }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputValue('')

    const messagesJson = JSON.stringify(updatedMessages.map(m => ({ role: m.role, content: m.text })))
    const fullSymptomContext = msg + bodyMapContext

    createTriage.mutate(
      {
        symptoms: fullSymptomContext,
        messages: messagesJson,
        image: selectedImage ?? undefined,
      },
      {
        onSuccess: (res) => {
          const data = res.data
          // 1. Add LIANA's AI response message into the chat stream!
          const replyText = data.reply || (data.has_symptoms ? data.rationale : "Hello! How can I help you today? Please feel free to share any symptoms or health questions.")
          setMessages(prev => [...prev, {
            role: 'ai',
            text: replyText,
            time: 'Just now',
          }])

          // 2. Only show the clinical assessment card & severity if actual symptoms were detected
          if (data.has_symptoms && data.possible_conditions && data.possible_conditions.length > 0) {
            setAssessment(data)
          } else {
            setAssessment(null)
          }
        },
      }
    )
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
        <div className="md:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
      )}
      <aside className={`${showPanel ? 'flex' : 'hidden'} md:flex fixed md:relative inset-y-0 left-0 z-40 md:z-auto w-[85vw] max-w-[320px] md:w-80 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-xl shadow-[var(--neon-primary)]/5 p-stack-lg text-on-surface flex-col shrink-0 overflow-hidden`}>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-[var(--glass-bg)] backdrop-blur-md px-3 py-1 rounded-full mb-8 border border-[var(--glass-border)]">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_#22c55e]" />
            <span className="text-caption font-caption uppercase tracking-wider">Active Session</span>
          </div>
          <h2 className="font-headline-md text-headline-md mb-8 bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-accent)] bg-clip-text text-transparent">Triage Summary</h2>
          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <span className="text-secondary text-caption font-label-md uppercase tracking-wider">Start Time</span>
              <span className="font-body-md">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-secondary text-caption font-label-md uppercase tracking-wider">Patient ID</span>
              <span className="font-body-md">#--</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-secondary text-caption font-label-md uppercase tracking-wider">Primary Complaint</span>
              <span className="font-body-md">{hasAreas ? selectedAreas.map(a => a.label).join(', ') : '--'}</span>
            </div>
            {hasAreas && (
              <div className="flex flex-col gap-1">
                <span className="text-secondary text-caption font-label-md uppercase tracking-wider">Affected Areas</span>
                <div className="flex flex-wrap gap-1">
                  {selectedAreas.map((area) => (
                    <span key={area.id} className="px-2 py-0.5 bg-[var(--neon-primary)]/15 text-[var(--neon-primary)] rounded-full text-caption font-medium border border-[var(--neon-primary)]/20">
                      {area.label} ({area.severity})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-12 bg-[var(--glass-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--glass-border)]">
            <h3 className="font-label-md text-label-md mb-3 flex items-center gap-2 text-[var(--neon-primary)]">
              <Icon icon="info" size="md" />
              Clinical Context
            </h3>
            <p className="text-caption font-caption leading-relaxed text-on-surface-variant">
              Please describe the onset and nature of symptoms clearly. The system uses clinical-grade reasoning to suggest next steps.
            </p>
          </div>
        </div>
        <div className="mt-auto pt-6 border-t border-[var(--glass-border)] text-on-surface-variant/60 text-caption italic">
          Secure 256-bit HIPAA compliant session
        </div>
      </aside>

      {/* Right Chat Panel */}
      <section className="flex-grow flex flex-col bg-surface relative">
        <button
          type="button"
          className="md:hidden absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl px-3 py-2 text-xs font-bold text-secondary shadow-sm min-h-[44px]"
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
              className="md:hidden p-2 hover:bg-[var(--glass-bg)] rounded-full transition-colors text-secondary min-h-[44px]"
              onClick={() => setShowPanel(!showPanel)}
            >
              <Icon icon={showPanel ? 'close' : 'info'} size="md" />
            </button>
            <button className="p-2 hover:bg-[var(--glass-bg)] rounded-full transition-colors text-secondary min-h-[44px]" onClick={() => navigate('/history')}>
              <Icon icon="history" size="md" />
            </button>
            <button className="p-2 hover:bg-[var(--glass-bg)] rounded-full transition-colors text-secondary min-h-[44px]">
              <Icon icon="more_vert" size="md" />
            </button>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto px-4 md:px-gutter pb-32 pt-14 md:pt-gutter space-y-6 md:space-y-8 chat-container">
          {messages.map((msg, i) => (
            msg.role === 'ai' ? (
              <div key={i} className="flex gap-4 max-w-[calc(100vw-2rem)] md:max-w-2xl">
                <div className="shrink-0 relative">
                  <div className="absolute -inset-1 rounded-full bg-[var(--neon-primary)] opacity-30 blur-md" />
                  <LianaAvatar size="sm" />
                </div>
                <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] border-l-[3px] border-l-[var(--neon-primary)] rounded-2xl rounded-tl-none p-4 shadow-lg shadow-[var(--neon-primary)]/5">
                  <p className="font-body-md text-on-surface">{msg.text}</p>
                  <p className="text-caption text-secondary mt-2">{msg.time}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-4 justify-end">
                <div className="bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-accent)] text-white rounded-2xl rounded-tr-none px-6 py-4 shadow-lg shadow-[var(--neon-primary)]/20 max-w-[calc(100vw-2rem)] md:max-w-xl">
                  <p className="font-body-md">{msg.text}</p>
                  <p className="text-caption mt-2 opacity-80 text-right">{msg.time}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--neon-primary)] to-[var(--neon-accent)] flex items-center justify-center shrink-0 font-bold text-white text-xs shadow-[0_0_12px_var(--neon-primary)]">
                  {getUserInitials()}
                </div>
              </div>
            )
          ))}

          {/* LIANA Typing indicator */}
          {createTriage.isPending && (
            <div className="flex gap-4 max-w-[calc(100vw-2rem)] md:max-w-2xl">
              <div className="shrink-0 relative">
                <div className="absolute -inset-1 rounded-full bg-[var(--neon-primary)] opacity-30 blur-md" />
                <LianaAvatar size="sm" />
              </div>
              <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] border-l-[3px] border-l-[var(--neon-primary)] rounded-2xl rounded-tl-none p-4 shadow-lg shadow-[var(--neon-primary)]/5 flex items-center gap-3">
                <div className="flex gap-1.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--neon-primary)] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[var(--neon-primary)] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--neon-primary)] animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-caption text-secondary font-label-md">LIANA is thinking...</span>
              </div>
            </div>
          )}

          {/* AI Message with Severity Triage - only when symptoms are detected */}
          {assessment && assessment.has_symptoms && (
            <div className="flex gap-4 max-w-[calc(100vw-2rem)] md:max-w-2xl">
              <div className="shrink-0 relative">
                <div className="absolute -inset-1 rounded-full bg-[var(--neon-primary)] opacity-30 blur-md" />
                <LianaAvatar size="sm" />
              </div>
              <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] border-l-[3px] border-l-[var(--neon-primary)] rounded-2xl rounded-tl-none p-4 shadow-lg shadow-[var(--neon-primary)]/5 space-y-4">
                <p className="font-body-md text-on-surface">
                  On a scale of severity, how would you classify these symptoms right now?
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {severityOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedSeverity(opt.label)}
                      className={`px-5 py-2 rounded-full font-label-md text-label-md flex items-center gap-2 transition-all min-h-[44px] ${
                        selectedSeverity === opt.label
                          ? `border-2 ${opt.border} bg-[var(--glass-bg)] backdrop-blur-md shadow-[0_0_12px_var(--neon-primary)]`
                          : `border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md ${opt.hover}`
                      }`}
                    >
                      <span className={`w-2 h-2 ${opt.dot} rounded-full ${selectedSeverity === opt.label ? 'shadow-[0_0_6px_currentColor]' : ''}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Triage Result Card - only when symptoms are detected */}
          {assessment && assessment.has_symptoms && (
            <div className="flex gap-4 max-w-[calc(100vw-2rem)] md:max-w-2xl">
              <div className="shrink-0 relative">
                <div className="absolute -inset-1 rounded-full bg-[var(--neon-primary)] opacity-30 blur-md" />
                <LianaAvatar size="sm" />
              </div>
              <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl rounded-tl-none p-6 shadow-xl shadow-[var(--neon-primary)]/5 w-full border-l-4 border-l-[var(--neon-primary)]">
                <div className="flex justify-between items-start mb-4">
                      <h4 className="font-headline-md text-headline-md text-on-surface bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-accent)] bg-clip-text text-transparent">Preliminary Assessment</h4>
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
                      <div className="w-full bg-[var(--glass-bg)] backdrop-blur-md rounded-full h-1.5 border border-[var(--glass-border)]">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-accent)] transition-all shadow-[0_0_8px_var(--neon-primary)]"
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
                            <span key={i} className="px-3 py-1 bg-[var(--glass-bg)] backdrop-blur-md rounded-full text-caption font-medium border border-[var(--glass-border)]">
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
                              <span className="text-[var(--neon-primary)] mt-0.5 shrink-0">•</span>
                              <span className="flex-1">{action}</span>
                              {action.toLowerCase().includes('hospital') || action.toLowerCase().includes('emergency') || action.toLowerCase().includes('doctor') || action.toLowerCase().includes('clinic') ? (
                                <button
                                  onClick={() => navigate('/local-care')}
                                  className="shrink-0 px-2 py-0.5 text-caption font-bold text-[var(--neon-primary)] bg-[var(--neon-primary)]/10 rounded-lg hover:bg-[var(--neon-primary)]/15 transition-colors"
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
                              className="px-3 py-1.5 bg-[var(--glass-bg)] backdrop-blur-md hover:bg-[var(--neon-primary)]/10 rounded-full text-caption font-medium text-[var(--neon-primary)] border border-[var(--glass-border)] hover:border-[var(--neon-primary)] transition-all min-h-[44px] shadow-[0_0_8px_var(--neon-primary)]/10 hover:shadow-[0_0_12px_var(--neon-primary)]/20"
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
                      <button className="flex-grow bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-accent)] text-white py-3 rounded-xl font-label-md text-label-md hover:shadow-[0_0_20px_var(--neon-primary)]/40 transition-all shadow-lg shadow-[var(--neon-primary)]/20 min-h-[44px]" onClick={() => { addSession({ id: 'sess-' + Date.now(), date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), condition: 'Self-reported symptoms', description: 'Triage assessment completed.', severity: selectedSeverity === 'Severe' ? 'Urgent' : selectedSeverity === 'Moderate' ? 'Moderate' : 'Stable', statusLabel: 'Review Sent', statusIcon: 'clinical_notes' }); navigate('/care-details') }}>
                        View Care Details
                      </button>
                      <button className="px-4 py-3 border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md rounded-xl hover:border-[var(--neon-primary)] hover:shadow-[0_0_12px_var(--neon-primary)]/20 transition-all min-h-[44px] flex items-center justify-center">
                        <Icon icon="share" size="md" />
                      </button>
                    </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-gutter bg-surface pt-8 md:pt-12 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl p-2 shadow-xl shadow-[var(--neon-primary)]/10 flex items-center gap-2 group focus-within:ring-2 focus-within:ring-[var(--neon-primary)]/30 transition-all">
              <button className="p-3 text-secondary hover:text-[var(--neon-primary)] transition-colors hover:bg-[var(--neon-primary)]/10 rounded-xl relative min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => fileInputRef.current?.click()} title="Attach Image">
                <Icon icon="attach_file" size="md" />
                {selectedImage && <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--neon-primary)] rounded-full shadow-[0_0_6px_var(--neon-primary)]" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                className="flex-grow bg-transparent border-none focus:ring-0 font-body-md text-on-surface placeholder:text-secondary px-2 min-h-[44px]"
                placeholder="Type your symptoms or questions..."
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              />
              <div className="flex items-center gap-1">
                <button className="p-3 text-secondary hover:text-[var(--neon-primary)] transition-colors hover:bg-[var(--neon-primary)]/10 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Icon icon="mic" size="md" />
                </button>
                <button className="bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-accent)] text-white p-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--neon-primary)]/30 flex items-center justify-center min-h-[44px] min-w-[44px] hover:shadow-[0_0_20px_var(--neon-primary)]/50" onClick={() => handleSend()}>
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
=======
  return <TriageChat />
>>>>>>> 1043c60 (fixed UI, made AI API multiple)
}
