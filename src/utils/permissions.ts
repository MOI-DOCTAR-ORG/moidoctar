// Shared helpers for requesting the two browser permissions MoiDoctar actually uses:
// - geolocation, for Nearby Care (see LocalCareDiscovery.tsx)
// - notifications, for medication/triage reminders (see MedicationReminder.tsx)
//
// These wrap the native, callback-based browser APIs in a Promise so the onboarding tour
// and the Profile "App permissions" card can request both from a single button click and
// show the result, without duplicating each page's own permission-handling logic.

export type PermissionResult = 'granted' | 'denied' | 'unsupported' | 'policy_blocked'

// Checks whether the current document is blocked from using Geolocation by a Permissions-Policy
// (e.g. inside an iframe without `allow="geolocation"` or an explicit HTTP Permissions-Policy header).
export function isLocationPolicyBlocked(): boolean {
  if (typeof document !== 'undefined') {
    const doc = document as unknown as {
      permissionsPolicy?: { allowsFeature?: (feature: string) => boolean }
      featurePolicy?: { allowsFeature?: (feature: string) => boolean }
    }
    const policy = doc.permissionsPolicy || doc.featurePolicy
    if (policy && typeof policy.allowsFeature === 'function') {
      try {
        if (!policy.allowsFeature('geolocation')) {
          return true
        }
      } catch {
        // ignore
      }
    }
  }
  return false
}

// Checks if the document is embedded inside an iframe (such as a dashboard preview or device frame).
export function isEmbeddedFrame(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    return true
  }
}

export function requestLocationPermission(): Promise<PermissionResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve('unsupported')
      return
    }

    if (isLocationPolicyBlocked()) {
      resolve('policy_blocked')
      return
    }

    try {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (err) => {
          const isPolicy =
            isLocationPolicyBlocked() ||
            (isEmbeddedFrame() && err.code === err.PERMISSION_DENIED) ||
            (err.message && /permissions[- ]policy|policy/i.test(err.message))

          if (isPolicy) {
            resolve('policy_blocked')
          } else if (err.code === err.PERMISSION_DENIED) {
            resolve('denied')
          } else {
            resolve('unsupported')
          }
        },
        { timeout: 10000, enableHighAccuracy: false }
      )
    } catch {
      if (isLocationPolicyBlocked() || isEmbeddedFrame()) {
        resolve('policy_blocked')
      } else {
        resolve('unsupported')
      }
    }
  })
}

export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (!('Notification' in window)) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

// Best-effort current state, for showing a status badge without triggering a prompt.
// `navigator.permissions` isn't available everywhere (notably Safari for geolocation), so
// 'unknown' means "can't tell yet", not "denied" - the caller should still offer the button.
export async function getPermissionState(name: 'geolocation' | 'notifications'): Promise<
  'granted' | 'denied' | 'prompt' | 'unsupported' | 'policy_blocked' | 'unknown'
> {
  if (name === 'geolocation') {
    if (!('geolocation' in navigator)) return 'unsupported'
    if (isLocationPolicyBlocked()) return 'policy_blocked'
  }
  if (name === 'notifications' && !('Notification' in window)) return 'unsupported'
  if (name === 'notifications' && 'Notification' in window) {
    // Notification.permission is synchronous and universally supported where Notification exists.
    const perm = Notification.permission
    return perm === 'default' ? 'prompt' : perm
  }
  if (!('permissions' in navigator) || !navigator.permissions?.query) return 'unknown'
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName })
    return status.state as 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unknown'
  }
}
