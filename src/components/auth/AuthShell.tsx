import type { ReactNode } from 'react'
import Icon from '../Icon'

type AuthShellProps = {
  title: string
  subtitle: ReactNode
  children: ReactNode
  footer?: ReactNode
  eyebrow?: string
  maxWidthClass?: string
  visualPosition?: 'left' | 'right'
}

const points = [
  { icon: 'stethoscope', title: 'Describe how you feel', text: 'Chat with Liana in plain language, in your own words.' },
  { icon: 'pin_drop', title: 'Point to where it hurts', text: 'Use the body map so nothing gets lost in translation.' },
  { icon: 'history', title: 'Keep a record', text: 'Every check-in is saved so you can show it to a doctor.' },
]

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  eyebrow = 'MoiDoctar',
  maxWidthClass = 'max-w-[420px]',
  visualPosition = 'right',
}: AuthShellProps) {
  const panelFirst = visualPosition === 'left'

  return (
    <main className="min-h-[100dvh] bg-background text-on-background lg:grid lg:grid-cols-2">
      <section
        className={`flex min-h-[100dvh] items-start justify-center px-5 py-8 sm:px-8 sm:py-12 lg:items-center ${
          panelFirst ? 'lg:order-2' : ''
        }`}
      >
        <div className={`w-full ${maxWidthClass}`}>
          <header className="mb-7">
            <div className="mb-8 flex items-center gap-3">
              <img src="/moidoctar-logo.svg" alt="" className="h-10 w-10 shrink-0 object-contain" />
              <span className="font-headline-md text-xl font-bold text-on-surface">{eyebrow}</span>
            </div>
            <h1 className="font-headline-md text-[1.75rem] font-bold leading-9 text-on-surface sm:text-[2rem] sm:leading-10">
              {title}
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-on-surface-variant">{subtitle}</p>
          </header>

          {children}

          {footer && <footer className="mt-6 text-center text-sm text-on-surface-variant">{footer}</footer>}
        </div>
      </section>

      <aside
        className={`hidden bg-primary-container px-12 py-12 text-on-primary-container lg:flex lg:flex-col lg:justify-center ${
          panelFirst ? 'lg:order-1' : ''
        }`}
      >
        <div className="mx-auto w-full max-w-md">
          <p className="mb-8 font-headline-md text-3xl font-bold leading-tight">
            A clearer picture of your health, before you see a doctor.
          </p>
          <ul className="flex flex-col gap-6">
            {points.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
                  <Icon icon={p.icon} size="lg" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-0.5 text-sm leading-5 opacity-80">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs leading-5 opacity-70">
            MoiDoctar gives guidance, not a diagnosis. In an emergency, call your local emergency number.
          </p>
        </div>
      </aside>
    </main>
  )
}
