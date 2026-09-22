function getCurrentUserEmail(): string {
  try {
    return localStorage.getItem('doctarr_current_user_email') || ''
  } catch {
    return ''
  }
}

function hashEmail(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function scopeKey(key: string): string {
  const email = getCurrentUserEmail()
  if (!email) return key
  return `${key}_${hashEmail(email)}`
}
