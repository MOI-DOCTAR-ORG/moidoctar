// Shared helpers for requesting the two browser permissions MoiDoctar actually uses:
// - geolocation, for Nearby Care (see LocalCareDiscovery.tsx)
// - notifications, for medication/triage reminders (see MedicationReminder.tsx)
//
// These wrap the native, callback-based browser APIs in a Promise so the onboarding tour
// and the Profile "App permissions" card can request both from a single button click and
// show the result, without duplicating each page's own permission-handling logic.

export type PermissionResult = 'granted' | 'denied' | 'unsupported'

export function requestLocationPermission(): Promise<PermissionResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve('unsupported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'unsupported'),
      { timeout: 10000 }
    )
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
  'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'
> {
  if (name === 'geolocation' && !('geolocation' in navigator)) return 'unsupported'
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
