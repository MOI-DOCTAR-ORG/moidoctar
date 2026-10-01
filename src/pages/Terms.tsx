import { Link, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { APP_NAME } from '../lib/constants'

/**
 * Terms & Conditions.
 *
 * The body text below is the approved legal copy and should not be reworded
 * without sign-off. The service is named "Moi Doctar" throughout because that
 * is how the legal document names it — that spelling is deliberate and is not
 * the same string as the product's APP_NAME.
 *
 * Everything the service provider still has to supply lives in TERMS_META.
 * Any value left in "[Insert ...]" form renders as a highlighted placeholder
 * so it reads as a field still being settled rather than as broken text, and
 * a metadata row with no value is left out entirely instead of showing a gap.
 *
 * Two values are still outstanding: the governing-law jurisdiction and the
 * dispute-resolution venue. Both are decisions for the service provider and
 * its lawyer, not defaults worth guessing at.
 */
const TERMS_META = {
  lastUpdated: 'September 30, 2026',
  legalEntity: 'Moi Doctar Project Team',
  contactEmail: 'Moidoctar@gmail.com',
  supportChannel: '08121678176',
  supportContact: 'Moidoctar@gmail.com',
  governingLaw: '',
  disputeLocation: '',
}

/** Shown wherever a value in TERMS_META is still blank. */
const PENDING_LABEL = 'to be confirmed'

/** A blank value becomes a marker LegalText renders as PENDING_LABEL. */
const orPending = (value: string) => value || '[pending]'

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'callout'; tone: 'warning' | 'danger'; text: string }
  | { kind: 'contact'; rows: { label: string; value: string }[] }

type Section = { id: string; number: number; title: string; blocks: Block[] }

const sections: Section[] = [
  {
    id: 'agreement',
    number: 1,
    title: 'Agreement and Acceptance',
    blocks: [
      {
        kind: 'p',
        text: 'These Terms and Conditions govern access to and use of Moi Doctar, including its website, health-guidance features, triage flow, medication-tracking features, nearby-care directory, feedback forms, and beta-testing environment.',
      },
      {
        kind: 'p',
        text: 'By accessing or using Moi Doctar, you confirm that you have read and understood these Terms and agree to follow them. If you do not agree, do not use the service.',
      },
      {
        kind: 'p',
        text: 'If you use Moi Doctar on behalf of another person, such as a child or dependent, you confirm that you are authorized to do so and that you will use the service responsibly.',
      },
    ],
  },
  {
    id: 'what-it-is',
    number: 2,
    title: 'What Moi Doctar Is',
    blocks: [
      {
        kind: 'p',
        text: 'Moi Doctar is an AI-assisted health guidance and triage service. It helps users organize information about a health concern, answer structured safety questions, understand an informational urgency indicator, consider next steps, and locate nearby healthcare resources.',
      },
      {
        kind: 'p',
        text: 'Moi Doctar is not a hospital, clinic, pharmacy, emergency service, medical professional, or replacement for professional care.',
      },
    ],
  },
  {
    id: 'not-diagnosis',
    number: 3,
    title: 'Not Medical Diagnosis or Treatment',
    blocks: [
      { kind: 'p', text: 'Moi Doctar provides general informational guidance only. It does not:' },
      {
        kind: 'list',
        items: [
          'Diagnose diseases, injuries, or medical conditions.',
          'Confirm that a user has or does not have a condition.',
          'Prescribe medicines or treatments.',
          'Replace a doctor, nurse, pharmacist, emergency service, or other qualified professional.',
          'Guarantee that a recommendation is complete, accurate, or appropriate for every person.',
          'Guarantee that a healthcare facility is open, available, affordable, nearby, or able to provide a particular service.',
        ],
      },
      {
        kind: 'callout',
        tone: 'warning',
        text: 'Do not delay professional care because of information shown by Moi Doctar.',
      },
    ],
  },
  {
    id: 'emergencies',
    number: 4,
    title: 'Emergencies and Red Flags',
    blocks: [
      {
        kind: 'callout',
        tone: 'danger',
        text: 'Moi Doctar is not an emergency-response service. If someone may be in immediate danger, contact local emergency services or go to the nearest emergency department immediately.',
      },
      {
        kind: 'p',
        text: 'Seek urgent professional help for severe, sudden, rapidly worsening, or concerning symptoms. Examples may include breathing difficulty, severe dehydration, reduced consciousness, severe or worsening pain, uncontrolled bleeding, signs of stroke, a new seizure, serious allergic reaction, severe confusion, or other warning signs identified by the approved clinical rules.',
      },
      {
        kind: 'p',
        text: 'The absence of an emergency warning in Moi Doctar does not mean that a person is safe.',
      },
    ],
  },
  {
    id: 'triage',
    number: 5,
    title: 'Triage and Urgency Indicators',
    blocks: [
      {
        kind: 'p',
        text: 'Moi Doctar may display an urgency indicator such as Emergency, Urgent, Soon, Monitor at Home, or More Information Needed. These are informational guidance categories, not medical conclusions.',
      },
      {
        kind: 'p',
        text: 'The indicator is based on the information entered, the approved application rules, and, where used, an AI-generated explanation. Missing, inaccurate, or misunderstood information may affect the result.',
      },
      {
        kind: 'p',
        text: 'When information is missing or unclear, the service may ask more questions or direct the user toward a more cautious next step.',
      },
    ],
  },
  {
    id: 'ai',
    number: 6,
    title: 'Artificial Intelligence',
    blocks: [
      {
        kind: 'p',
        text: 'Moi Doctar may use Google Gemini or another configured AI service to ask approved follow-up questions, summarize supplied information, and produce concise structured explanations.',
      },
      {
        kind: 'p',
        text: 'AI output may be incomplete, inaccurate, delayed, or affected by the information provided. Users must not treat AI output as a diagnosis, prescription, or substitute for professional advice.',
      },
      {
        kind: 'p',
        text: 'Moi Doctar uses application rules and approved data structures for safety-critical functions where available. AI output may be rejected, limited, replaced, or unavailable. If the AI service is unavailable, Moi Doctar may provide a fixed fallback message or limit certain features.',
      },
    ],
  },
  {
    id: 'medication',
    number: 7,
    title: 'Medication Tracker and OTC Logic',
    blocks: [
      {
        kind: 'p',
        text: 'Moi Doctar may include a medication tracker, medication history, reminders, and an adult or Pediatric 6+ OTC dosage-logic module.',
      },
      { kind: 'p', text: 'The five current research products are:' },
      {
        kind: 'list',
        items: [
          'Paracetamol',
          'Ibuprofen',
          'Cetirizine',
          'Oral Rehydration Salts (ORS)',
          'Antacids',
        ],
      },
      {
        kind: 'p',
        text: 'Any dosage logic is subject to medical review, version control, product formulation, age and weight requirements, safe intervals, daily limits, contraindications, and release approval. A displayed value may not be appropriate for a particular person or product.',
      },
      { kind: 'p', text: 'The medication feature must not be used to:' },
      {
        kind: 'list',
        items: [
          'Select a medicine based only on symptoms.',
          'Create a prescription.',
          'Replace a clinician’s or pharmacist’s instruction.',
          'Calculate or change a dose without the approved logic.',
          'Combine medicines without checking for duplicate ingredients or interactions.',
          'Decide that a medicine is safe for a baby or child under 6.',
          'Treat diarrhea, dehydration, vomiting, abdominal pain, or another serious concern automatically.',
        ],
      },
      {
        kind: 'callout',
        tone: 'danger',
        text: 'The Under-6 pathway is separate from the Pediatric 6+ dosage logic. A baby or child under 6, especially with diarrhea, vomiting, dehydration signs, or inability to drink or breastfeed, may require prompt professional assessment.',
      },
      {
        kind: 'p',
        text: 'Users remain responsible for checking the product label and obtaining advice from a qualified healthcare professional or pharmacist. Do not use a medication reminder as evidence that a dose is medically appropriate.',
      },
    ],
  },
  {
    id: 'user-information',
    number: 8,
    title: 'User-Provided Information',
    blocks: [
      {
        kind: 'p',
        text: 'Users are responsible for entering information as accurately as possible, including age, weight where required, symptoms, allergies, medical conditions, medicines already taken, timing of last doses, and symptom duration.',
      },
      {
        kind: 'p',
        text: 'Do not enter information that belongs to another person unless you are authorized to do so. Do not enter passwords, payment-card details, or unnecessary sensitive information into free-text fields.',
      },
      {
        kind: 'p',
        text: 'If information is missing, contradictory, or uncertain, Moi Doctar may refuse to provide a dosage-related result or may recommend professional review.',
      },
    ],
  },
  {
    id: 'nearby-care',
    number: 9,
    title: 'Nearby Care and Facility Information',
    blocks: [
      {
        kind: 'p',
        text: 'Moi Doctar may display nearby healthcare facilities, maps, contact details, operating-status indicators, or other local-care information supplied by third parties or configured data sources.',
      },
      {
        kind: 'p',
        text: 'Facility information may be outdated, incomplete, inaccurate, or unavailable. Users should confirm availability, opening hours, location, services, and cost directly with the facility where possible.',
      },
      {
        kind: 'p',
        text: 'Moi Doctar does not guarantee facility quality, availability, waiting time, price, admission, or treatment outcome.',
      },
    ],
  },
  {
    id: 'accounts',
    number: 10,
    title: 'Accounts and Security',
    blocks: [
      {
        kind: 'p',
        text: 'If an account is required, users must provide accurate registration information and keep login credentials confidential. Users are responsible for activity under their account.',
      },
      {
        kind: 'p',
        text: 'Users must notify Moi Doctar through the official support channel if they suspect unauthorized access. Moi Doctar may suspend access where necessary to protect the service, users, data, or platform security.',
      },
      {
        kind: 'p',
        text: 'Do not share an account if doing so could expose another person’s health or medication history.',
      },
    ],
  },
  {
    id: 'user-content',
    number: 11,
    title: 'Medication History, Feedback, and User Content',
    blocks: [
      {
        kind: 'p',
        text: 'Users may save medication records, symptom-tracking entries, feedback, or other information depending on the features enabled in the current version.',
      },
      {
        kind: 'p',
        text: 'Users should not submit unnecessary identifiable health information in feedback or public fields. Feedback may be used to improve usability, safety messaging, product quality, and research analysis after appropriate privacy safeguards are applied.',
      },
      {
        kind: 'p',
        text: 'By submitting feedback, you grant the service provider permission to use the feedback for product improvement, analysis, documentation, and research, without transferring ownership of your personal identity or private medical information.',
      },
      {
        kind: 'p',
        text: 'Do not submit content that is unlawful, abusive, fraudulent, threatening, infringing, or intended to harm the service or another person.',
      },
    ],
  },
  {
    id: 'beta',
    number: 12,
    title: 'Beta Testing and Prototype Features',
    blocks: [
      {
        kind: 'p',
        text: 'Some features may be provided as a beta, prototype, research, or testing version. Such features may change, be incomplete, contain errors, be temporarily unavailable, or be removed without notice.',
      },
      {
        kind: 'p',
        text: 'Beta users should not rely on Moi Doctar as their only source of health information or use it to make urgent medical decisions without professional help.',
      },
      {
        kind: 'p',
        text: 'Beta feedback should describe confusing wording, broken steps, missing information, incorrect display, or safety concerns. Do not include another person’s identifiable medical information in feedback.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    number: 13,
    title: 'Acceptable Use',
    blocks: [
      { kind: 'p', text: 'Users must not:' },
      {
        kind: 'list',
        items: [
          'Use Moi Doctar for unlawful or fraudulent activity.',
          'Attempt to access another person’s account or data.',
          'Reverse engineer, damage, overload, scrape, or disrupt the service.',
          'Submit false data to manipulate triage, dosage, leaderboards, research, or feedback.',
          'Use automated tools to create fake registrations or feedback.',
          'Copy, sell, or redistribute the service or its content without authorization.',
          'Present Moi Doctar’s output as professional medical advice.',
        ],
      },
    ],
  },
  {
    id: 'intellectual-property',
    number: 14,
    title: 'Intellectual Property',
    blocks: [
      {
        kind: 'p',
        text: `Moi Doctar, including its name, logo, interface, software, content, designs, workflows, databases, and documentation, is owned by or licensed to ${TERMS_META.legalEntity}.`,
      },
      {
        kind: 'p',
        text: 'Subject to these Terms, users receive a limited, personal, non-exclusive, non-transferable, revocable right to use the service for its intended purpose.',
      },
      {
        kind: 'p',
        text: 'No ownership rights are transferred to users. Third-party names, maps, facility information, AI services, and other materials remain subject to their respective owners’ terms.',
      },
    ],
  },
  {
    id: 'privacy',
    number: 15,
    title: 'Privacy',
    blocks: [
      {
        kind: 'p',
        text: 'Use of Moi Doctar is also governed by the Privacy Policy, which explains what information is collected, why it is used, how it is stored, retention periods, service providers, user rights, and how users can make privacy requests.',
      },
      {
        kind: 'p',
        text: 'Because health-related information may be sensitive, the service provider should apply appropriate data-minimization, access-control, security, and retention practices before public launch.',
      },
    ],
  },
  {
    id: 'availability',
    number: 16,
    title: 'Availability and Changes',
    blocks: [
      {
        kind: 'p',
        text: 'Moi Doctar may be unavailable, interrupted, delayed, or changed because of maintenance, internet problems, third-party services, security issues, development work, or other circumstances.',
      },
      {
        kind: 'p',
        text: 'The service provider may add, modify, suspend, or remove features. Material changes to these Terms will be communicated through the service or another reasonable channel where required.',
      },
    ],
  },
  {
    id: 'liability',
    number: 17,
    title: 'Disclaimers and Limitation of Liability',
    blocks: [
      {
        kind: 'p',
        text: 'To the maximum extent permitted by applicable law, Moi Doctar is provided on an “as available” and “as is” basis without guarantees that it will be uninterrupted, error-free, complete, current, or suitable for every user.',
      },
      {
        kind: 'p',
        text: 'The service provider is not responsible for medical decisions made solely from Moi Doctar information, delayed professional care, inaccurate user input, third-party facility information, third-party AI output, internet failure, or outcomes from medicines or treatment.',
      },
      {
        kind: 'p',
        text: 'Nothing in these Terms excludes liability that cannot legally be excluded, including liability for fraud, deliberate misconduct, or rights that consumers cannot waive under applicable law.',
      },
    ],
  },
  {
    id: 'termination',
    number: 18,
    title: 'Suspension and Termination',
    blocks: [
      {
        kind: 'p',
        text: 'The service provider may suspend or terminate access if a user breaches these Terms, creates a security or legal risk, abuses another user, manipulates data, or uses the service unlawfully.',
      },
      {
        kind: 'p',
        text: `Users may stop using Moi Doctar at any time. Account deletion and data requests should be submitted through ${TERMS_META.supportContact}. Some records may be retained where required by law, legitimate security needs, or documented research and audit requirements.`,
      },
    ],
  },
  {
    id: 'governing-law',
    number: 19,
    title: 'Governing Law and Disputes',
    blocks: [
      {
        kind: 'p',
        text: `These Terms are governed by the laws of ${orPending(TERMS_META.governingLaw)}, unless mandatory consumer-protection law provides otherwise.`,
      },
      {
        kind: 'p',
        text: `Users should first contact ${TERMS_META.supportContact} to try to resolve a concern. If the issue cannot be resolved, it may be referred to the courts or dispute-resolution forum located in ${orPending(TERMS_META.disputeLocation)}, subject to applicable law.`,
      },
    ],
  },
  {
    id: 'contact',
    number: 20,
    title: 'Contact',
    blocks: [
      { kind: 'p', text: 'For support, safety concerns, privacy requests, account issues, or complaints:' },
      {
        kind: 'contact',
        rows: [
          { label: 'Service provider', value: TERMS_META.legalEntity },
          { label: 'Email', value: TERMS_META.contactEmail },
          { label: 'Support channel', value: TERMS_META.supportChannel },
          {
            label: 'Emergency help',
            value: 'Contact local emergency services; Moi Doctar is not an emergency service.',
          },
        ],
      },
    ],
  },
  {
    id: 'acknowledgement',
    number: 21,
    title: 'Acknowledgement',
    blocks: [
      { kind: 'p', text: 'By using Moi Doctar, you acknowledge that:' },
      {
        kind: 'list',
        items: [
          'It provides guidance and triage information, not diagnosis or treatment.',
          'It does not replace a qualified healthcare professional.',
          'AI output can be wrong or incomplete.',
          'Medication and dosage features require careful review and may be limited or unavailable.',
          'Emergency or serious symptoms require professional or emergency care.',
          'You will provide information responsibly and use the service only for its intended purpose.',
        ],
      },
    ],
  },
]

/**
 * Renders legal text, marking any value still being settled.
 *
 * An outstanding field reads as "to be confirmed" in quiet, underlined text —
 * visible to anyone reviewing the page, but not shouting at the reader the way
 * a bracketed placeholder in an alert colour does.
 */
function LegalText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g)
  return (
    <>
      {parts.map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <span
            key={i}
            className="text-on-surface-variant underline decoration-dotted underline-offset-4"
          >
            {PENDING_LABEL}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

function SectionBlock({ block }: { block: Block }) {
  if (block.kind === 'p') {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant">
        <LegalText text={block.text} />
      </p>
    )
  }

  if (block.kind === 'list') {
    return (
      <ul className="flex flex-col gap-2 pl-1">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2.5 font-body-md text-body-md text-on-surface-variant">
            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <LegalText text={item} />
            </span>
          </li>
        ))}
      </ul>
    )
  }

  if (block.kind === 'contact') {
    return (
      <dl className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
        {block.rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="font-label-md text-label-md shrink-0 text-on-surface sm:w-40">{row.label}</dt>
            <dd className="font-body-md text-body-md text-on-surface-variant">
              <LegalText text={row.value} />
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  const isDanger = block.tone === 'danger'
  return (
    <div
      className={`flex gap-3 rounded-2xl border p-4 ${
        isDanger
          ? 'border-error/40 bg-error-container/40'
          : 'border-outline-variant bg-surface-container-low'
      }`}
    >
      <Icon
        icon={isDanger ? 'error' : 'health_and_safety'}
        size="md"
        aria-hidden="true"
        className={`shrink-0 ${isDanger ? 'text-error' : 'text-primary'}`}
      />
      <p
        className={`font-body-md text-body-md font-semibold ${
          isDanger ? 'text-error' : 'text-on-surface'
        }`}
      >
        <LegalText text={block.text} />
      </p>
    </div>
  )
}

export default function Terms() {
  const navigate = useNavigate()
  const location = useLocation()

  // "default" means this is the first entry in the history stack — someone
  // opened /terms directly, so there is nothing to go back to.
  const handleBack = () => {
    if (location.key === 'default') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background motion-safe:scroll-smooth">
      <header className="sticky top-0 z-10 border-b border-outline-variant bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[860px] items-center gap-2 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5 font-label-md text-label-md text-on-surface-variant transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon icon="arrow_back" size="md" aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
            <span className="sr-only sm:hidden">Go back</span>
          </button>
          <Link
            to="/"
            aria-label={APP_NAME}
            className="ml-auto flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <img src="/moidoctar-logo.svg" alt="" className="h-7 w-7 shrink-0 object-contain" />
            <span className="truncate font-headline-md text-base font-extrabold text-primary">
              {APP_NAME}
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-4 pb-20 pt-8 sm:px-6">
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-background">
          Terms and Conditions
        </h1>
        <p className="mt-2 font-label-md text-label-md text-primary">User and Beta-Testing Terms</p>

        <dl className="mt-6 grid gap-x-6 gap-y-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Last updated</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">{TERMS_META.lastUpdated}</dd>
          </div>
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Service name</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">Moi Doctar</dd>
          </div>
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Service provider</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">{TERMS_META.legalEntity}</dd>
          </div>
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Contact</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">
              <a
                href={`mailto:${TERMS_META.contactEmail}`}
                className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {TERMS_META.contactEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Privacy Policy</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">
              <Link
                to="/privacy"
                className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Read the Privacy Policy
              </Link>
            </dd>
          </div>
        </dl>

        <nav aria-labelledby="toc-heading" className="mt-8 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5">
          <h2 id="toc-heading" className="font-label-md text-label-md text-on-surface">
            On this page
          </h2>
          <ol className="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 font-body-md text-sm text-on-surface-variant transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span aria-hidden="true" className="w-5 shrink-0 tabular-nums text-primary">
                    {section.number}.
                  </span>
                  <span className="truncate">{section.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-20">
              <h2
                id={`${section.id}-heading`}
                className="font-headline-md text-xl font-bold text-on-background"
              >
                <span className="text-primary">{section.number}.</span> {section.title}
              </h2>
              <div className="mt-4 flex flex-col gap-4">
                {section.blocks.map((block, i) => (
                  <SectionBlock key={i} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-outline-variant pt-6">
          <p className="font-label-md text-label-md text-on-surface-variant">
            End of Terms and Conditions
          </p>
          <p className="mt-3 font-caption text-caption leading-5 text-on-surface-variant">
            Questions about these Terms?{' '}
            <a
              href={`mailto:${TERMS_META.contactEmail}`}
              className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {TERMS_META.contactEmail}
            </a>
            {' · '}
            <Link
              to="/privacy"
              className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
