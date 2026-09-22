import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import Icon from '../Icon'

export type PremiumControlTone = 'default' | 'danger'
export type PremiumControlVariant = 'default' | 'inline' | 'pill'

type ControlClassOptions = {
  tone?: PremiumControlTone
  compact?: boolean
  variant?: PremiumControlVariant
  className?: string
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function premiumControlClass({
  tone = 'default',
  compact = false,
  variant = 'default',
  className,
}: ControlClassOptions = {}) {
  const toneClass =
    tone === 'danger'
      ? 'border-error focus:border-error focus:ring-error/20'
      : 'border-outline-variant/70 focus:border-primary focus:ring-primary/20'

  const variantClass =
    variant === 'inline'
      ? 'min-h-10 rounded-xl border-dashed bg-surface-container-lowest/70 px-3 py-2 shadow-none'
      : variant === 'pill'
        ? 'min-h-9 rounded-full bg-surface-container-lowest/90 px-4 py-2 text-sm shadow-[0_8px_22px_rgba(15,23,42,0.05)]'
        : cn(
            compact ? 'min-h-11 rounded-xl px-4 py-2.5' : 'min-h-12 rounded-2xl px-4 py-3',
            'bg-surface-container-lowest/90 shadow-[0_10px_24px_rgba(15,23,42,0.05)]'
          )

  return cn(
    'w-full border font-body-md text-on-surface outline-none transition-all duration-200 placeholder:text-secondary',
    'hover:border-primary/50 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
    'dark:bg-surface-container-high/70 dark:shadow-none dark:placeholder:text-on-surface-variant/60',
    toneClass,
    variantClass,
    className
  )
}

type PremiumInputProps = InputHTMLAttributes<HTMLInputElement> & {
  tone?: PremiumControlTone
  compact?: boolean
  variant?: PremiumControlVariant
  icon?: string
  containerClassName?: string
}

export function PremiumInput({
  tone,
  compact,
  variant,
  icon,
  className,
  containerClassName,
  type = 'text',
  ...props
}: PremiumInputProps) {
  const temporalIcon = type === 'date' ? 'calendar_month' : type === 'time' ? 'schedule' : undefined
  const endIcon = icon || temporalIcon

  return (
    <div className={cn('relative', containerClassName)}>
      <input
        type={type}
        className={premiumControlClass({
          tone,
          compact,
          variant,
          className: cn(endIcon && 'pr-11', temporalIcon && 'premium-temporal-input', className),
        })}
        {...props}
      />
      {endIcon && (
        <Icon
          aria-hidden="true"
          icon={endIcon}
          size="sm"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary"
        />
      )}
    </div>
  )
}

export function PremiumDateInput(props: Omit<PremiumInputProps, 'type'>) {
  return <PremiumInput {...props} type="date" />
}

export function PremiumTimeInput(props: Omit<PremiumInputProps, 'type'>) {
  return <PremiumInput {...props} type="time" />
}

type PremiumSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  tone?: PremiumControlTone
  compact?: boolean
  variant?: PremiumControlVariant
  containerClassName?: string
}

export function PremiumSelect({
  tone,
  compact,
  variant,
  className,
  containerClassName,
  children,
  ...props
}: PremiumSelectProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <select
        className={premiumControlClass({
          tone,
          compact,
          variant,
          className: cn('appearance-none pr-11', className),
        })}
        {...props}
      >
        {children}
      </select>
      <Icon
        aria-hidden="true"
        icon="expand_more"
        size="sm"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary"
      />
    </div>
  )
}

type PremiumTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  tone?: PremiumControlTone
  compact?: boolean
  variant?: PremiumControlVariant
}

export function PremiumTextarea({
  tone,
  compact,
  variant,
  className,
  ...props
}: PremiumTextareaProps) {
  return (
    <textarea
      className={premiumControlClass({
        tone,
        compact,
        variant,
        className: cn('min-h-24 resize-y', className),
      })}
      {...props}
    />
  )
}
