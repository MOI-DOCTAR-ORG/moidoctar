const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(148,197,253,0.25)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]'

export const authField = 'flex flex-col gap-2'
export const authLabel = 'font-label-md text-label-md text-[#e0e7ff]'
export const authInputFrame = [
  'relative flex min-h-14 items-center rounded-2xl border border-[rgba(148,197,253,0.12)]',
  'bg-[rgba(10,15,30,0.5)] text-[#e0e7ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_0_16px_rgba(148,197,253,0.04)]',
  'backdrop-blur-xl',
  'transition duration-200 ease-out focus-within:-translate-y-0.5 focus-within:border-[#94C5FD] focus-within:shadow-[0_0_0_3px_rgba(148,197,253,0.12),0_0_20px_rgba(148,197,253,0.08)]',
].join(' ')
export const authInputFrameError = [
  authInputFrame,
  'border-[#ff4d4d] shadow-[0_0_0_3px_rgba(255,77,77,0.12),0_0_16px_rgba(255,77,77,0.06)] focus-within:border-[#ff4d4d] focus-within:shadow-[0_0_0_3px_rgba(255,77,77,0.12),0_0_16px_rgba(255,77,77,0.06)]',
].join(' ')
export const authInputIcon = 'ml-3.5 shrink-0 text-[#94C5FD] opacity-70'
export const authInput = [
  'w-full border-0 bg-transparent px-3.5 py-3 font-body-md text-base leading-6 text-[#e0e7ff] outline-none',
  'placeholder:text-[rgba(148,163,184,0.5)] disabled:cursor-not-allowed disabled:opacity-60',
].join(' ')
export const authPrimaryButton = [
  'inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-[rgba(148,197,253,0.4)]',
  'bg-[linear-gradient(135deg,#94C5FD_0%,#2663EB_100%)] px-5 py-3.5 font-body-md text-sm font-extrabold text-[#050816]',
  'shadow-[0_0_24px_rgba(148,197,253,0.25),0_16px_34px_rgba(148,197,253,0.15)]',
  'transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(148,197,253,0.35),0_20px_42px_rgba(148,197,253,0.2)] active:translate-y-0 active:scale-[0.99]',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
  focusRing,
].join(' ')
export const authSecondaryButton = [
  'inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-[rgba(148,197,253,0.12)]',
  'bg-[rgba(10,15,30,0.4)] backdrop-blur-xl px-5 py-3.5 font-body-md text-sm font-extrabold text-[#e0e7ff]',
  'shadow-[0_0_12px_rgba(148,197,253,0.04),0_10px_26px_rgba(0,0,0,0.15)]',
  'transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgba(148,197,253,0.3)] hover:bg-[rgba(148,197,253,0.06)] active:translate-y-0 active:scale-[0.99]',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
  focusRing,
].join(' ')
export const authLink = [
  'rounded-md font-extrabold text-[#94C5FD] no-underline transition hover:underline',
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(148,197,253,0.25)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]',
].join(' ')
export const authErrorBanner = [
  'flex items-start gap-3 rounded-2xl border border-[rgba(255,77,77,0.2)] bg-[rgba(255,77,77,0.06)] px-3.5 py-3 font-body-md text-sm leading-5 text-[#ff4d4d] shadow-[0_0_16px_rgba(255,77,77,0.06)]',
].join(' ')
export const authSuccessBanner = [
  'flex items-start gap-3 rounded-2xl border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.06)] px-3.5 py-3 font-body-md text-sm leading-5 text-[#10b981]',
].join(' ')
export const authDivider = [
  'flex items-center gap-3 font-body-md text-xs font-bold text-[rgba(148,163,184,0.7)]',
  'before:h-px before:flex-1 before:bg-[linear-gradient(90deg,transparent,rgba(148,197,253,0.15),transparent)] after:h-px after:flex-1 after:bg-[linear-gradient(90deg,transparent,rgba(148,197,253,0.15),transparent)]',
].join(' ')
export const authFormStack = 'flex flex-col gap-5 motion-safe:[&>*]:animate-[auth-rise-in_500ms_cubic-bezier(0.16,1,0.3,1)_both]'
