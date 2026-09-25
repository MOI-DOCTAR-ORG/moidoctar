import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import type { TriageChatResponse, TriageResponse, CacheStats, CacheClearResponse } from '../types/triage'

// ---------- Local Storage Keys ----------
const USER_KEY = 'doctarr_local_user'
const MEDS_KEY = 'doctarr_local_medications'
const SESSIONS_KEY = 'doctarr_sessions'
const SYMPTOMS_KEY = 'doctarr_local_symptoms'
const CACHE_STATS_KEY = 'doctarr_local_cache_stats'

// ---------- Initial Mock Data ----------
const initialUser = {
  _id: 'usr_demo_101',
  userName: 'Alex Morgan',
  email: 'alex.morgan@moidoctar.com',
  isVerified: true,
  role: 'user' as const,
  demographics: {
    gender: 'Female',
    age: '29',
    currentCondition: 'None',
    bloodType: 'O+',
    country: 'United States',
  },
  phone: '+1 (555) 234-5678',
  preference: {
    emailNotification: true,
    smsAlert: false,
    twoFactorAuth: false,
  },
  notifications: [
    { message: 'Welcome to MoiDoctar Health Triage!', date: new Date().toISOString() },
    { message: 'Your health profile is ready for triage.', date: new Date(Date.now() - 86400000).toISOString() },
  ],
  createdAt: '2026-01-15T09:30:00.000Z',
  lastLogin: new Date().toISOString(),
}

const initialMedications = [
  {
    id: 'med-1',
    name: 'Lisinopril',
    dosage: '10mg',
    time: '8:00 AM',
    frequent: 'morning' as const,
    supply: '30',
    status: true,
    startedAt: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'med-2',
    name: 'Metformin',
    dosage: '500mg',
    time: '8:00 PM',
    frequent: 'night' as const,
    supply: '60',
    status: true,
    startedAt: '2026-02-15T20:00:00.000Z',
  },
  {
    id: 'med-3',
    name: 'Vitamin D3',
    dosage: '2000 IU',
    time: '9:00 AM',
    frequent: 'morning' as const,
    supply: '90',
    status: true,
    startedAt: '2026-01-10T09:00:00.000Z',
  },
]

// ---------- Storage Helpers ----------
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    // Ignore storage quota errors
  }
}

export function getLocalUser() {
  return getStored(USER_KEY, initialUser)
}

export function saveLocalUser(user: typeof initialUser) {
  setStored(USER_KEY, user)
}

export function getLocalMedications() {
  return getStored(MEDS_KEY, initialMedications)
}

export function saveLocalMedications(meds: typeof initialMedications) {
  setStored(MEDS_KEY, meds)
}

// ---------- Simulated AI Triage Engine ----------
export function generateTriageAssessment(symptoms: string): TriageChatResponse {
  const lower = symptoms.toLowerCase()

  const emergencyKeywords = [
    'chest pain', 'heart attack', 'shortness of breath', "can't breathe", 'cannot breathe',
    'stroke', 'unconscious', 'seizure', 'severe bleeding', 'paralysis', 'anaphylaxis', 'blue lips'
  ]

  const moderateKeywords = [
    'fever', 'headache', 'migraine', 'vomiting', 'nausea', 'diarrhea', 'infection',
    'abdominal', 'stomach', 'rash', 'pain', 'swelling', 'dizzy', 'dizziness', 'cough'
  ]

  const isEmergency = emergencyKeywords.some(kw => lower.includes(kw))
  const isModerate = !isEmergency && moderateKeywords.some(kw => lower.includes(kw))

  if (isEmergency) {
    return {
      assessment_id: 'tri_' + Date.now().toString(36),
      needs_more_info: false,
      urgency_level: 'Urgent',
      confidence_score: 0.95,
      rationale: 'Your reported symptoms present potential signs of acute cardiorespiratory or neurological urgency requiring immediate clinical assessment.',
      possible_conditions: [
        'Acute Coronary / Cardiopulmonary Syndrome',
        'Severe Respiratory Distress',
        'Acute Neurological Event',
        'Acute Systemic Reaction'
      ],
      care_plan: {
        immediate_relief: [
          'Sit or lie down somewhere comfortable and stay calm',
          'Loosen tight clothing while you wait for help',
        ],
        food_and_water: [
          "Don't eat or drink anything until you've been seen",
        ],
        when_to_hospital: [
          'Go now — call emergency services or get to the nearest emergency department',
          "Don't drive yourself; have someone else take you or call an ambulance",
        ],
      },
      recommended_actions: [
        'Call emergency medical services (911 / 112) or go to the nearest emergency department immediately',
        'Do not drive yourself to the emergency facility',
        'Rest in an upright or comfortable position while waiting for help',
        'Keep someone informed of your situation'
      ],
      follow_up_questions: [
        'Does the pain radiate to your left arm, neck, jaw, or upper back?',
        'Are you experiencing sweating, severe nausea, or lightheadedness?',
        'Do you have a personal or family history of cardiovascular disease?'
      ],
      red_flags_to_watch: [
        'Sudden worsening of chest discomfort or inability to catch your breath',
        'Loss of consciousness, syncope, or sudden extreme confusion',
        'Cyanosis (bluish tint around lips or fingernails)'
      ],
      disclaimer: 'MoiDoctar provides triage guidance, not a medical diagnosis. In a life-threatening emergency, call 911 or emergency services immediately.'
    }
  }

  if (isModerate) {
    return {
      assessment_id: 'tri_' + Date.now().toString(36),
      needs_more_info: true,
      urgency_level: 'Moderate',
      confidence_score: 0.87,
      rationale: 'Your reported symptoms indicate an active symptomatic condition that would benefit from clinical evaluation within 24 to 48 hours.',
      possible_conditions: [
        'Acute Viral / Bacterial Infection',
        'Tension Headache or Migraine Syndrome',
        'Gastroenteritis / Acute GI Irritation',
        'Musculoskeletal Strain / Inflammation'
      ],
      care_plan: {
        immediate_relief: [
          'Rest and avoid strenuous activity',
          'Paracetamol at the pack dose can help with pain or fever',
        ],
        food_and_water: [
          'Sip water or an oral rehydration drink often, small amounts if nauseous',
          'Eat light, easy food if you have an appetite',
        ],
        when_to_hospital: [
          "Go if a high fever doesn't ease after 2 days on medication",
          "Go if you can't keep fluids down for several hours",
        ],
      },
      recommended_actions: [
        'Schedule a consultation with a primary healthcare provider or visit an urgent care center',
        'Maintain oral hydration with water and electrolyte-balanced fluids',
        'Rest and record your temperature and symptom progression twice daily',
        'Avoid strenuous physical exertion until evaluated'
      ],
      follow_up_questions: [
        'How many days have you been experiencing these symptoms?',
        'Have you taken any over-the-counter antipyretics or analgesics?',
        'Are the symptoms getting progressively worse or staying relatively stable?'
      ],
      red_flags_to_watch: [
        'Temperature exceeding 103°F (39.4°C) unresponsive to medication',
        'Inability to tolerate liquids for more than 24 hours',
        'Severe stiff neck accompanied by light sensitivity'
      ],
      disclaimer: 'MoiDoctar provides triage guidance, not a medical diagnosis. If symptoms rapidly deteriorate, seek urgent medical care.'
    }
  }

  return {
    assessment_id: 'tri_' + Date.now().toString(36),
    needs_more_info: false,
    urgency_level: 'Stable',
    confidence_score: 0.91,
    rationale: 'Your reported symptoms currently reflect mild, non-emergent discomfort. Supportive home care and continued observation are recommended.',
    possible_conditions: [
      'Mild Upper Respiratory Symptoms',
      'Localized Muscular Fatigue',
      'Mild Allergic Rhinitis',
      'Benign Stress / Fatigue Reaction'
    ],
    care_plan: {
      immediate_relief: [
        'Rest and give your body time to recover',
        'A warm compress or a simple pain reliever can help if needed',
      ],
      food_and_water: [
        'Keep drinking water through the day',
        "Eat normally as you're able to",
      ],
      when_to_hospital: [
        'Go if symptoms get worse or last more than a week',
        'Go if you develop a high fever, severe pain, or trouble breathing',
      ],
    },
    recommended_actions: [
      'Practice supportive self-care: adequate rest, warm fluids, and balanced nutrition',
      'Log any changes in symptoms over the next 48 to 72 hours',
      'Consult your primary care physician if symptoms persist beyond one week'
    ],
    follow_up_questions: [
      'Are you experiencing any other mild symptoms such as fatigue or nasal congestion?',
      'Have you recently been exposed to seasonal allergens or someone who was unwell?'
    ],
    red_flags_to_watch: [
      'Onset of high fever, chills, or difficulty breathing',
      'Sudden development of sharp, localized pain'
    ],
    disclaimer: 'MoiDoctar provides triage guidance, not a medical diagnosis. Consult a licensed physician for clinical decisions.'
  }
}

// ---------- Request Dispatcher ----------
export async function handleLocalRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const url = (config.url || '').replace(/^\/api\/v1/, '').split('?')[0]
  const method = (config.method || 'get').toLowerCase()

  let body: any = config.data
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { /* text or form */ }
  }

  // Small delay to simulate realistic local asynchronous operations
  await new Promise(resolve => setTimeout(resolve, 80))

  const currentUser = getLocalUser()
  const currentMeds = getLocalMedications()

  // 1. Auth: Manual Signin / Signup
  if (url === '/auth/manualAuthentication' && method === 'post') {
    const isSignup = body?.type === 'SIGNUP_MANUALLY'
    const email = (body?.email || currentUser.email).toLowerCase().trim()
    const name = body?.fullName || currentUser.userName

    const updatedUser = {
      ...currentUser,
      email,
      userName: name,
      lastLogin: new Date().toISOString(),
    }
    saveLocalUser(updatedUser)

    const token = 'local_jwt_' + Date.now()
    localStorage.setItem('token', token)
    localStorage.setItem('doctarr_refresh_token', 'local_refresh_' + Date.now())
    localStorage.setItem('doctarr_current_user_email', email)
    localStorage.setItem('doctarr_name', name)

    return {
      data: {
        msg: isSignup ? 'Account created successfully' : 'Signed in successfully',
        authorization: token,
        refreshToken: 'local_refresh_' + Date.now(),
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 2. Auth: Google Sign-in
  if (url === '/auth/google' && method === 'post') {
    const token = 'local_jwt_google_' + Date.now()
    localStorage.setItem('token', token)
    localStorage.setItem('doctarr_refresh_token', 'local_refresh_' + Date.now())

    return {
      data: {
        msg: 'Google authentication successful',
        authorization: token,
        refreshToken: 'local_refresh_' + Date.now(),
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 3. Auth: Verify Email
  if (url === '/auth/verify' && method === 'post') {
    const token = 'local_jwt_' + Date.now()
    localStorage.setItem('token', token)
    const updatedUser = { ...currentUser, isVerified: true }
    saveLocalUser(updatedUser)

    return {
      data: {
        msg: 'Email verified successfully',
        authorization: token,
        refreshToken: 'local_refresh_' + Date.now(),
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 4. Auth: Resend Verification
  if (url === '/auth/resendVerification' && method === 'post') {
    return {
      data: { msg: 'Verification code resent successfully' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 5. Auth: Logout
  if (url === '/auth/logout' && method === 'post') {
    localStorage.removeItem('token')
    localStorage.removeItem('doctarr_refresh_token')
    return {
      data: { msg: 'Logged out successfully' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 6. Auth: Password Reset Request
  if (url === '/auth/requestPasswordReset' && method === 'post') {
    return {
      data: { msg: 'Password reset instructions sent' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 7. User: Forgot / Reset Password
  if (url === '/user/forgotPassword' && method === 'post') {
    return {
      data: { msg: 'Password updated successfully' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 8. User: Get Profile
  if (url === '/user/listData' && method === 'get') {
    return {
      data: { msg: 'User profile retrieved', data: currentUser },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 9. User: Update Profile
  if (url === '/user/updateProfile' && method === 'put') {
    const updated = {
      ...currentUser,
      ...body,
      userName: body?.userName || currentUser.userName,
      phone: body?.phone || currentUser.phone,
      demographics: {
        ...currentUser.demographics,
        ...(body?.demographics || {}),
      },
    }
    saveLocalUser(updated)
    return {
      data: { msg: 'Profile updated successfully', data: updated },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 10. User: Notifications
  if (url === '/user/notifications' && method === 'get') {
    return {
      data: { msg: 'Notifications retrieved', data: currentUser.notifications || [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 11. User: Delete Account
  if (url === '/user' && method === 'delete') {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('token')
    return {
      data: { msg: 'User account deleted successfully' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 12. Medications: Get List
  if (url === '/medication' && method === 'get') {
    return {
      data: { msg: 'Medications retrieved', data: currentMeds },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 13. Medications: Create
  if (url === '/medication/create' && method === 'post') {
    const newMed = {
      id: 'med-' + Date.now(),
      name: body?.name || 'Medication',
      dosage: body?.dosage || '1 dose',
      time: body?.time || '08:00 AM',
      frequent: body?.frequent || 'morning',
      supply: body?.supply || '30',
      status: true,
      startedAt: new Date().toISOString(),
    }
    const updated = [newMed, ...currentMeds]
    saveLocalMedications(updated)
    return {
      data: { msg: 'Medication added successfully', data: updated },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 14. Medications: Stop
  if (url === '/medication/stop' && method === 'put') {
    const targetId = body?.id
    const updated = currentMeds.map(m =>
      m.id === targetId ? { ...m, status: false, stoppedAt: new Date().toISOString() } : m
    )
    saveLocalMedications(updated)
    return {
      data: { msg: 'Medication status updated', data: updated },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 15. Triage: History / List
  if ((url === '/triage/list' || url === '/triage/history') && method === 'get') {
    const sessions = getStored<any[]>(SESSIONS_KEY, [])
    const backendTriage = sessions.map(s => ({
      _id: s.id || 'sess-' + Date.now(),
      symptoms: [s.condition || 'General symptoms'],
      duration: 'Recent',
      severity: s.severity === 'Urgent' ? 'Severe' : s.severity === 'Moderate' ? 'Moderate' : 'Mild',
      notes: s.description || '',
      triageStatus: {
        level: s.severity === 'Urgent' ? 'Emergency' : s.severity === 'Moderate' ? 'Urgent' : 'Non-Urgent',
      },
      actionPlan: s.description || 'Monitor symptoms and follow up as needed.',
      createdAt: s.date ? new Date(s.date).toISOString() : new Date().toISOString(),
    }))
    return {
      data: { msg: 'Triage history retrieved', data: backendTriage },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 16. Symptoms: List & Log
  if (url === '/symptom/list' && method === 'get') {
    const symptoms = getStored<any[]>(SYMPTOMS_KEY, [])
    return {
      data: { msg: 'Symptoms retrieved', data: symptoms },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  if (url === '/symptom' && method === 'post') {
    const symptoms = getStored<any[]>(SYMPTOMS_KEY, [])
    const newEntry = { id: 'sym-' + Date.now(), ...(body || {}), loggedAt: new Date().toISOString() }
    const updated = [newEntry, ...symptoms]
    setStored(SYMPTOMS_KEY, updated)
    return {
      data: { msg: 'Symptom recorded', data: newEntry },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 17. ML Model Triage: /triage/chat
  if (url === '/triage/chat' && method === 'post') {
    let symptomsText = ''
    if (config.data instanceof FormData) {
      symptomsText = (config.data.get('symptoms') as string) || ''
    } else if (body?.symptoms) {
      symptomsText = body.symptoms
    }
    const assessment: TriageChatResponse = {
      ...generateTriageAssessment(symptomsText),
      ai_source: 'offline',
      ai_notice: 'The server is not reachable, so this is an offline safety check, not the AI.',
    }
    assessment.reply = assessment.urgency_level === 'Urgent'
      ? 'What you describe could be serious. Please call your local emergency number or get to the nearest emergency department now.'
      : assessment.rationale
    return {
      data: assessment,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 18. ML Model Triage: /triage
  if (url === '/triage' && method === 'post') {
    let symptomsText = ''
    if (config.data instanceof FormData) {
      symptomsText = (config.data.get('symptoms') as string) || ''
    } else if (body?.symptoms) {
      symptomsText = body.symptoms
    }
    const assessment = generateTriageAssessment(symptomsText)
    const response: TriageResponse = {
      assessment_id: assessment.assessment_id,
      urgency_level: assessment.urgency_level,
      rationale: assessment.rationale,
      possible_conditions: assessment.possible_conditions,
      recommended_actions: assessment.recommended_actions,
      disclaimer: assessment.disclaimer,
    }
    return {
      data: response,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 19. ML Model Cache: /cache/stats
  if (url === '/cache/stats' && method === 'get') {
    const stats: CacheStats = getStored(CACHE_STATS_KEY, {
      hits: 42,
      misses: 5,
      hit_rate: 0.89,
      size: 14,
    })
    return {
      data: stats,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 20. ML Model Cache: /cache/clear
  if (url === '/cache/clear' && method === 'post') {
    const cleared: CacheStats = { hits: 0, misses: 0, hit_rate: 0, size: 0 }
    setStored(CACHE_STATS_KEY, cleared)
    const res: CacheClearResponse = { status: 'success' }
    return {
      data: res,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // 21. Admin Routes
  if (url === '/admin/users') {
    return {
      data: { msg: 'Users retrieved', data: [currentUser] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  if (url?.startsWith('/admin/user')) {
    return {
      data: { msg: 'Success', data: currentUser },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  // AI settings need the real server: never pretend they saved.
  if (url?.startsWith('/ai/')) {
    throw { response: { status: 503, data: { detail: { msg: 'The server is not reachable right now.' } } }, config }
  }

  // Fallback 200 for any other API route
  return {
    data: { msg: 'Operation succeeded', data: null },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
}
