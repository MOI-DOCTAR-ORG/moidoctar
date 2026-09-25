import { Link, Navigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../lib/constants'

const features = [
  {
    icon: 'medical_services',
    title: 'Symptom triage',
    body: 'Describe how you feel in your own words and get an urgency level, possible causes, and clear next steps in seconds.',
  },
  {
    icon: 'location_on',
    title: 'Find care nearby',
    body: 'See nearby clinics and hospitals matched to your assessment, so you know exactly where to go next.',
  },
  {
    icon: 'monitor_heart',
    title: 'Track your symptoms',
    body: 'Log how symptoms change over time and keep a private history you can revisit or share with a clinician.',
  },
  {
    icon: 'pill',
    title: 'Medication reminders',
    body: 'Keep your medications organized and get reminders so nothing important slips through the cracks.',
  },
]

const trustItems = [
  { icon: 'shield_lock', label: 'Your data is encrypted' },
  { icon: 'verified_user', label: 'Guidance, not a diagnosis' },
  { icon: 'schedule', label: 'Available whenever you need it' },
]

export default function Landing() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-6 md:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/moidoctar-logo.svg" alt={APP_NAME} className="h-9 w-9 object-contain" />
          <span className="font-headline-md text-lg font-extrabold text-primary">{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-2.5">
          <Link
            to="/sign-in"
            className="rounded-xl px-4 py-2.5 font-label-md text-label-md text-on-surface-variant transition hover:bg-primary-container/40 hover:text-primary"
          >
            Sign in
          </Link>
          <Link
            to="/sign-up"
            className="rounded-xl bg-primary px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary shadow-sm transition shadow-sm"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto flex max-w-[1200px] flex-col items-center gap-8 px-5 pb-16 pt-10 text-center md:px-8 md:pb-24 md:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-primary-container/30 px-4 py-1.5 font-caption text-caption text-primary">
            <Icon icon="health_and_safety" size="sm" aria-hidden="true" />
            Clear, human triage guidance
          </span>

          <h1 className="max-w-3xl font-headline-xl text-4xl font-extrabold leading-tight text-on-background md:text-[56px] md:leading-[1.05]">
            Know what to do next,{' '}
            <span className="text-primary">
              in minutes.
            </span>
          </h1>

          <p className="max-w-xl font-body-lg text-body-lg text-on-surface-variant">
            {APP_NAME} listens to your symptoms, tells you how urgent they are, and points you to
            the right care — so you're never guessing when something feels wrong.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/sign-up"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 font-body-md text-sm font-bold text-on-primary shadow-sm transition hover:-translate-y-0.5"
            >
              Start your first triage
              <Icon icon="arrow_forward" size="sm" aria-hidden="true" />
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface px-8 py-3.5 font-body-md text-sm font-extrabold text-on-surface transition hover:border-primary"
            >
              I already have an account
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2">
            {trustItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 font-caption text-caption text-on-surface-variant">
                <Icon icon={item.icon} size="sm" className="text-primary" aria-hidden="true" />
                {item.label}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-outline-variant bg-surface-container-low py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-headline-lg text-headline-lg text-on-background">
                Everything you need to stay ahead of your health
              </h2>
              <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                One place to assess symptoms, track how you're doing, and find the right care.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface p-6 shadow-glass transition hover:-translate-y-1 hover:shadow-glass-lg"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-container text-primary">
                    <Icon icon={feature.icon} size="md" aria-hidden="true" />
                  </div>
                  <h3 className="font-headline-md text-base font-bold text-on-background">{feature.title}</h3>
                  <p className="font-body-md text-sm leading-6 text-on-surface-variant">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24">
          <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 rounded-3xl border border-outline-variant bg-primary-container px-6 py-14 text-center md:px-16">
            <h2 className="font-headline-lg text-headline-lg text-on-background">
              Not sure if it's urgent? Let's find out.
            </h2>
            <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
              Create a free account and get your first symptom assessment in under two minutes.
            </p>
            <Link
              to="/sign-up"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 font-body-md text-sm font-bold text-on-primary shadow-sm transition hover:-translate-y-0.5"
            >
              Create your free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <img src="/moidoctar-logo.svg" alt={APP_NAME} className="h-6 w-6 object-contain" />
            <span className="font-label-md text-label-md text-on-surface-variant">{APP_NAME}</span>
          </div>
          <p className="max-w-md font-caption text-caption text-on-surface-variant">
            {APP_NAME} provides triage guidance, not a medical diagnosis. In an emergency, call your
            local emergency number immediately.
          </p>
        </div>
      </footer>
    </div>
  )
}
