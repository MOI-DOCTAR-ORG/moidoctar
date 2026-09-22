import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'

interface Facility {
  id: string
  name: string
  type: 'hospital' | 'clinic' | 'pharmacy' | 'emergency'
  address: string
  phone: string
  distance: string
  rating: number
  openNow: boolean
  dataProvenance: 'current' | 'verified' | 'prototype'
  specialties?: string[]
}

const sampleFacilities: Facility[] = [
  {
    id: '1',
    name: 'General Hospital',
    type: 'hospital',
    address: '123 Medical Center Drive',
    phone: '+1-555-0100',
    distance: '0.8 mi',
    rating: 4.5,
    openNow: true,
    dataProvenance: 'verified',
    specialties: ['Emergency', 'Cardiology', 'Neurology', 'Orthopedics'],
  },
  {
    id: '2',
    name: 'City Health Clinic',
    type: 'clinic',
    address: '456 Health Avenue',
    phone: '+1-555-0200',
    distance: '1.2 mi',
    rating: 4.2,
    openNow: true,
    dataProvenance: 'current',
    specialties: ['General Practice', 'Pediatrics', 'Dermatology'],
  },
  {
    id: '3',
    name: '24/7 Emergency Center',
    type: 'emergency',
    address: '789 Emergency Lane',
    phone: '+1-555-0911',
    distance: '1.5 mi',
    rating: 4.8,
    openNow: true,
    dataProvenance: 'verified',
    specialties: ['Emergency', 'Trauma', 'Critical Care'],
  },
  {
    id: '4',
    name: 'MedPlus Pharmacy',
    type: 'pharmacy',
    address: '321 Wellness Street',
    phone: '+1-555-0300',
    distance: '0.3 mi',
    rating: 4.0,
    openNow: true,
    dataProvenance: 'current',
    specialties: ['Prescription', 'OTC Medications', 'Vaccinations'],
  },
  {
    id: '5',
    name: 'Community Health Center',
    type: 'clinic',
    address: '555 Community Road',
    phone: '+1-555-0400',
    distance: '2.1 mi',
    rating: 4.3,
    openNow: false,
    dataProvenance: 'prototype',
    specialties: ['General Practice', 'Mental Health', 'Laboratory'],
  },
  {
    id: '6',
    name: 'PharmaCare Drugstore',
    type: 'pharmacy',
    address: '888 Medicine Boulevard',
    phone: '+1-555-0500',
    distance: '0.7 mi',
    rating: 4.1,
    openNow: true,
    dataProvenance: 'current',
    specialties: ['Prescription', 'Health Supplements', 'Medical Devices'],
  },
]

const facilityTypeConfig = {
  hospital: { icon: 'local_hospital', color: 'text-blue-500', bg: 'bg-blue-500/15', border: 'border-blue-500/20', label: 'Hospital' },
  clinic: { icon: 'medical_services', color: 'text-green-500', bg: 'bg-green-500/15', border: 'border-green-500/20', label: 'Clinic' },
  pharmacy: { icon: 'medication', color: 'text-purple-500', bg: 'bg-purple-500/15', border: 'border-purple-500/20', label: 'Pharmacy' },
  emergency: { icon: 'emergency', color: 'text-red-500', bg: 'bg-red-500/15', border: 'border-red-500/20', label: 'Emergency' },
}

const provenanceLabels = {
  current: { text: 'Current', color: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20' },
  verified: { text: 'Verified', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  prototype: { text: 'Prototype Data', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' },
}

export default function LocalCareDiscovery() {
  const navigate = useNavigate()
  const { addSession } = useAuth()
  const [facilities] = useState<Facility[]>(sampleFacilities)
  const [filter, setFilter] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy' | 'emergency'>('all')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        () => {
          setLocationError('Location access denied. Showing sample facilities.')
        }
      )
    }
  }, [])

  const filtered = filter === 'all' ? facilities : facilities.filter(f => f.type === filter)

  return (
    <main className="min-h-[100dvh] p-4 md:p-6 max-w-container-max-width mx-auto bg-background text-on-surface font-body-md">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-secondary mb-2">
            <button onClick={() => navigate('/')} className="text-caption font-caption hover:text-[var(--neon-primary)] transition-colors">Dashboard</button>
            <Icon icon="chevron_right" size="sm" />
            <span className="text-caption font-caption text-[var(--neon-primary)] font-bold">Nearby Care</span>
          </nav>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Find Nearby Care</h2>
          <p className="text-body-md text-secondary mt-1">Locate healthcare facilities and resources near you</p>
        </div>
        {userLocation && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-caption text-green-600 dark:text-green-400">
            <Icon icon="my_location" size="sm" />
            Location Active
          </div>
        )}
      </header>

      {locationError && (
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
                  ? 'bg-[var(--neon-primary)] text-white shadow-[0_0_12px_var(--neon-primary)]'
                  : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-secondary hover:border-[var(--neon-primary)]/30'
              }`}
            >
              <Icon icon={config.icon} size="sm" />
              {type === 'all' ? 'All' : facilityTypeConfig[type].label}
            </button>
          )
        })}
      </div>

      {/* Facility List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((facility) => {
          const typeConfig = facilityTypeConfig[facility.type]
          const provLabel = provenanceLabels[facility.dataProvenance]
          return (
            <div
              key={facility.id}
              className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] p-5 hover:border-[var(--neon-primary)]/20 transition-all hover:shadow-[0_0_20px_rgba(148,197,253,0.08)]"
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
                  <Icon icon="near_me" size="sm" className="text-[var(--neon-primary)]" />
                  {facility.distance}
                </span>
                <span className="flex items-center gap-1">
                  <Icon icon="star" size="sm" className="text-amber-400" />
                  {facility.rating}
                </span>
                <span className={`flex items-center gap-1 ${facility.openNow ? 'text-green-500' : 'text-red-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${facility.openNow ? 'bg-green-500' : 'bg-red-500'}`} />
                  {facility.openNow ? 'Open Now' : 'Closed'}
                </span>
              </div>

              {facility.specialties && facility.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {facility.specialties.map((spec) => (
                    <span key={spec} className="px-2 py-0.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full text-[11px] text-secondary">
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <a
                  href={`tel:${facility.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--neon-primary)]/10 border border-[var(--neon-primary)]/20 rounded-xl text-[var(--neon-primary)] font-label-md text-label-md font-bold hover:bg-[var(--neon-primary)]/15 transition-all min-h-[44px]"
                >
                  <Icon icon="call" size="sm" />
                  Call
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[var(--glass-border)] rounded-xl text-secondary font-label-md text-label-md font-bold hover:border-[var(--neon-primary)]/30 hover:text-on-surface transition-all min-h-[44px]"
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
            <p className="text-caption text-secondary">Call emergency services immediately</p>
          </div>
        </div>
        <a
          href="tel:911"
          className="w-full sm:w-auto sm:ml-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Icon icon="call" size="md" />
          Call 911
        </a>
      </div>
    </main>
  )
}
