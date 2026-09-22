import type { CSSProperties, HTMLAttributes } from 'react'

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  icon: string
  className?: string
  size?: IconSize
}

function getLocalIcon(icon: string) {
  switch (icon) {
    case 'arrow_back':
      return <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
    case 'badge':
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M9 9h6M9 15h6" />
          <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </>
      )
    case 'check_circle':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.5 12.2 2.2 2.2 4.9-5.1" />
        </>
      )
    case 'ecg_heart':
      return (
        <>
          <path d="M12 20s-7-4.3-8.7-9.2C2.3 7.6 4.2 5 7.1 5c1.8 0 3.1 1 4 2.3C12 6 13.3 5 15.1 5c2.9 0 4.8 2.6 3.8 5.8C17.3 15.7 12 20 12 20Z" />
          <path d="M4 12h3l1.5-2.7 2.3 5.5 1.8-3.3H20" />
        </>
      )
    case 'encrypted':
      return (
        <>
          <path d="M12 3.5 19 6v5.2c0 4.4-2.8 7.6-7 9.3-4.2-1.7-7-4.9-7-9.3V6l7-2.5Z" />
          <rect x="8.5" y="11" width="7" height="4.8" rx="1.2" />
          <path d="M10 11V9.4a2 2 0 0 1 4 0V11" />
        </>
      )
    case 'error':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.8v5.1" />
          <circle cx="12" cy="16.4" r="1" fill="currentColor" stroke="none" />
        </>
      )
    case 'health_and_safety':
      return (
        <>
          <path d="M12 3.5 19 6v5.4c0 4.2-2.8 7.4-7 9.1-4.2-1.7-7-4.9-7-9.1V6l7-2.5Z" />
          <path d="M12 8v7M8.5 11.5h7" />
        </>
      )
    case 'clinical_notes':
      return (
        <>
          <path d="M8 4.5h8M9 3.5h6v3H9z" />
          <rect x="5" y="5.5" width="14" height="16" rx="2.5" />
          <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
        </>
      )
    case 'lock':
      return (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2.4" />
          <path d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10" />
        </>
      )
    case 'mail':
      return (
        <>
          <rect x="4" y="6" width="16" height="12" rx="2.5" />
          <path d="m5.5 8 6.5 5 6.5-5" />
        </>
      )
    case 'monitor_heart':
      return (
        <>
          <rect x="4" y="5" width="16" height="12" rx="2.5" />
          <path d="M8 11h2l1.2-2.3 2 5 1.3-2.7H17" />
          <path d="M9 20h6M12 17v3" />
        </>
      )
    case 'medical_services':
      return (
        <>
          <rect x="4" y="7" width="16" height="13" rx="2.5" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M12 10.5v6M9 13.5h6" />
        </>
      )
    case 'medication':
      return (
        <>
          <path d="m5.8 14.2 8.4-8.4a3.1 3.1 0 0 1 4.4 4.4l-8.4 8.4a3.1 3.1 0 0 1-4.4-4.4Z" />
          <path d="m10 10 4 4" />
          <path d="M15.5 19.2c1.9.8 3.8.4 5-1.3" />
        </>
      )
    case 'pin':
      return (
        <>
          <rect x="5" y="4" width="14" height="16" rx="3" />
          <path d="M9 9h.01M12 9h.01M15 9h.01M9 13h.01M12 13h.01M15 13h.01" />
        </>
      )
    case 'schedule':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5l3.5 2" />
        </>
      )
    case 'shield_lock':
      return (
        <>
          <path d="M12 3.5 19 6v5.3c0 4.3-2.8 7.5-7 9.2-4.2-1.7-7-4.9-7-9.2V6l7-2.5Z" />
          <rect x="8.8" y="11.2" width="6.4" height="4.5" rx="1.1" />
          <path d="M10.2 11.2V9.8a1.8 1.8 0 0 1 3.6 0v1.4" />
        </>
      )
    case 'verified_user':
      return (
        <>
          <path d="M12 3.5 19 6v5.3c0 4.3-2.8 7.5-7 9.2-4.2-1.7-7-4.9-7-9.2V6l7-2.5Z" />
          <path d="m8.7 12.2 2.1 2.1 4.6-4.8" />
        </>
      )
    case 'visibility':
      return (
        <>
          <path d="M3.5 12s3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3 5.5-8.5 5.5S3.5 12 3.5 12Z" />
          <circle cx="12" cy="12" r="2.6" />
        </>
      )
    case 'visibility_off':
      return (
        <>
          <path d="M4 4 20 20" />
          <path d="M9.5 6.9A8.8 8.8 0 0 1 12 6.5c5.5 0 8.5 5.5 8.5 5.5a13.7 13.7 0 0 1-3 3.5" />
          <path d="M14.1 14.1A2.7 2.7 0 0 1 9.9 9.9" />
          <path d="M6.6 8.4A14 14 0 0 0 3.5 12s3 5.5 8.5 5.5c1 0 2-.2 2.8-.5" />
        </>
      )
    default:
      return null
  }
}

export default function Icon({ icon, className = '', size = 'md', style, ...props }: IconProps) {
  const iconStyle: CSSProperties = {
    ...style,
    fontVariationSettings: "'FILL' 1",
    fontSize: `var(--icon-${size})`,
    fontWeight: 'inherit',
  }
  const localIcon = getLocalIcon(icon)

  if (localIcon) {
    return (
      <span
        className={`app-svg-icon ${className}`}
        data-icon={icon}
        style={iconStyle}
        {...props}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        >
          {localIcon}
        </svg>
      </span>
    )
  }

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      data-icon={icon}
      style={iconStyle}
      {...props}
    >
      {icon}
    </span>
  )
}
