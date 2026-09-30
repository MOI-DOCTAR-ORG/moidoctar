import { Link, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { APP_NAME } from '../lib/constants'

/**
 * Privacy Policy.
 *
 * Body text is the approved policy copy and should not be reworded without
 * sign-off. As in Terms.tsx the service is named "Moi Doctar" throughout
 * because that is how the policy names it, which is a different string from
 * the product's APP_NAME.
 */
const PRIVACY_META = {
  lastUpdated: 'September 30, 2026',
  legalEntity: 'Moi Doctar Project Team',
  contactEmail: 'Moidoctar@gmail.com',
  supportChat: '08121678176',
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'numbered'; items: string[] }
  | { kind: 'callout'; tone: 'warning' | 'danger'; text: string }

type Section = { id: string; number: number; title: string; blocks: Block[] }

const sections: Section[] = [
  {
    id: 'introduction',
    number: 1,
    title: 'Introduction',
    blocks: [
      {
        kind: 'p',
        text: 'This Privacy Policy explains how the Moi Doctar Project Team collects, uses, stores, and protects information when you access or use the Moi Doctar web application, triage flow, medication tracker, and beta-testing environment.',
      },
      {
        kind: 'p',
        text: 'Because health-related information is sensitive, we operate on a principle of data minimization — collecting only what is strictly necessary to provide informational guidance and improve usability during our current development phase.',
      },
    ],
  },
  {
    id: 'what-we-collect',
    number: 2,
    title: 'What Information We Collect',
    blocks: [
      { kind: 'p', text: 'We collect limited information to operate the application safely and effectively:' },
      {
        kind: 'list',
        items: [
          'Health Guidance & Triage Inputs: Informational data you enter, such as age, general symptoms, symptom duration, weight (where required for pediatric logic), allergies, and current medications.',
          'Medication Tracker Records: Saved medication names, dosage history, and reminder preferences set within the application.',
          'Beta Feedback & Support Communications: Any voluntary feedback, bug reports, usability suggestions, or inquiry messages you submit to our support channels.',
          'Technical & Usage Data: Basic technical details, such as device type, browser version, and basic analytics to ensure service stability, feature performance, and app security.',
        ],
      },
      {
        kind: 'callout',
        tone: 'warning',
        text: 'What we do not collect: do not submit passwords, payment card details, government identification, or unnecessary personally identifiable health records into free-text fields or feedback forms.',
      },
    ],
  },
  {
    id: 'how-we-use',
    number: 3,
    title: 'How We Use Your Information',
    blocks: [
      { kind: 'p', text: 'We use the collected information for the following specific purposes:' },
      {
        kind: 'numbered',
        items: [
          'To Provide Guidance & Triage: Processing user inputs through clinical rules and AI services to display informational urgency indicators (for example Emergency, Urgent, Soon, Monitor at Home) and next steps.',
          'To Calculate OTC Dosage Logic: Applying strict safety rules for adult and Pediatric 6+ research formulations (Paracetamol, Ibuprofen, Cetirizine, ORS, Antacids).',
          'To Display Nearby Care: Matching non-precise location choices with registered local healthcare facility listings.',
          'Product Improvement & Research: Analyzing aggregated, non-identifiable feedback to refine UI steps, update clinical safety rules, fix bugs, and draft submission documentation.',
        ],
      },
    ],
  },
  {
    id: 'ai-and-third-parties',
    number: 4,
    title: 'Artificial Intelligence & Third-Party Services',
    blocks: [
      {
        kind: 'list',
        items: [
          'Google Gemini Integration: Moi Doctar uses AI integration (such as Google Gemini) to ask structured follow-up questions and generate concise informational summaries.',
          'Data Handling by AI: Prompts passed to the AI engine are anonymized and limited to general health inputs required for summary generation. AI output is strictly regulated by system guardrails and fallback rules.',
          'No Third-Party Data Selling: We do not sell, rent, or trade your health data or personal inputs to third parties, advertisers, or data brokers.',
        ],
      },
    ],
  },
  {
    id: 'retention-and-security',
    number: 5,
    title: 'Data Retention & Security',
    blocks: [
      {
        kind: 'list',
        items: [
          'Minimal Retention: Beta-testing data and feedback are retained only as long as necessary to refine product features, perform research audits, or comply with submission requirements.',
          'Security Practices: We implement access control and data minimization practices to safeguard health-related inputs against unauthorized access.',
          'Account Privacy: If you log into an account, keep your credentials confidential to prevent exposing your health history.',
        ],
      },
    ],
  },
  {
    id: 'childrens-privacy',
    number: 6,
    title: "Children's Privacy (Under 6 Pathway)",
    blocks: [
      {
        kind: 'callout',
        tone: 'danger',
        text: 'Moi Doctar features a dedicated, separate pathway for pediatric assessment. The application does not perform automated dosage calculations or triage decisions for children under 6 years old. Any under-6 concerns automatically trigger advice for prompt professional medical assessment.',
      },
    ],
  },
  {
    id: 'your-rights',
    number: 7,
    title: 'Your Rights & Choices',
    blocks: [
      { kind: 'p', text: 'You have the right to:' },
      {
        kind: 'list',
        items: [
          'Access or request deletion of your saved medication records or account details.',
          'Stop using the service at any time.',
          'Opt out of submitting optional feedback or research questionnaires.',
        ],
      },
      {
        kind: 'p',
        text: `To submit a data access or deletion request, contact us via ${PRIVACY_META.contactEmail}.`,
      },
    ],
  },
  {
    id: 'changes',
    number: 8,
    title: 'Changes to This Privacy Policy',
    blocks: [
      {
        kind: 'p',
        text: 'We may update this Privacy Policy as Moi Doctar evolves, moves through staging phases, or adds features. Material updates will be posted directly within the application footer or through reasonable notification channels.',
      },
    ],
  },
]

function SectionBlock({ block }: { block: Block }) {
  if (block.kind === 'p') {
    return <p className="font-body-md text-body-md text-on-surface-variant">{block.text}</p>
  }

  if (block.kind === 'list') {
    return (
      <ul className="flex flex-col gap-2 pl-1">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2.5 font-body-md text-body-md text-on-surface-variant">
            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (block.kind === 'numbered') {
    return (
      <ol className="flex flex-col gap-2 pl-1">
        {block.items.map((item, i) => (
          <li key={item} className="flex gap-2.5 font-body-md text-body-md text-on-surface-variant">
            <span aria-hidden="true" className="w-5 shrink-0 tabular-nums font-semibold text-primary">
              {i + 1}.
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    )
  }

  const isDanger = block.tone === 'danger'
  return (
    <div
      className={`flex gap-3 rounded-2xl border p-4 ${
        isDanger ? 'border-error/40 bg-error-container/40' : 'border-outline-variant bg-surface-container-low'
      }`}
    >
      <Icon
        icon={isDanger ? 'error' : 'shield_lock'}
        size="md"
        aria-hidden="true"
        className={`shrink-0 ${isDanger ? 'text-error' : 'text-primary'}`}
      />
      <p
        className={`font-body-md text-body-md font-semibold ${
          isDanger ? 'text-error' : 'text-on-surface'
        }`}
      >
        {block.text}
      </p>
    </div>
  )
}

export default function Privacy() {
  const navigate = useNavigate()
  const location = useLocation()

  // "default" means this is the first entry in the history stack - someone
  // opened /privacy directly, so there is nothing to go back to.
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
          Privacy Policy
        </h1>
        <p className="mt-2 font-label-md text-label-md text-primary">
          How we handle your health information
        </p>

        <dl className="mt-6 grid gap-x-6 gap-y-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Last updated</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">{PRIVACY_META.lastUpdated}</dd>
          </div>
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Service name</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">Moi Doctar</dd>
          </div>
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Service provider</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">{PRIVACY_META.legalEntity}</dd>
          </div>
          <div>
            <dt className="font-label-md text-label-md text-on-surface-variant">Contact</dt>
            <dd className="mt-0.5 font-body-md text-body-md text-on-surface">
              <a
                href={`mailto:${PRIVACY_META.contactEmail}`}
                className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {PRIVACY_META.contactEmail}
              </a>
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

          <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-20">
            <h2 id="contact-heading" className="font-headline-md text-xl font-bold text-on-background">
              <span className="text-primary">9.</span> Contact Us
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              <p className="font-body-md text-body-md text-on-surface-variant">
                For privacy inquiries, support, or data requests:
              </p>
              <dl className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="font-label-md text-label-md shrink-0 text-on-surface sm:w-40">Service provider</dt>
                  <dd className="font-body-md text-body-md text-on-surface-variant">{PRIVACY_META.legalEntity}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="font-label-md text-label-md shrink-0 text-on-surface sm:w-40">Email</dt>
                  <dd className="font-body-md text-body-md text-on-surface-variant">
                    <a
                      href={`mailto:${PRIVACY_META.contactEmail}`}
                      className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {PRIVACY_META.contactEmail}
                    </a>
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="font-label-md text-label-md shrink-0 text-on-surface sm:w-40">Support chat</dt>
                  <dd className="font-body-md text-body-md text-on-surface-variant">
                    <a
                      href={`tel:${PRIVACY_META.supportChat}`}
                      className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {PRIVACY_META.supportChat}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <div className="mt-12 border-t border-outline-variant pt-6">
          <p className="font-label-md text-label-md text-on-surface-variant">
            End of Privacy Policy
          </p>
          <p className="mt-3 font-caption text-caption leading-5 text-on-surface-variant">
            See also the{' '}
            <Link
              to="/terms"
              className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Terms and Conditions
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
