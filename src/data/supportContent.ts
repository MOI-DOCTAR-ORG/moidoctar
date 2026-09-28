// Knowledge base for the Support page: the guide articles, the FAQ, and the
// metadata the search bar and the support chatbot both read from.
//
// Everything here is static on purpose — support content should stay readable
// (and searchable) even when the API is unreachable. Adding a guide is a matter
// of appending one object to SUPPORT_ARTICLES; no other file needs to change.

export type ArticleSection = {
  heading?: string
  paragraphs?: string[]
  /** Rendered as a numbered list — use for anything the reader has to do in order. */
  steps?: string[]
  /** Small call-out rendered in a tinted box (warning, tip, safety note). */
  note?: string
  noteTone?: 'info' | 'warning' | 'error'
}

export type SupportArticle = {
  id: string
  title: string
  summary: string
  category: string
  icon: string
  /** ISO date the guide was first published — shown on the card and in the reader. */
  publishedAt: string
  /** ISO date of the last meaningful edit, when it differs from publishedAt. */
  updatedAt?: string
  readMinutes: number
  tags: string[]
  sections: ArticleSection[]
}

export type FaqItem = {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

export const SUPPORT_CATEGORIES = [
  'Getting started',
  'Triage',
  'Tracking',
  'Reminders',
  'Care & safety',
  'Account & privacy',
] as const

/** Where manual requests are emailed. Swap for the live inbox via VITE_SUPPORT_EMAIL. */
export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL || 'support@moidoctar.com').trim()

/** The response time we promise on the "Talk to a person" card. Phrase it to fit
 *  into "within {SUPPORT_RESPONSE_TIME}". */
export const SUPPORT_RESPONSE_TIME = '1 working day'

export const SUPPORT_ARTICLES: SupportArticle[] = [
  {
    id: 'first-triage',
    title: 'Run your first triage with Liana',
    summary:
      'Tell Liana what you feel in your own words and get an urgency level, likely causes and a care plan in a few minutes.',
    category: 'Getting started',
    icon: 'medical_services',
    publishedAt: '2026-06-12',
    updatedAt: '2026-09-04',
    readMinutes: 4,
    tags: ['triage', 'liana', 'chat', 'symptoms', 'assessment', 'start', 'first'],
    sections: [
      {
        heading: 'What triage does',
        paragraphs: [
          'Triage is a conversation, not a form. You describe what you feel and Liana asks follow-up questions one at a time until she has enough to give you three things: how urgent it is, what it could be, and what to do next.',
          'It is guidance for deciding your next step — never a diagnosis, and never a replacement for a clinician.',
        ],
      },
      {
        heading: 'Starting a triage',
        steps: [
          'Open New Triage from the sidebar (or the Triage tab on phones).',
          'Pick who the triage is for: you, a child, or someone else. This changes the questions and the safe ranges Liana uses.',
          'Describe the problem and when it started — plain sentences work better than medical words. "Headache since yesterday, worse in the evening" is perfect.',
          'Answer each follow-up question by tapping an option or typing your own answer.',
          'When Liana has enough, she returns your assessment with an urgency level and a care plan.',
        ],
        note: 'Add a photo when it helps — a rash, a label on a medicine box, or a thermometer reading can be attached straight from the composer.',
        noteTone: 'info',
      },
      {
        heading: 'Getting a useful answer',
        paragraphs: [
          'The three things that change the quality of the answer most: when it started, how bad it is right now, and whether anything makes it better or worse.',
          'If you only know one of those, say so — "I do not know how long, maybe two days" is still useful.',
        ],
      },
      {
        heading: 'Before you close the tab',
        paragraphs: [
          'Every completed assessment is saved to History automatically, so you can show it to a clinician later instead of trying to remember it.',
        ],
        note: 'If the result says EMERGENCY, do not wait for the app. Call your local emergency number now.',
        noteTone: 'error',
      },
    ],
  },
  {
    id: 'body-map',
    title: 'Mark exactly where it hurts on the body map',
    summary:
      'Tap the front, back or side of the body to pin an area, grade its severity, and hand those marks to Liana as context.',
    category: 'Triage',
    icon: 'pin_drop',
    publishedAt: '2026-06-20',
    readMinutes: 3,
    tags: ['body', 'map', 'pain', 'pinpoint', 'location', 'where it hurts', 'severity'],
    sections: [
      {
        heading: 'Opening the body map',
        steps: [
          'Go to Body Map from the sidebar, or start a triage and tap "Mark where it hurts".',
          'Switch between front, back and side with the tabs above the figure.',
          'Tap the area that hurts. It is added to your Marked areas list.',
          'Give each marked area a severity: mild, moderate or severe.',
          'Remove any mark you added by mistake with the × on its row.',
        ],
      },
      {
        heading: 'Why it helps',
        paragraphs: [
          'Words struggle with position — "it hurts on the right" means different things depending on which way you are facing. A marked area removes that ambiguity, and the marks travel with your triage so the assessment already knows where to look.',
          'You can mark more than one area. Multiple marks are useful when the pain started in one place and spread.',
        ],
      },
      {
        heading: 'Pinpoint pain',
        paragraphs: [
          'When the pain is small and sharp rather than broad, use Pinpoint Pain to drop a precise dot instead of an area. It is the same data, just a finer point.',
        ],
        note: 'Marking areas is optional. If you would rather just describe it, type it — Liana can work with either.',
        noteTone: 'info',
      },
    ],
  },
  {
    id: 'read-care-plan',
    title: 'Read your urgency level and care plan',
    summary:
      'What Emergency, Urgent and Stable actually mean, and how to use the three-part care plan that comes with every result.',
    category: 'Triage',
    icon: 'health_and_safety',
    publishedAt: '2026-07-02',
    updatedAt: '2026-08-30',
    readMinutes: 4,
    tags: ['urgency', 'emergency', 'urgent', 'stable', 'care plan', 'result', 'severity', 'red flags'],
    sections: [
      {
        heading: 'The three levels',
        paragraphs: [
          'Emergency — do not wait. Call your local emergency number or go to the nearest emergency department now.',
          'Urgent — be seen today or tomorrow. Get medical care promptly and do not sit on it over the weekend.',
          'Stable — safe to monitor at home for now, with clear instructions on what would change that.',
        ],
        note: 'The colours never change: red is always emergency, amber is always urgent, green is always stable — in every theme, on every screen.',
        noteTone: 'info',
      },
      {
        heading: 'The care plan',
        paragraphs: ['Every assessment comes back in the same three parts, so you always know where to look:'],
        steps: [
          'Immediate relief — what you can safely do in the next hour to feel better.',
          'Food & water — what helps recovery and what to avoid.',
          'When to go to hospital — the specific signs that mean the plan has changed and you need care now.',
        ],
      },
      {
        heading: 'Red flags are the part that matters',
        paragraphs: [
          'The care plan is written so the last section is the one to read twice. If any line in "When to go to hospital" happens, the assessment no longer applies — go.',
          'You can answer follow-up questions after a result to refine it. Tap a question, type the answer, and Liana updates her guidance.',
        ],
      },
      {
        heading: 'Save it',
        paragraphs: [
          'Tap "Save and view care options" to store the assessment in History and jump straight to your care options, including nearby facilities if you want them.',
        ],
      },
    ],
  },
  {
    id: 'symptom-tracker',
    title: 'Track symptoms day by day',
    summary:
      'Log each symptom with a severity, watch the 30-day trend, and spot patterns you would otherwise miss.',
    category: 'Tracking',
    icon: 'monitor_heart',
    publishedAt: '2026-07-15',
    readMinutes: 3,
    tags: ['symptom', 'tracker', 'log', 'trend', 'history', 'pattern', 'severity'],
    sections: [
      {
        heading: 'Adding an entry',
        steps: [
          'Open Symptom Tracker from the sidebar.',
          'Under New Log Entry, name the symptom (for example "Migraine" or "Fatigue").',
          'Set how bad it is right now and add any note — triggers, medicine taken, what you were doing.',
          'Save. The entry appears in Past Entries straight away.',
        ],
      },
      {
        heading: 'Reading the 30-day trend',
        paragraphs: [
          'The trend chart shows severity over the last 30 days. A line that is drifting up is worth taking to a clinician even when no single day looks bad on its own.',
          'Trends are also the fastest way to answer the question every clinician asks: "How often has this been happening?"',
        ],
      },
      {
        heading: 'Making it a habit',
        paragraphs: [
          'Log at roughly the same time each day — evening entries after a full day are usually the most comparable. One line a day is enough; the value is in the series, not the detail.',
        ],
        note: 'If you have marked areas on the body map, log the same symptom name so the map and the trend line up.',
        noteTone: 'info',
      },
    ],
  },
  {
    id: 'medication-reminders',
    title: 'Set medication reminders that actually remind you',
    summary:
      'Add a medicine with its dosage and time, get an in-app reminder, and stop a course when it finishes.',
    category: 'Reminders',
    icon: 'medication',
    publishedAt: '2026-07-28',
    updatedAt: '2026-09-08',
    readMinutes: 3,
    tags: ['medication', 'medicine', 'reminder', 'pill', 'dosage', 'drug', 'adherence'],
    sections: [
      {
        heading: 'Adding a medicine',
        steps: [
          'Open Medications from the sidebar.',
          'Type the name exactly as it appears on the label or prescription.',
          'Add the dosage (for example 10mg) and how often you take it.',
          'Set the time you want the reminder, then save.',
        ],
      },
      {
        heading: 'What happens next',
        paragraphs: [
          'Each saved medicine shows on the tracker with its status, and a reminder notification is created in Notifications when the time comes.',
          'Stopping a medicine archives it rather than deleting it, so the record of what you took stays in your history.',
        ],
        note: 'MoiDoctar reminds you — it does not advise on doses. Follow the prescription, or your clinician, and never change a dose because an app told you to.',
        noteTone: 'warning',
      },
      {
        heading: 'If a reminder does not appear',
        paragraphs: [
          'Check that notifications are allowed for the app in your browser or phone settings — a blocked permission is the usual cause. Then open Notifications to confirm the reminder was created.',
        ],
      },
    ],
  },
  {
    id: 'nearby-care',
    title: 'Find hospitals, clinics and pharmacies near you',
    summary:
      'Use your location to pull real nearby facilities from OpenStreetMap, with distance, address and phone number.',
    category: 'Care & safety',
    icon: 'location_on',
    publishedAt: '2026-08-05',
    readMinutes: 3,
    tags: ['nearby', 'hospital', 'clinic', 'pharmacy', 'map', 'location', 'find care', 'emergency'],
    sections: [
      {
        heading: 'Searching',
        steps: [
          'Open Nearby Care from the sidebar.',
          'Allow location when the browser asks — your coordinates are used for this search and are not stored.',
          'Facilities are listed nearest first with distance, type, address and a phone number when the listing has one.',
          'Tap a phone number to call directly.',
        ],
      },
      {
        heading: 'When location is denied',
        paragraphs: [
          'You can still pick an area manually from the list. If no live results come back at all, the page switches to clearly-labelled sample data so you can see how the list works — look for the Sample Data marker before trusting an entry.',
        ],
        note: 'Results depend on OpenStreetMap coverage, which varies by area. A facility missing from the list is not proof that it does not exist.',
        noteTone: 'info',
      },
      {
        heading: 'Care Details is the other half',
        paragraphs: [
          'Care Details holds what you would otherwise repeat at every visit: allergies, conditions, past medicines, emergency contact and the facility you usually go to. Save it once, then use it when you are deciding where to go.',
        ],
      },
    ],
  },
  {
    id: 'history',
    title: 'Review past triages and medical history',
    summary:
      'Two tabs in one place: every triage session you have run, and the medical history a clinician will ask for.',
    category: 'Tracking',
    icon: 'history',
    publishedAt: '2026-08-14',
    readMinutes: 3,
    tags: ['history', 'sessions', 'past', 'records', 'medical history', 'export', 'previous'],
    sections: [
      {
        heading: 'Triage Sessions tab',
        paragraphs: [
          'Every completed assessment lands here automatically with its date, urgency level, possible conditions and the plan you were given. Tap one to open the full detail, including red flags and recommended actions.',
          'Filters let you narrow to urgent, moderate or stable so a follow-up visit can start with what mattered.',
        ],
      },
      {
        heading: 'Medical History tab',
        paragraphs: [
          'This is the long-lived record: conditions, allergies, past and current medicines, past surgeries, and your emergency contact. It is what you would read out at a clinic reception desk.',
        ],
        steps: [
          'Open History and switch to the Medical History tab.',
          'Add a condition or allergy by typing it and pressing Enter.',
          'Edit medicine rows inline — name, dosage and frequency.',
          'Fill in your emergency contact so it is on hand when you need it.',
        ],
      },
      {
        heading: 'Privacy note',
        paragraphs: [
          'History belongs to your account. On a shared device, sign out when you are finished — the app also clears the visible state when you switch accounts.',
        ],
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Control your data, profile and assistant memory',
    summary:
      'See what the assistant remembers, change your profile, and know exactly what happens to your health data.',
    category: 'Account & privacy',
    icon: 'shield_lock',
    publishedAt: '2026-08-26',
    updatedAt: '2026-09-15',
    readMinutes: 4,
    tags: ['privacy', 'data', 'profile', 'memory', 'delete', 'security', 'assistant settings', 'gdpr'],
    sections: [
      {
        heading: 'What is stored',
        paragraphs: [
          'Your account details, the triages you run, symptom logs, medicines and your medical history. Each is shown back to you in the app — there is no hidden profile.',
          'Assessments are generated from what you type in that session plus the long-term context you have chosen to keep.',
        ],
      },
      {
        heading: 'Reviewing assistant memory',
        steps: [
          'Open Assistant Settings from the sidebar.',
          'Read the list of long-term conditions and preferences the assistant is allowed to use.',
          'Remove anything you do not want carried into future conversations.',
          'Adjust reply length, tone, language and units while you are there.',
        ],
        note: 'Assistant Settings is also where the emergency number used in escalation messages lives — set it to the number that actually works where you are.',
        noteTone: 'warning',
      },
      {
        heading: 'Profile and sign-in',
        paragraphs: [
          'Profile holds your personal details, notification preferences and the option to replay the welcome tour. Password changes and sign-out live there too.',
          'Health information deserves more care than a shared laptop gets: use a strong password, sign out on shared devices, and do not save screenshots of assessments you would not want seen.',
        ],
      },
      {
        heading: 'Deleting your data',
        paragraphs: [
          'To have your account and its records removed, send a manual request from this page with the category "Account & privacy" and the word delete in the subject. A person handles those, not an automated process.',
        ],
      },
    ],
  },
  {
    id: 'offline-emergency',
    title: 'Using MoiDoctar offline and in an emergency',
    summary:
      'What still works without a connection, why you may see an offline safety check, and what to do in a real emergency.',
    category: 'Care & safety',
    icon: 'emergency',
    publishedAt: '2026-09-10',
    readMinutes: 3,
    tags: ['offline', 'emergency', 'no internet', 'error', 'safety', 'fallback', 'disconnect'],
    sections: [
      {
        heading: 'When the connection drops',
        paragraphs: [
          'A banner tells you the app is offline. History, logs and reminders you have already saved stay readable because they are cached on the device.',
          'A live assessment needs the server. If it cannot be reached, you get an offline safety check instead — a basic, deliberately cautious set of rules rather than an AI assessment.',
        ],
        note: 'An offline result is a safety net, not an assessment. When the connection returns, run the triage again for real guidance.',
        noteTone: 'warning',
      },
      {
        heading: 'In an emergency',
        steps: [
          'Call your local emergency number first — the app lists it on escalation screens.',
          'Do not wait for a triage result, a message to send, or a page to load.',
          'If you can, note the time symptoms started; clinicians will ask.',
        ],
        note: 'MoiDoctar is a navigation tool. It helps you decide where to go — it cannot treat you, and it never replaces emergency services.',
        noteTone: 'error',
      },
      {
        heading: 'Manual requests while offline',
        paragraphs: [
          'If you send a manual request without a connection, it is kept safely on your device with its ticket number and sent automatically the next time you open this page.',
        ],
      },
    ],
  },
  {
    id: 'theme-navigation',
    title: 'Change theme, and find your way around',
    summary:
      'Light, dark or auto, a colour of your own, and where every feature lives on desktop and on phones.',
    category: 'Getting started',
    icon: 'palette',
    publishedAt: '2026-09-18',
    readMinutes: 3,
    tags: ['theme', 'dark mode', 'light', 'colour', 'navigation', 'sidebar', 'menu', 'accessibility'],
    sections: [
      {
        heading: 'Choosing a look',
        steps: [
          'Open Theme from the sidebar, or tap the sun/moon button in the top bar.',
          'Pick light, dark or auto — auto follows your phone or system setting.',
          'Pick a colour for buttons, links and highlights.',
          'Reset to default whenever you want a clean slate.',
        ],
        note: 'Emergency, urgent and stable colours never change with the theme, so a warning always looks like a warning.',
        noteTone: 'info',
      },
      {
        heading: 'On a phone',
        paragraphs: [
          'The sidebar collapses behind the menu button in the top-left, and the main destinations sit in the bar at the bottom of the screen: Home, Triage, Care, History and Profile. Everything else is one tap away through the menu.',
        ],
      },
      {
        heading: 'Keyboard and screen readers',
        paragraphs: [
          'Every control is reachable by keyboard, buttons carry accessible labels, and the chat log announces new messages. If something is not usable with your setup, send a manual request and describe it — that is exactly the kind of report a person needs to see.',
        ],
      },
    ],
  },
]

export const SUPPORT_FAQ: FaqItem[] = [
  {
    id: 'is-this-a-doctor',
    question: 'Is MoiDoctar a doctor? Does it diagnose me?',
    answer:
      'No. MoiDoctar is a triage and navigation tool: it uses what you describe to suggest how urgent a situation is and what to do next. It does not diagnose, prescribe, or replace a clinician. Any symptom that worries you should be seen by a qualified professional.',
    category: 'Triage',
    tags: ['doctor', 'diagnosis', 'medical advice', 'legal', 'real doctor'],
  },
  {
    id: 'how-accurate',
    question: 'How accurate is the triage?',
    answer:
      'It is built to be safe rather than clever: it escalates when it is unsure, and it repeats the red flags you should watch for. Accuracy depends on what you tell it — when it started, how bad it is, and what changes it. When the AI cannot be reached you get a deliberately cautious offline safety check instead, clearly marked as such.',
    category: 'Triage',
    tags: ['accuracy', 'correct', 'trust', 'reliable', 'wrong answer'],
  },
  {
    id: 'my-data-private',
    question: 'Is my health data private?',
    answer:
      'Your triages, logs, medicines and history belong to your account and are shown back to you in the app. Nothing is shared with other users. You can review what the assistant is allowed to remember in Assistant Settings, and ask for deletion through a manual request on this page.',
    category: 'Account & privacy',
    tags: ['privacy', 'data', 'secure', 'gdpr', 'who sees my data'],
  },
  {
    id: 'does-it-cost',
    question: 'Does MoiDoctar cost anything?',
    answer:
      'The app is free to use — triage, history, symptom tracking, medication reminders and nearby care all work without a payment method. If paid features are ever introduced they will be optional and clearly marked before any charge.',
    category: 'Getting started',
    tags: ['price', 'cost', 'free', 'pay', 'subscription', 'money'],
  },
  {
    id: 'need-internet',
    question: 'Do I need an internet connection?',
    answer:
      'For a live assessment, yes — the model runs on the server. Saved history, logs and reminders remain readable offline, and you get an offline safety check rather than nothing. Manual requests are queued on your device and sent when the connection returns.',
    category: 'Care & safety',
    tags: ['offline', 'internet', 'connection', 'data', 'without wifi'],
  },
  {
    id: 'start-over',
    question: 'How do I start a new triage? Where did my old one go?',
    answer:
      'Tap New Triage in the sidebar (or New in the triage header on phones) to reset the conversation. Nothing is lost — every completed assessment is saved in the History tab, Triage Sessions, with its full result.',
    category: 'Getting started',
    tags: ['new triage', 'reset', 'old triage', 'start again', 'missing'],
  },
  {
    id: 'reminders-not-showing',
    question: 'My medication reminder did not show up. Why?',
    answer:
      'The usual cause is a blocked notification permission — check that your browser or phone allows notifications for the app. Then open Notifications to confirm the reminder was created. Reminders are in-app only; there is no SMS or push outside the app at the moment.',
    category: 'Reminders',
    tags: ['reminder', 'notification', 'not working', 'missing', 'push'],
  },
  {
    id: 'delete-account',
    question: 'How do I delete my account or my data?',
    answer:
      'Send a manual request from this page using the category Account & privacy and put "delete" in the subject. Deletion is handled by a person so that nothing is removed by accident, and you will get a reply at the email address you leave.',
    category: 'Account & privacy',
    tags: ['delete', 'remove', 'account', 'erase', 'close account'],
  },
  {
    id: 'reaching-a-human',
    question: 'How do I talk to a real person?',
    answer:
      'Scroll down to "Talk to a person" on this page and send a manual request — a human replies by email, normally within one working day. For anything emergency-related, call your local emergency number instead of waiting for a reply.',
    category: 'Getting started',
    tags: ['human', 'person', 'contact', 'support', 'talk to someone', 'agent'],
  },
  {
    id: 'wrong-urgency',
    question: 'The urgency level looks wrong. What should I do?',
    answer:
      'Trust your instinct over the app. If you feel worse than the result suggests, seek care anyway — you can answer the follow-up questions with more detail to refine it, or rate the assessment as not helpful so it can be reviewed. In doubt, get checked.',
    category: 'Triage',
    tags: ['wrong', 'incorrect', 'urgency', 'bad result', 'not helpful'],
  },
  {
    id: 'who-is-liana',
    question: 'Who or what is Liana?',
    answer:
      'Liana is the assistant you chat with during a triage. She asks one question at a time, follows the safety rules built into the app, and mirrors the language you write in — Nigerian English, Pidgin or standard English. She is software, not a clinician.',
    category: 'Getting started',
    tags: ['liana', 'assistant', 'ai', 'bot', 'chatbot'],
  },
  {
    id: 'shared-device',
    question: 'Can I use MoiDoctar on a shared phone?',
    answer:
      'Yes, but sign out when you finish. The app clears its visible state when one account signs out and another signs in, so records do not leak between accounts on the same device. Avoid saving screenshots of assessments you would not want seen.',
    category: 'Account & privacy',
    tags: ['shared', 'phone', 'family', 'logout', 'sign out', 'multiple users'],
  },
]

/** Case- and accent-insensitive haystack for a guide — used by the search bar and the chatbot. */
export function articleText(article: SupportArticle): string {
  return [
    article.title,
    article.summary,
    article.category,
    article.tags.join(' '),
    article.sections
      .map((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.steps ?? []), s.note].filter(Boolean).join(' '))
      .join(' '),
  ].join(' ')
}

export function faqText(item: FaqItem): string {
  return [item.question, item.answer, item.category, item.tags.join(' ')].join(' ')
}

/** "2026-06-12" -> "12 Jun 2026" (fixed 3-letter months, so "Sept" never appears) */
export function formatPublishedDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

// ---------- Search ----------
//
// One tokeniser shared by the search bar and the chatbot, so a question typed
// into either surface matches exactly the same articles and FAQ entries.

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'to', 'of', 'in', 'on', 'at', 'my', 'i', 'it', 'for', 'and',
  'or', 'how', 'do', 'does', 'did', 'can', 'could', 'what', 'when', 'where', 'with', 'this', 'that',
  'be', 'you', 'your', 'me', 'we', 'us', 'am', 'have', 'has', 'if', 'not', 'no', 'yes', 'from', 'about',
])

export function searchTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
}

/** How many query tokens appear in `haystack` (lowercased text). */
export function tokenHits(haystack: string, tokens: string[]): number {
  const text = haystack.toLowerCase()
  let hits = 0
  for (const token of tokens) if (text.includes(token)) hits += 1
  return hits
}

/** A multi-word query needs most of its words present, so results stay relevant. */
export function matchThreshold(tokenCount: number): number {
  if (tokenCount <= 1) return 1
  return Math.max(2, Math.ceil(tokenCount * 0.6))
}

/** Weighted fields, best signal first: a word in a title or question should
 *  outrank the same word buried in a paragraph, otherwise "medication reminder"
 *  matches whichever guide happens to mention the phrase in passing. */
export function articleFields(article: SupportArticle): Array<[string, number]> {
  return [
    [article.title, 4],
    [article.tags.join(' '), 3],
    [article.summary, 2],
    [article.category, 1],
    [articleText(article), 1],
  ]
}

export function faqFields(item: FaqItem): Array<[string, number]> {
  return [
    [item.question, 4],
    [item.tags.join(' '), 3],
    [item.category, 1],
    [item.answer, 1],
  ]
}

/** Sum of the weights of every query token found in any field. */
export function weightedScore(fields: Array<[string, number]>, tokens: string[]): number {
  let score = 0
  for (const [text, weight] of fields) {
    const haystack = text.toLowerCase()
    for (const token of tokens) {
      if (haystack.includes(token)) score += weight
    }
  }
  return score
}
