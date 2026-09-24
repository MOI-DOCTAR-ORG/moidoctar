const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export const authField = 'flex flex-col gap-1.5'
export const authLabel = 'text-sm font-semibold text-on-surface'
export const authInputFrame = [
  'relative flex min-h-12 items-center rounded-xl border border-outline bg-surface text-on-surface',
  'transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
].join(' ')
export const authInputFrameError = [
  'relative flex min-h-12 items-center rounded-xl border border-error bg-surface text-on-surface',
  'transition-colors duration-150 focus-within:ring-2 focus-within:ring-error/25',
].join(' ')
export const authInputIcon = 'ml-3.5 shrink-0 text-on-surface-variant'
export const authInput = [
  'w-full min-w-0 border-0 bg-transparent px-3 py-3 text-base leading-6 text-on-surface outline-none',
  'placeholder:text-on-surface-variant/70 disabled:cursor-not-allowed disabled:opacity-60',
].join(' ')
export const authPrimaryButton = [
  'inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-3',
  'text-sm font-semibold text-on-primary transition-opacity duration-150 hover:opacity-90 active:opacity-80',
  'disabled:cursor-not-allowed disabled:opacity-50',
  focusRing,
].join(' ')
export const authSecondaryButton = [
  'inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-outline bg-surface px-5 py-3',
  'text-sm font-semibold text-on-surface transition-colors duration-150 hover:bg-surface-container',
  'disabled:cursor-not-allowed disabled:opacity-50',
  focusRing,
].join(' ')
export const authLink = [
  'rounded-md font-semibold text-primary no-underline hover:underline underline-offset-2',
  focusRing,
].join(' ')
export const authErrorBanner =
  'flex items-start gap-3 rounded-xl border border-error/30 bg-error-container px-3.5 py-3 text-sm leading-5 text-on-error-container'
export const authSuccessBanner =
  'flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-container px-3.5 py-3 text-sm leading-5 text-on-primary-container'
export const authDivider = [
  'flex items-center gap-3 text-xs font-medium text-on-surface-variant',
  'before:h-px before:flex-1 before:bg-outline-variant after:h-px after:flex-1 after:bg-outline-variant',
].join(' ')
export const authFormStack = 'flex flex-col gap-5'
