import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { SkeletonLine } from '../components/Skeleton'
import { getCachedLocation, setCachedLocation, fetchIpLocation } from '../utils/permissions'

interface Facility {
  id: string
  name: string
  type: 'hospital' | 'clinic' | 'pharmacy' | 'emergency'
  address: string
  phone: string
  distance: string
  distanceKm: number
  rating: number | null
  openNow: boolean | null
  dataProvenance: 'current' | 'prototype'
  specialties?: string[]
  lat?: number
  lng?: number
}

// Fallback demo data — only shown when we don't have (or couldn't use) the
// user's real location, so it's always labeled clearly as sample data rather
// than presented as if it were nearby.
const sampleFacilities: Facility[] = [
  {
    id: 'sample-1', name: 'General Hospital', type: 'hospital', address: '123 Medical Center Drive',
    phone: '+1-555-0100', distance: '0.8 mi', distanceKm: 1.3, rating: 4.5, openNow: true,
    dataProvenance: 'prototype', specialties: ['Emergency', 'Cardiology', 'Neurology', 'Orthopedics'],
  },
  {
    id: 'sample-2', name: 'City Health Clinic', type: 'clinic', address: '456 Health Avenue',
    phone: '+1-555-0200', distance: '1.2 mi', distanceKm: 1.9, rating: 4.2, openNow: true,
    dataProvenance: 'prototype', specialties: ['General Practice', 'Pediatrics', 'Dermatology'],
  },
  {
    id: 'sample-3', name: '24/7 Emergency Center', type: 'emergency', address: '789 Emergency Lane',
    phone: '+1-555-0911', distance: '1.5 mi', distanceKm: 2.4, rating: 4.8, openNow: true,
    dataProvenance: 'prototype', specialties: ['Emergency', 'Trauma', 'Critical Care'],
  },
  {
    id: 'sample-4', name: 'MedPlus Pharmacy', type: 'pharmacy', address: '321 Wellness Street',
    phone: '+1-555-0300', distance: '0.3 mi', distanceKm: 0.5, rating: 4.0, openNow: true,
    dataProvenance: 'prototype', specialties: ['Prescription', 'OTC Medications', 'Vaccinations'],
  },
  {
    id: 'sample-5', name: 'Community Health Center', type: 'clinic', address: '555 Community Road',
    phone: '+1-555-0400', distance: '2.1 mi', distanceKm: 3.4, rating: 4.3, openNow: false,
    dataProvenance: 'prototype', specialties: ['General Practice', 'Mental Health', 'Laboratory'],
  },
  {
    id: 'sample-6', name: 'PharmaCare Drugstore', type: 'pharmacy', address: '888 Medicine Boulevard',
    phone: '+1-555-0500', distance: '0.7 mi', distanceKm: 1.1, rating: 4.1, openNow: true,
    dataProvenance: 'prototype', specialties: ['Prescription', 'Health Supplements', 'Medical Devices'],
  },
]

// --- Live lookup via OpenStreetMap Overpass (no API key required) ---

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const SEARCH_RADIUS_METERS = 6000

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function classifyType(tags: Record<string, string>): Facility['type'] {
  if (tags.emergency === 'yes' || tags.healthcare === 'emergency') return 'emergency'
  if (tags.amenity === 'pharmacy') return 'pharmacy'
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'hospital'
  return 'clinic'
}

// Quick-jump shortcuts for popular Nigerian metropolitan areas
export interface QuickArea {
  name: string
  lat: number
  lng: number
}

export const POPULAR_NIGERIAN_AREAS: QuickArea[] = [
  { name: 'Ikeja', lat: 6.6018, lng: 3.3515 },
  { name: 'Lekki / VI', lat: 6.4311, lng: 3.4682 },
  { name: 'Yaba', lat: 6.5168, lng: 3.3857 },
  { name: 'Surulere', lat: 6.4969, lng: 3.3578 },
  { name: 'Lagos Island', lat: 6.4549, lng: 3.3986 },
  { name: 'Abuja (CBD)', lat: 9.0579, lng: 7.4951 },
  { name: 'Ibadan', lat: 7.3775, lng: 3.9470 },
  { name: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
  { name: 'Enugu', lat: 6.4584, lng: 7.5464 },
  { name: 'Kano', lat: 12.0022, lng: 8.5920 },
]

// Reverse geocode lat/lng to human-readable neighborhood/city name via Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return ''
    const data = (await res.json()) as {
      display_name?: string
      address?: Record<string, string>
    }
    if (data && data.address) {
      const a = data.address
      const neighborhood = a.suburb || a.neighbourhood || a.village || a.residential || a.district
      const city = a.city || a.town || a.county || a.state
      if (neighborhood && city) return `${neighborhood}, ${city}`
      if (city) return city
    }
    if (data.display_name) {
      return data.display_name.split(',').slice(0, 2).join(', ')
    }
  } catch {
    // fallback gracefully
  }
  return ''
}

function formatAddress(tags: Record<string, string>, areaContext?: string): string {
  // 1. Look for explicit full address
  if (tags['addr:full']) return tags['addr:full']

  // 2. Look for street + number
  const streetPart =
    tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : tags['addr:street'] || tags['contact:street']

  const areaPart =
    tags['addr:suburb'] ||
    tags['suburb'] ||
    tags['addr:neighbourhood'] ||
    tags['neighbourhood'] ||
    tags['addr:place'] ||
    tags['addr:district']

  const cityPart = tags['addr:city'] || tags['city'] || tags['addr:state']

  const parts = [streetPart, areaPart, cityPart].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(', ')
  }

  // 3. Fallback to operator name if given
  if (tags.operator) {
    return `Operated by ${tags.operator}`
  }

  // 4. Fallback to searched/current neighborhood context
  if (areaContext) {
    const cleanArea = areaContext.replace(/\s*\((Approximate|GPS)\)/i, '').trim()
    return `${cleanArea} area • Coordinates mapped`
  }

  return 'Location mapped (tap Directions)'
}

// OSM opening_hours can be arbitrarily complex; we only confidently detect
// the common "always open" case and otherwise say "unknown" rather than guess.
function detectOpenNow(openingHours: string | undefined): boolean | null {
  if (!openingHours) return null
  if (openingHours.trim() === '24/7') return true
  return null
}

interface OverpassElement {
  id: number
  type: 'node' | 'way' | 'relation'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

async function fetchNearbyFacilities(lat: number, lng: number, areaContext?: string): Promise<Facility[]> {
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"~"^(hospital|clinic|pharmacy|doctors)$"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
      way["amenity"~"^(hospital|clinic|pharmacy|doctors)$"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
      node["healthcare"~"^(hospital|clinic|pharmacy|doctor)$"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
    );
    out center tags;
  `.trim()

  let lastError: unknown = null
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
      })
      if (!res.ok) throw new Error(`Overpass responded ${res.status}`)
      const data = (await res.json()) as { elements: OverpassElement[] }

      const facilities: Facility[] = data.elements
        .filter((el) => el.tags?.name)
        .map((el) => {
          const tags = el.tags as Record<string, string>
          const elLat = el.lat ?? el.center?.lat
          const elLon = el.lon ?? el.center?.lon
          const distanceKm = elLat != null && elLon != null ? haversineKm(lat, lng, elLat, elLon) : Infinity
          const phone = tags.phone || tags['contact:phone'] || ''
          return {
            id: `osm-${el.type}-${el.id}`,
            name: tags.name,
            type: classifyType(tags),
            address: formatAddress(tags, areaContext),
            phone,
            distance: distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`,
            distanceKm,
            rating: null,
            openNow: detectOpenNow(tags.opening_hours),
            dataProvenance: 'current' as const,
            specialties: tags.healthcare_speciality ? tags.healthcare_speciality.split(';') : undefined,
            lat: elLat,
            lng: elLon,
          }
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 24)

      return facilities
    } catch (err) {
      lastError = err
      continue // try the next mirror
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to reach facility lookup service')
}

const facilityTypeConfig = {
  hospital: { icon: 'local_hospital', color: 'text-primary', bg: 'bg-primary/15', border: 'border-primary/20', label: 'Hospital' },
  clinic: { icon: 'medical_services', color: 'text-green-500', bg: 'bg-green-500/15', border: 'border-green-500/20', label: 'Clinic' },
  pharmacy: { icon: 'medication', color: 'text-tertiary', bg: 'bg-tertiary/15', border: 'border-tertiary/20', label: 'Pharmacy' },
  emergency: { icon: 'emergency', color: 'text-red-500', bg: 'bg-red-500/15', border: 'border-red-500/20', label: 'Emergency' },
}

const provenanceLabels = {
  current: { text: 'Live (OpenStreetMap)', color: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20' },
  prototype: { text: 'Sample Data', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' },
}

// Geolocation permission states we distinguish in the UI. `navigator.permissions` isn't
// available everywhere (notably Safari for the geolocation permission itself), so we treat
// 'unknown' as "haven't asked yet, browser support unclear" rather than assuming denial.
type LocationPermissionState = 'unknown' | 'prompt' | 'granted' | 'approximate' | 'denied' | 'unsupported' | 'requesting'

export default function LocalCareDiscovery() {
  const navigate = useNavigate()
  const { addSession } = useAuth()
  const [facilities, setFacilities] = useState<Facility[]>(sampleFacilities)
  const [filter, setFilter] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy' | 'emergency'>('all')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false)
  const [locationPermission, setLocationPermission] = useState<LocationPermissionState>('unknown')

  const loadNearby = useCallback((lat: number, lng: number, areaContext?: string) => {
    setIsLoadingFacilities(true)
    setLocationError('')
    fetchNearbyFacilities(lat, lng, areaContext)
      .then((results) => {
        if (results.length === 0) {
          setLocationError('No listed facilities found nearby in OpenStreetMap. Showing sample facilities instead.')
          setFacilities(sampleFacilities)
        } else {
          setFacilities(results)
        }
      })
      .catch(() => {
        setLocationError('Could not reach the facility lookup service. Showing sample facilities.')
        setFacilities(sampleFacilities)
      })
      .finally(() => setIsLoadingFacilities(false))
  }, [])

  // Geocode an entered city or neighborhood name using OpenStreetMap Nominatim
  const handleSearchCity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    setIsSearchingLocation(true)
    setLocationError('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error('Location lookup failed')
      const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
      if (!results || results.length === 0) {
        setLocationError(`No locations found matching "${query}". Try searching by a larger city or nearby town.`)
        return
      }
      const lat = parseFloat(results[0].lat)
      const lng = parseFloat(results[0].lon)
      setUserLocation({ lat, lng })
      const name = results[0].display_name.split(',').slice(0, 2).join(', ')
      setLocationName(name)
      setLocationPermission('approximate')
      setCachedLocation({ lat, lng, city: name, source: 'ip', timestamp: Date.now() })
      loadNearby(lat, lng, name)
    } catch {
      setLocationError('Could not reach the location search service. Please try again.')
    } finally {
      setIsSearchingLocation(false)
    }
  }

  // Quick-select preset Nigerian cities / metropolitan areas
  const handleSelectArea = (area: QuickArea) => {
    setUserLocation({ lat: area.lat, lng: area.lng })
    setLocationName(area.name)
    setSearchQuery(area.name)
    setLocationPermission('approximate')
    setCachedLocation({ lat: area.lat, lng: area.lng, city: area.name, source: 'ip', timestamp: Date.now() })
    loadNearby(area.lat, area.lng, area.name)
  }

  // High-accuracy GPS request with reverse geocoding
  const requestPreciseGps = useCallback(() => {
    setLocationPermission('requesting')
    setLocationError('')

    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser. Please select an area below.')
      setLocationPermission('approximate')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setLocationPermission('granted')

        let areaLabel = 'Precise GPS'
        try {
          const resolved = await reverseGeocode(latitude, longitude)
          if (resolved) {
            areaLabel = `${resolved} (GPS)`
          }
        } catch {
          // ignore
        }

        setLocationName(areaLabel)
        const cleanName = areaLabel.replace(/\s*\(GPS\)$/, '')
        setCachedLocation({
          lat: latitude,
          lng: longitude,
          city: cleanName,
          source: 'gps',
          timestamp: Date.now(),
        })
        loadNearby(latitude, longitude, cleanName)
      },
      (err) => {
        let msg = 'Could not acquire precise GPS. Showing approximate area. Tap an area chip below to choose your neighborhood.'
        if (err.code === 1) {
          msg = 'Location permission was denied. Tap any popular area below to view local care.'
        } else if (err.code === 3) {
          msg = 'GPS acquisition timed out. Tap an area chip below to choose your neighborhood.'
        }
        setLocationError(msg)
        setLocationPermission('approximate')
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }, [loadNearby])

  // Triggers location request, falling back automatically to IP location
  const requestLocation = useCallback(() => {
    requestPreciseGps()
  }, [requestPreciseGps])

  // On mount: check cached location first, or auto-fetch IP location so the page is populated
  useEffect(() => {
    const cached = getCachedLocation()
    if (cached) {
      setUserLocation({ lat: cached.lat, lng: cached.lng })
      setLocationName(cached.city ? `${cached.city} (${cached.source === 'gps' ? 'GPS' : 'Approximate'})` : '')
      setLocationPermission(cached.source === 'gps' ? 'granted' : 'approximate')
      loadNearby(cached.lat, cached.lng, cached.city)
      return
    }

    // Auto-detect location via IP so the user immediately gets real care listings
    fetchIpLocation().then((ip) => {
      if (ip) {
        setUserLocation({ lat: ip.lat, lng: ip.lng })
        setLocationName(ip.city ? `${ip.city} (Approximate)` : 'Approximate')
        setLocationPermission('approximate')
        loadNearby(ip.lat, ip.lng, ip.city)
      }
    })
  }, [loadNearby])

  const filtered = filter === 'all' ? facilities : facilities.filter(f => f.type === filter)

  return (
    <main className="min-h-[100dvh] p-4 md:p-6 max-w-container-max-width mx-auto bg-background text-on-surface font-body-md">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-secondary mb-2">
            <button onClick={() => navigate('/dashboard')} className="text-caption font-caption hover:text-primary transition-colors">Dashboard</button>
            <Icon icon="chevron_right" size="sm" />
            <span className="text-caption font-caption text-primary font-bold">Nearby Care</span>
          </nav>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Find Nearby Care</h2>
          <p className="text-body-md text-secondary mt-1">Locate healthcare facilities and resources near you</p>
        </div>
        {userLocation && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-caption text-green-600 dark:text-green-400 font-bold">
              <Icon icon={locationPermission === 'granted' ? 'gps_fixed' : 'my_location'} size="sm" />
              {locationName || 'Location Active'}
            </div>
            {locationPermission === 'approximate' && (
              <button
                type="button"
                onClick={requestPreciseGps}
                className="px-3 py-1 bg-surface border border-outline-variant hover:border-primary/40 rounded-full text-caption text-secondary hover:text-primary transition-colors flex items-center gap-1 font-medium"
              >
                <Icon icon="gps_fixed" size="sm" />
                Use Precise GPS
              </button>
            )}
          </div>
        )}
      </header>

      {/* City / Area Search Form */}
      <form onSubmit={handleSearchCity} className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Icon icon="search" size="md" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search facilities by city or neighborhood (e.g. Ikeja, Lagos, Abuja)..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isSearchingLocation || !searchQuery.trim()}
          className="px-4 min-h-[44px] bg-primary text-on-primary rounded-xl text-label-md font-label-md font-bold hover:opacity-90 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5"
        >
          <Icon icon={isSearchingLocation ? 'hourglass_top' : 'near_me'} size="sm" />
          {isSearchingLocation ? 'Searching…' : 'Find Care'}
        </button>
      </form>

      {/* Quick Select Popular Nigerian Areas */}
      <div className="mb-5">
        <p className="text-caption text-secondary mb-2 flex items-center gap-1.5 font-medium">
          <Icon icon="explore" size="sm" className="text-primary" />
          Quick areas:
        </p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
          {POPULAR_NIGERIAN_AREAS.map((area) => {
            const isSelected = locationName.toLowerCase().includes(area.name.toLowerCase().split('/')[0].trim())
            return (
              <button
                key={area.name}
                type="button"
                onClick={() => handleSelectArea(area)}
                className={`px-3 py-1.5 rounded-full text-caption font-medium shrink-0 transition-all ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface border border-outline-variant text-secondary hover:border-primary/40 hover:text-on-surface'
                }`}
              >
                {area.name}
              </button>
            )
          })}
        </div>
      </div>

      {(locationPermission === 'prompt' || locationPermission === 'unknown' || locationPermission === 'requesting') && !userLocation && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Icon icon="location_on" size="lg" className="text-primary shrink-0" />
            <div>
              <p className="text-body-sm text-on-surface font-bold">Use GPS location</p>
              <p className="text-caption text-secondary">Find hospitals, clinics, and pharmacies closest to your current spot.</p>
            </div>
          </div>
          <button
            onClick={requestLocation}
            disabled={locationPermission === 'requesting'}
            className="px-4 min-h-[44px] bg-primary text-on-primary rounded-xl text-label-md font-label-md font-bold hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {locationPermission === 'requesting' ? 'Requesting…' : 'Enable Location'}
          </button>
        </div>
      )}

      {locationPermission === 'denied' && !userLocation && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Icon icon="warning" size="lg" className="text-amber-500 shrink-0" />
            <div>
              <p className="text-body-sm text-on-surface font-bold">Location access blocked</p>
              <p className="text-caption text-secondary">Enable it for this site in your browser settings, or use the city search above.</p>
            </div>
          </div>
          <button
            onClick={requestLocation}
            className="px-4 min-h-[44px] bg-surface border border-outline-variant text-on-surface rounded-xl text-label-md font-label-md font-bold hover:border-primary/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {locationError && locationPermission !== 'denied' && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-caption text-amber-600 dark:text-amber-400">
          <Icon icon="info" size="sm" />
          {locationError}
        </div>
      )}

      {/* Data Provenance Legend */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(provenanceLabels).map(([key, val]) => (
          <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-bold border ${val.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {val.text}
          </span>
        ))}
      </div>

      {facilities[0]?.dataProvenance === 'current' && (
        <p className="mb-4 text-caption text-secondary">
          Listings from OpenStreetMap contributors — details like phone number, hours, and
          rating may be incomplete or out of date. Always call ahead to confirm.
        </p>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'hospital', 'clinic', 'pharmacy', 'emergency'] as const).map((type) => {
          const config = type === 'all' ? { icon: 'apps', color: 'text-on-surface' } : facilityTypeConfig[type]
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-label-md font-label-md transition-all min-h-[44px] ${
                filter === type
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface border border-outline-variant text-secondary hover:border-primary/30'
              }`}
            >
              <Icon icon={config.icon} size="sm" />
              {type === 'all' ? 'All' : facilityTypeConfig[type].label}
            </button>
          )
        })}
      </div>

      {/* Facility List */}
      {isLoadingFacilities && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-outline-variant p-5 space-y-3">
              <SkeletonLine w="w-2/3" h="h-4" />
              <SkeletonLine w="w-1/2" />
              <SkeletonLine w="w-full" />
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isLoadingFacilities && filtered.map((facility) => {
          const typeConfig = facilityTypeConfig[facility.type]
          const provLabel = provenanceLabels[facility.dataProvenance]
          return (
            <div
              key={facility.id}
              className="bg-surface rounded-2xl border border-outline-variant p-5 hover:border-primary/20 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${typeConfig.bg} flex items-center justify-center`}>
                    <Icon icon={typeConfig.icon} size="lg" className={typeConfig.color} />
                  </div>
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface font-bold">{facility.name}</h3>
                    <p className="text-caption text-secondary">{facility.address}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${provLabel.color}`}>
                  {provLabel.text}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-3 text-caption text-secondary">
                <span className="flex items-center gap-1">
                  <Icon icon="near_me" size="sm" className="text-primary" />
                  {facility.distance}
                </span>
                {facility.rating != null && (
                  <span className="flex items-center gap-1">
                    <Icon icon="star" size="sm" className="text-amber-400" />
                    {facility.rating}
                  </span>
                )}
                {facility.openNow != null && (
                  <span className={`flex items-center gap-1 ${facility.openNow ? 'text-green-500' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${facility.openNow ? 'bg-green-500' : 'bg-red-500'}`} />
                    {facility.openNow ? 'Open Now' : 'Closed'}
                  </span>
                )}
              </div>

              {facility.specialties && facility.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {facility.specialties.map((spec) => (
                    <span key={spec} className="px-2 py-0.5 bg-surface border border-outline-variant rounded-full text-[11px] text-secondary">
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {facility.phone ? (
                  <a
                    href={`tel:${facility.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary font-label-md text-label-md font-bold hover:bg-primary/15 transition-all min-h-[44px]"
                  >
                    <Icon icon="call" size="sm" />
                    Call
                  </a>
                ) : (
                  <span className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-outline-variant rounded-xl text-secondary/60 font-label-md text-label-md min-h-[44px] cursor-not-allowed">
                    <Icon icon="call" size="sm" />
                    No number listed
                  </span>
                )}
                <a
                  href={
                    facility.lat && facility.lng
                      ? `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${facility.name} ${facility.address !== 'Location mapped (tap Directions)' ? facility.address : ''}`
                        )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-outline-variant rounded-xl text-secondary font-label-md text-label-md font-bold hover:border-primary/30 hover:text-on-surface transition-all min-h-[44px]"
                >
                  <Icon icon="directions" size="sm" />
                  Directions
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Emergency Banner */}
      <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Icon icon="emergency" size="lg" className="text-red-500" />
          </div>
          <div>
            <p className="font-label-md text-label-md text-red-600 dark:text-red-400 font-bold">Emergency?</p>
            <p className="text-caption text-secondary">Dial toll-free national or state emergency dispatch immediately</p>
          </div>
        </div>
        <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
          <a
            href="tel:112"
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Icon icon="call" size="md" />
            Call 112
          </a>
          <a
            href="tel:767"
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-surface border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <Icon icon="phone_in_talk" size="sm" />
            767 (Lagos)
          </a>
        </div>
      </div>
    </main>
  )
}
