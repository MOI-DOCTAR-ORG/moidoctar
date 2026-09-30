import type { BackendUser } from '../context/AuthContext'

/**
 * One place that decides how the signed-in person is named and pictured, so the
 * header, greeting, chat avatar and Profile can't each guess differently.
 *
 * Source of truth: the backend account (`user.userName`, `user.email`, `user.photo`).
 * Profile edits are saved to that account, and the saved copy is pushed back into
 * AuthContext, so everything reading from here updates together.
 */

function emailLocalPart(email?: string | null): string {
  return (email ?? '').split('@')[0].trim().toLowerCase()
}

/**
 * True when `name` isn't a name anyone chose: empty, the backend's "User" default,
 * or the email's local part (what Google sign-in stored when Google sent no name).
 */
export function isPlaceholderName(name: string | null | undefined, email?: string | null): boolean {
  const n = (name ?? '').trim().toLowerCase()
  if (!n || n === 'user') return true
  const local = emailLocalPart(email)
  return !!local && n === local
}

/** The person's full name, or '' when only a placeholder is known. */
export function getDisplayName(user: Pick<BackendUser, 'userName' | 'email'> | null | undefined): string {
  if (!user || isPlaceholderName(user.userName, user.email)) return ''
  return user.userName.trim().replace(/\s+/g, ' ')
}

/** First word of a name, or '' if it doesn't look like a name (no letters). */
export function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  return /\p{L}/u.test(first) ? first : ''
}

/** Up to two initials for an avatar; 'U' when there's no usable name. */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  const first = parts[0][0].toUpperCase()
  if (parts.length === 1) return first
  return `${first}${parts[parts.length - 1][0].toUpperCase()}`
}

/** The account's login email. Read-only everywhere in the app. */
export function getAccountEmail(user: Pick<BackendUser, 'email'> | null | undefined): string {
  return user?.email?.trim() ?? ''
}

/** The saved profile picture URL, or null. */
export function getProfileImage(user: Pick<BackendUser, 'photo'> | null | undefined): string | null {
  return user?.photo || null
}
