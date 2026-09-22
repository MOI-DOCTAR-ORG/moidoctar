import { scopeKey } from './storage'

export function getUserInitials(): string {
  try {
    const name = localStorage.getItem(scopeKey('doctarr_name'))
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'U'
    if (parts.length === 1) return parts[0][0].toUpperCase()
    const first = parts[0][0].toUpperCase()
    const last = parts[parts.length - 1][0].toUpperCase()
    return `${first}${last}`
  } catch {
    return 'U'
  }
}
