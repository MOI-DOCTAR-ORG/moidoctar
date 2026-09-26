// Shared helpers for requesting the two browser permissions MoiDoctar actually uses:
// - geolocation, for Nearby Care (see LocalCareDiscovery.tsx)
// - notifications, for medication/triage reminders (see MedicationReminder.tsx)
//
// These wrap the native, callback-based browser APIs in a Promise so the onboarding tour
// and the Profile "App permissions" card can request both from a single button click and
// show the result, without duplicating each page's own permission-handling logic.

export type PermissionResult = 'granted' | 'approximate' | 'denied' | 'unsupported'

export interface CachedLocation {
  lat: number
  lng: number
  city?: string
  source: 'gps' | 'ip'
  timestamp: number
}

const LOCATION_STORAGE_KEY = 'moidoctar_user_location'

export function getCachedLocation(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedLocation
  } catch {
    return null
  }
}

export function setCachedLocation(loc: CachedLocation): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc))
  } catch {
    // ignore
  }
}

// Seamlessly fetches the user's approximate city and coordinates via IP
export async function fetchIpLocation(): Promise<CachedLocation> {
  const cached = getCachedLocation()
  if (cached && Date.now() - cached.timestamp < 2 * 60 * 60 * 1000) {
    return cached
  }

  try {
    const res = await fetch('https://ipwho.is/', { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const data = await res.json()
      if (data && data.success !== false && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const loc: CachedLocation = {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || data.region || 'Nearby',
          source: 'ip',
          timestamp: Date.now(),
        }
        setCachedLocation(loc)
        return loc
      }
    }
  } catch {
    // ignore
  }

  // Resilient regional default (Lagos) so nearby facilities always populate
  const defaultLoc: CachedLocation = {
    lat: 6.5244,
    lng: 3.3792,
    city: 'Lagos',
    source: 'ip',
    timestamp: Date.now(),
  }
  setCachedLocation(defaultLoc)
  return defaultLoc
}

// Checks whether the current document is blocked from using Geolocation by a Permissions-Policy
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
    let settled = false

    const resolveWith = (result: PermissionResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const fallbackToIp = async () => {
      try {
        await fetchIpLocation()
        resolveWith('approximate')
      } catch {
        resolveWith('denied')
      }
    }

    // Safety fallback timer so users never hang waiting for a system prompt
    const timer = setTimeout(() => {
      fallbackToIp()
    }, 5000)

    if (!('geolocation' in navigator)) {
      clearTimeout(timer)
      fallbackToIp()
      return
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer)
          setCachedLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            source: 'gps',
            timestamp: Date.now(),
          })
          resolveWith('granted')
        },
        () => {
          clearTimeout(timer)
          fallbackToIp()
        },
        { timeout: 4000, enableHighAccuracy: false }
      )
    } catch {
      clearTimeout(timer)
      fallbackToIp()
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
export async function getPermissionState(name: 'geolocation' | 'notifications'): Promise<
  'granted' | 'approximate' | 'denied' | 'prompt' | 'unsupported' | 'unknown'
> {
  if (name === 'geolocation') {
    const cached = getCachedLocation()
    if (cached) {
      return cached.source === 'gps' ? 'granted' : 'approximate'
    }
    if (!('geolocation' in navigator)) return 'unsupported'
  }
  if (name === 'notifications' && !('Notification' in window)) return 'unsupported'
  if (name === 'notifications' && 'Notification' in window) {
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
