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

const trustItems = [
  { icon: 'shield_lock', label: 'Encrypted access' },
  { icon: 'ecg_heart', label: 'Triage-ready context' },
  { icon: 'schedule', label: 'Care history saved' },
]

const workflowItems = [
  { icon: 'verified_user', label: 'Identity checked', value: 'Secure session' },
  { icon: 'monitor_heart', label: 'Health context', value: 'Symptoms, notes, meds' },
  { icon: 'encrypted', label: 'Private records', value: 'Protected by default' },
]

const animatedMedicalIcons = [
  {
    icon: 'ecg_heart',
    label: 'Vitals',
    centerClass: 'motion-safe:animate-[auth-medical-surface-1_12s_cubic-bezier(0.16,1,0.3,1)_infinite]',
    stationClass: 'left-1/2 top-0 -translate-x-1/2',
    stationPulseClass: 'motion-safe:animate-[auth-station-pulse-1_12s_ease-in-out_infinite]',
  },
  {
    icon: 'medical_services',
    label: 'Care',
    centerClass: 'motion-safe:animate-[auth-medical-surface-2_12s_cubic-bezier(0.16,1,0.3,1)_infinite]',
    stationClass: 'right-0 top-1/2 -translate-y-1/2',
    stationPulseClass: 'motion-safe:animate-[auth-station-pulse-2_12s_ease-in-out_infinite]',
  },
  {
    icon: 'clinical_notes',
    label: 'Notes',
    centerClass: 'motion-safe:animate-[auth-medical-surface-3_12s_cubic-bezier(0.16,1,0.3,1)_infinite]',
    stationClass: 'bottom-0 left-1/2 -translate-x-1/2',
    stationPulseClass: 'motion-safe:animate-[auth-station-pulse-3_12s_ease-in-out_infinite]',
  },
  {
    icon: 'medication',
    label: 'Meds',
    centerClass: 'motion-safe:animate-[auth-medical-surface-4_12s_cubic-bezier(0.16,1,0.3,1)_infinite]',
    stationClass: 'left-0 top-1/2 -translate-y-1/2',
    stationPulseClass: 'motion-safe:animate-[auth-station-pulse-4_12s_ease-in-out_infinite]',
  },
]

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  eyebrow = 'MoiDoctar',
  maxWidthClass = 'max-w-[440px]',
  visualPosition = 'right',
}: AuthShellProps) {
  const visualOnLeft = visualPosition === 'left'
  const gridClass = visualOnLeft
    ? 'lg:grid-cols-[minmax(460px,1.08fr)_minmax(0,0.92fr)]'
    : 'lg:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)]'
  const formOrderClass = visualOnLeft
    ? 'lg:order-2 motion-safe:lg:animate-[auth-panel-slide-from-right_720ms_cubic-bezier(0.16,1,0.3,1)_both]'
    : 'motion-safe:lg:animate-[auth-panel-slide-from-left_720ms_cubic-bezier(0.16,1,0.3,1)_both]'
  const visualOrderClass = visualOnLeft
    ? 'lg:order-1 motion-safe:lg:animate-[auth-panel-slide-from-left_760ms_cubic-bezier(0.16,1,0.3,1)_both]'
    : 'motion-safe:lg:animate-[auth-panel-slide-from-right_760ms_cubic-bezier(0.16,1,0.3,1)_both]'

  return (
    <main className="relative flex min-h-[100dvh] overflow-hidden bg-[linear-gradient(135deg,#050816 0%,#0a0f1e 48%,#0d1a2d 100%)] px-3 py-3 text-on-background sm:px-5 sm:py-5 lg:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,197,253,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,197,253,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className={`relative mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-[1240px] overflow-hidden rounded-[28px] border border-[rgba(148,197,253,0.12)] bg-[rgba(10,15,30,0.55)] shadow-[0_30px_90px_rgba(0,0,0,0.4),0_0_80px_rgba(148,197,253,0.04)] backdrop-blur-xl sm:min-h-[calc(100dvh-2.5rem)] lg:min-h-[calc(100dvh-3rem)] ${gridClass}`}>
        <section className={`relative flex min-h-full items-start justify-center overflow-y-auto bg-[linear-gradient(165deg,#0a0f1e_0%,#0d1a2d_60%,#0a1628_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-11 ${formOrderClass}`}>
          <div className={`w-full ${maxWidthClass} motion-safe:animate-[auth-rise-in_520ms_cubic-bezier(0.16,1,0.3,1)_both]`}>
            <header className="mb-6 flex flex-col gap-5 sm:mb-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative">
                    <img
                      src="/moidoctar-logo.svg"
                      alt="MoiDoctar"
                      className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24 motion-safe:animate-[auth-float-soft_5.5s_ease-in-out_infinite]"
                    />
                    <span className="absolute -inset-3 rounded-full bg-[rgba(148,197,253,0.08)] blur-xl motion-safe:animate-[auth-ring-breathe_4s_ease-in-out_infinite]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-headline-md text-xl font-extrabold leading-7 text-[#94C5FD] sm:text-2xl">
                      {eyebrow}
                    </p>
                    <p className="font-body-md text-sm text-[rgba(148,163,184,0.8)]">Health Triage</p>
                  </div>
                </div>

                <div className="hidden min-h-10 items-center gap-2 rounded-full border border-[rgba(148,197,253,0.2)] bg-[rgba(148,197,253,0.06)] px-3 text-xs font-extrabold text-[#94C5FD] shadow-[0_0_16px_rgba(148,197,253,0.08)] sm:inline-flex">
                  <Icon icon="lock" size="sm" aria-hidden="true" />
                  Secure
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:hidden" aria-label="Auth security highlights">
                {trustItems.slice(0, 2).map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(148,197,253,0.12)] bg-[rgba(148,197,253,0.04)] px-3 text-xs font-bold text-[rgba(148,163,184,0.9)] backdrop-blur-sm"
                  >
                    <Icon icon={item.icon} size="sm" aria-hidden="true" />
                    {item.label}
                  </span>
                ))}
              </div>

              <div>
                <h1 className="font-headline-md text-[2rem] font-extrabold leading-[2.45rem] text-[#e0e7ff] sm:text-[2.35rem] sm:leading-[2.8rem]">
                  {title}
                </h1>
                <p className="mt-3 font-body-md text-body-md text-[rgba(148,163,184,0.85)]">{subtitle}</p>
              </div>
            </header>

            {children}

            {footer && (
              <footer className="mt-5 text-center font-body-md text-body-md text-[rgba(148,163,184,0.7)] sm:mt-6">
                {footer}
              </footer>
            )}
          </div>
        </section>

        <aside className={`relative hidden min-h-full overflow-hidden bg-[linear-gradient(150deg,#050816_0%,#0a1628_40%,#0d2137_70%,#050816_100%)] p-8 text-on-primary-container lg:flex lg:flex-col lg:justify-between xl:p-10 ${visualOrderClass}`}>
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,197,253,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,197,253,0.15)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="pointer-events-none absolute right-8 top-8 h-[calc(100%-4rem)] w-px bg-[rgba(148,197,253,0.12)]" />

          <div className="pointer-events-none absolute left-6 top-10 h-40 w-40 rounded-full bg-[rgba(148,197,253,0.06)] blur-3xl motion-safe:animate-[auth-ring-breathe_6s_ease-in-out_infinite]" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-16 right-10 h-32 w-32 rounded-full bg-[rgba(168,85,247,0.05)] blur-2xl motion-safe:animate-[auth-ring-breathe_8s_ease-in-out_1s_infinite]" aria-hidden="true" />
          <div className="pointer-events-none absolute left-1/3 top-1/2 h-24 w-24 rounded-full bg-[rgba(148,197,253,0.04)] blur-2xl motion-safe:animate-[auth-ring-breathe_5s_ease-in-out_2s_infinite]" aria-hidden="true" />

          <div className="relative z-10 flex items-center justify-between gap-4 motion-safe:animate-[auth-rise-in_560ms_cubic-bezier(0.16,1,0.3,1)_both]">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="/moidoctar-logo.svg"
                  alt=""
                  className="h-24 w-24 shrink-0 object-contain motion-safe:animate-[auth-float-soft_6s_ease-in-out_infinite]"
                  aria-hidden="true"
                />
                <span className="absolute -inset-4 rounded-full bg-[rgba(148,197,253,0.1)] blur-2xl motion-safe:animate-[auth-ring-breathe_5s_ease-in-out_infinite]" aria-hidden="true" />
              </div>
              <div>
                <p className="font-label-md text-label-md text-[rgba(224,231,255,0.6)]">Secure intake</p>
                <p className="font-headline-md text-headline-md font-extrabold text-[#e0e7ff]">
                  Guided health support
                </p>
              </div>
            </div>
            <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-3 text-xs font-extrabold text-[#e0e7ff] backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5),0_0_0_4px_rgba(16,185,129,0.15)] motion-safe:animate-[auth-pulse-soft_1.8s_ease-out_infinite]" aria-hidden="true" />
              Live
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[470px] flex-col py-8">
            <div className="rounded-[30px] border border-[rgba(148,197,253,0.1)] bg-[rgba(10,15,30,0.35)] p-6 shadow-[0_28px_70px_rgba(0,0,0,0.25),0_0_40px_rgba(148,197,253,0.04)] backdrop-blur-xl motion-safe:animate-[auth-rise-in_620ms_cubic-bezier(0.16,1,0.3,1)_both]">
              <div className="flex items-start justify-between gap-5 border-b border-[rgba(148,197,253,0.08)] pb-5">
                <div>
                  <p className="font-body-md text-sm text-[rgba(224,231,255,0.6)]">Current session</p>
                  <h2 className="mt-1 font-headline-md text-headline-md font-extrabold text-[#e0e7ff]">
                    Sign in with confidence
                  </h2>
                </div>
                <Icon icon="health_and_safety" size="xl" className="text-[#94C5FD]" aria-hidden="true" />
              </div>

              <div className="relative mx-auto my-8 grid h-[19rem] w-[19rem] place-items-center">
                <span className="absolute inset-0 rounded-full border-2 border-[rgba(148,197,253,0.12)]" aria-hidden="true" />
                <span className="absolute inset-4 rounded-full border-[5px] border-[rgba(148,197,253,0.3)] shadow-[0_0_54px_rgba(148,197,253,0.15)] motion-safe:animate-[auth-ring-breathe_3.4s_ease-in-out_infinite]" aria-hidden="true" />
                <span className="absolute inset-9 rounded-full border-2 border-dashed border-[rgba(148,197,253,0.2)] motion-safe:animate-[auth-ring-spin_14s_linear_infinite]" aria-hidden="true" />
                <span className="absolute inset-[4.35rem] rounded-full border-2 border-[rgba(148,197,253,0.15)] motion-safe:animate-[auth-ring-spin_18s_linear_infinite_reverse]" aria-hidden="true" />

                {animatedMedicalIcons.map((item) => (
                  <div
                    key={item.icon}
                    className={`absolute z-20 grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(148,197,253,0.15)] bg-[rgba(10,15,30,0.5)] text-[#94C5FD] shadow-[0_0_16px_rgba(148,197,253,0.1),0_12px_30px_rgba(148,197,253,0.08)] backdrop-blur ${item.stationClass} ${item.stationPulseClass}`}
                    aria-hidden="true"
                  >
                    <Icon icon={item.icon} size="lg" />
                  </div>
                ))}

                <div className="relative z-10 grid h-44 w-44 place-items-center overflow-hidden rounded-full border-[5px] border-[rgba(148,197,253,0.4)] bg-[radial-gradient(circle_at_35%_20%,#0d1a2d_0%,#1F3A8A_72%,#2663EB_100%)] shadow-[0_0_40px_rgba(148,197,253,0.25),0_28px_64px_rgba(148,197,253,0.15)] backdrop-blur-xl">
                  <div className="absolute inset-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.28)_0%,transparent_28%),radial-gradient(circle_at_74%_78%,rgba(94,234,212,0.15)_0%,transparent_32%)] opacity-90" aria-hidden="true" />

                  <div className="absolute inset-x-[-24%] bottom-[-10%] h-[120%] origin-bottom overflow-hidden rounded-[46%] bg-[linear-gradient(180deg,rgba(148,197,253,0.85)_0%,rgba(38,99,235,0.9)_48%,rgba(31,58,138,0.95)_100%)] shadow-[inset_0_18px_40px_rgba(255,255,255,0.15)] motion-safe:animate-[auth-real-water-fill_12s_ease-in-out_infinite]" aria-hidden="true">
                    <span className="absolute -top-5 left-[-26%] h-11 w-[154%] rounded-[48%] bg-[rgba(148,197,253,0.4)] motion-safe:animate-[auth-wave-drift_3.2s_linear_infinite]" />
                    <span className="absolute -top-3 left-[-38%] h-10 w-[178%] rounded-[46%] bg-[rgba(168,85,247,0.3)] motion-safe:animate-[auth-wave-drift_4.4s_linear_infinite_reverse]" />
                    <span className="absolute bottom-8 left-8 h-2 w-2 rounded-full bg-[rgba(255,255,255,0.5)] motion-safe:animate-[auth-bubble-rise_4.8s_ease-in_infinite]" />
                    <span className="absolute bottom-5 left-20 h-1.5 w-1.5 rounded-full bg-[rgba(255,255,255,0.4)] motion-safe:animate-[auth-bubble-rise_5.8s_ease-in_900ms_infinite]" />
                    <span className="absolute bottom-12 right-10 h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.3)] motion-safe:animate-[auth-bubble-rise_6.2s_ease-in_1400ms_infinite]" />
                  </div>

                  <div className="pointer-events-none absolute left-10 top-8 h-4 w-10 rotate-[-18deg] rounded-full bg-[rgba(255,255,255,0.15)] blur-[2px]" aria-hidden="true" />

                  {animatedMedicalIcons.map((item) => (
                    <span
                      key={item.icon}
                      className={`absolute z-10 grid place-items-center text-on-primary drop-shadow-[0_12px_26px_rgba(0,0,0,0.24)] ${item.centerClass}`}
                    >
                      <Icon icon={item.icon} size="3xl" aria-hidden="true" />
                      <span className="mt-2 font-label-md text-xs font-extrabold uppercase text-[rgba(255,255,255,0.85)]">{item.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {workflowItems.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-[rgba(148,197,253,0.08)] bg-[rgba(10,15,30,0.3)] p-3 backdrop-blur-sm motion-safe:animate-[auth-rise-in_520ms_cubic-bezier(0.16,1,0.3,1)_both]"
                    style={{ animationDelay: `${120 + index * 70}ms` }}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[rgba(148,197,253,0.12)] bg-[rgba(148,197,253,0.06)] text-[#94C5FD] shadow-[0_0_12px_rgba(148,197,253,0.08)]">
                      <Icon icon={item.icon} size="lg" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-body-md text-sm font-extrabold text-[#e0e7ff]">{item.label}</p>
                      <p className="font-body-md text-sm text-[rgba(224,231,255,0.55)]">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 grid gap-3">
            {trustItems.map((item, index) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-full border border-[rgba(148,197,253,0.1)] bg-[rgba(148,197,253,0.04)] px-4 py-3 font-body-md text-sm font-bold text-[#e0e7ff] backdrop-blur-sm motion-safe:animate-[auth-rise-in_520ms_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{ animationDelay: `${180 + index * 70}ms` }}
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(148,197,253,0.08)] text-[#94C5FD] shadow-[0_0_10px_rgba(148,197,253,0.1)]">
                  <Icon icon={item.icon} size="sm" aria-hidden="true" />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  )
}
