import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { PremiumInput } from '../components/ui/PremiumFormControls'
import { useTheme } from '../context/ThemeContext'
import { useBodyMap } from '../context/BodyMapContext'

type View = 'Front' | 'Back' | 'Left' | 'Right'
type Severity = 'Mild' | 'Moderate' | 'Severe'

interface SelectedArea {
  id: string
  label: string
  severity: Severity
  notes: string
}

const bodyRegions: { id: string; label: string; top: string; left?: string; right?: string; width: string; height: string; rounded: string; rotate?: string }[] = [
  { id: 'head', label: 'Head', top: '10%', left: '50%', width: 'w-16', height: 'h-16', rounded: 'rounded-full' },
  { id: 'chest', label: 'Chest', top: '28%', left: '50%', width: 'w-20', height: 'h-20', rounded: 'rounded-[2rem]' },
  { id: 'abdomen', label: 'Abdomen', top: '45%', left: '50%', width: 'w-20', height: 'h-20', rounded: 'rounded-[2rem]' },
  { id: 'left-arm', label: 'Left Arm', top: '35%', left: '25%', width: 'w-12', height: 'h-24', rounded: 'rounded-full', rotate: 'rotate-12' },
  { id: 'right-arm', label: 'Right Arm', top: '35%', right: '25%', width: 'w-12', height: 'h-24', rounded: 'rounded-full', rotate: '-rotate-12' },
  { id: 'upper-back', label: 'Upper Back', top: '25%', left: '50%', width: 'w-24', height: 'h-16', rounded: 'rounded-[2rem]' },
  { id: 'lower-back', label: 'Lower Back', top: '42%', left: '50%', width: 'w-20', height: 'h-16', rounded: 'rounded-[1.5rem]' },
  { id: 'left-leg', label: 'Left Leg', top: '65%', left: '38%', width: 'w-14', height: 'h-32', rounded: 'rounded-full' },
  { id: 'right-leg', label: 'Right Leg', top: '65%', right: '38%', width: 'w-14', height: 'h-32', rounded: 'rounded-full' },
]

const frontRegions = ['head', 'chest', 'abdomen', 'left-arm', 'right-arm']
const backRegions = ['upper-back', 'lower-back', 'left-leg', 'right-leg']

export default function BodyMap() {
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState<View>('Front')
  const { theme } = useTheme()
  const { setSelectedAreas: setContextAreas } = useBodyMap()
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([])
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)

  const visibleRegions = currentView === 'Front' || currentView === 'Left' ? frontRegions : backRegions

  const handleRegionClick = (regionId: string) => {
    const region = bodyRegions.find((r) => r.id === regionId)
    if (!region) return

    const existing = selectedAreas.find((a) => a.id === regionId)
    if (existing) {
      setSelectedRegionId(regionId)
    } else {
      const newArea: SelectedArea = {
        id: regionId,
        label: region.label,
        severity: 'Moderate',
        notes: '',
      }
      setSelectedAreas([...selectedAreas, newArea])
      setSelectedRegionId(regionId)
    }
  }

  const removeArea = (regionId: string) => {
    setSelectedAreas(selectedAreas.filter((a) => a.id !== regionId))
    if (selectedRegionId === regionId) setSelectedRegionId(null)
  }

  const updateSeverity = (regionId: string, severity: Severity) => {
    setSelectedAreas(selectedAreas.map((a) => (a.id === regionId ? { ...a, severity } : a)))
  }

  const updateNotes = (regionId: string, notes: string) => {
    setSelectedAreas(selectedAreas.map((a) => (a.id === regionId ? { ...a, notes } : a)))
  }

  const clearAll = () => {
    setSelectedAreas([])
    setSelectedRegionId(null)
  }

  const views: View[] = ['Front', 'Back', 'Left', 'Right']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-gutter bg-black/40">
      <div
        className="bg-surface w-full max-w-[1200px] h-[90vh] min-h-0 md:min-h-[600px] max-h-[850px] rounded-[16px] shadow-2xl flex flex-col overflow-hidden relative border border-outline-variant/50"
        style={{
          animation: 'modalEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <style>{`
          @keyframes modalEnter { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(2); opacity: 0; } }
          .pin-pulse::before { content: ''; position: absolute; inset: -4px; border-radius: 50%; background-color: #2B3EF0; animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; z-index: -1; }
        `}</style>

        <div className="flex-none p-6 border-b border-surface-container-high bg-surface/80 backdrop-blur-md flex justify-between items-center z-10">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Where do you feel pain?</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Tap or click on the area where you feel pain</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors group">
              <Icon icon="close" size="xl" className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        <div className="flex-grow flex flex-col md:flex-row overflow-hidden z-0">
          <div className="flex-grow relative overflow-hidden bg-surface-container-lowest">
            <div className="absolute inset-0 pointer-events-none transition-all duration-500 bg-primary/5" />

            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-1 md:gap-2 bg-surface/80 backdrop-blur-md p-2 rounded-full border border-outline-variant/30 shadow-sm z-10">
              {views.map((view) => (
                <button
                  key={view}
                  className={`px-4 py-2 rounded-full text-label-md font-label-md transition-colors ${
                    currentView === view
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  onClick={() => setCurrentView(view)}
                >
                  {view}
                </button>
              ))}
              <div className="w-px h-6 bg-outline-variant mx-1" />
              <button
                className="px-3 py-2 rounded-full text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-1"
                onClick={() => setCurrentView('Front')}
              >
                <Icon icon="refresh" size="sm" />
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center relative">
              <img
                alt="3D Body Map Model"
                className={`object-contain h-[90%] transition-all duration-300 ${
                  theme === 'dark'
                    ? 'opacity-70 invert hue-rotate-180'
                    : 'opacity-80 grayscale mix-blend-multiply'
                }`}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlj_Htvuw9k3N4nx4y986R4bfcXOKNYlVosjS6GouThcYkH4JNDXPFWa5pzUXyAGBqMjPIlgDzVmwNbc3xoUZuLnw6Hau4-_afcrjdOZxk0eOiu--PuSep6FCHbqKA2BLzMq2rmr4YlMgTB2sfnpIzfhPcYofaEcKr2ylSHV8HLVaCdyrOtuZvl27BHMohirFZUVa1cJaAo5advHJ1DpP1QTQGIgnJ5mLTxLeTHMgZxvEG7YTerS998JA1Phvb7qrD2fGNQwHtbK0"
              />

              {visibleRegions.map((regionId) => {
                const region = bodyRegions.find((r) => r.id === regionId)!
                const isSelected = selectedAreas.some((a) => a.id === regionId)
                return (
                  <button
                    key={region.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${region.width} ${region.height} ${region.rounded} ${region.rotate || ''} transition-all cursor-pointer flex items-center justify-center backdrop-blur-sm ${
                      isSelected
                        ? 'bg-primary border-2 border-primary-container shadow-[0_0_20px_rgba(43,62,240,0.4)]'
                        : 'bg-primary-container/10 border-2 border-primary-container/30 hover:bg-primary-container/20 hover:border-primary-container'
                    }`}
                    style={{ top: region.top, left: region.left, right: region.right }}
                    onClick={() => handleRegionClick(region.id)}
                  >
                    {isSelected && <Icon icon="check" size="xl" className="text-on-primary" />}
                    {isSelected && <div className="absolute inset-[-4px] rounded-full bg-primary animate-ping opacity-0 pointer-events-none" style={{ animationDuration: '2s' }} />}
                  </button>
                )
              })}

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur-md rounded-full text-caption font-caption text-on-surface-variant border border-outline-variant/30 shadow-sm pointer-events-none">
                <Icon icon="360" size="sm" />
                Drag to rotate • Scroll to zoom
              </div>
            </div>
          </div>

          <div className="w-full md:w-[380px] flex-none flex flex-col border-l border-surface-container-high bg-surface overflow-hidden">
            <div className="p-6 border-b border-surface-container-high flex justify-between items-center bg-surface-container-lowest">
              <h2 className="font-label-md text-label-md text-on-surface font-bold">
                Selected Areas ({selectedAreas.length})
              </h2>
              {selectedAreas.length > 0 && (
                <button className="text-primary text-label-md font-label-md hover:underline" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>

            <div className="flex-grow overflow-y-auto p-4 bg-surface-container-lowest/50">
              {selectedAreas.length === 0 ? (
                <div className="text-center py-12 px-4 opacity-50">
                  <Icon icon="touch_app" size="2xl" className="text-outline mb-2" />
                  <p className="text-label-md font-label-md text-on-surface-variant">Tap the 3D model to select areas</p>
                </div>
              ) : (
                selectedAreas.map((area) => (
                  <div key={area.id} className="bg-surface rounded-[16px] border border-outline-variant/40 p-4 shadow-sm mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {area.label}
                      </h3>
                      <button className="text-secondary hover:text-error transition-colors" onClick={() => removeArea(area.id)}>
                        <Icon icon="delete" size="md" />
                      </button>
                    </div>
                    <div className="mb-4">
                      <p className="text-caption font-caption text-on-surface-variant mb-2">Severity</p>
                      <div className="flex bg-surface-container-high rounded-full p-1 gap-1">
                        {(['Mild', 'Moderate', 'Severe'] as Severity[]).map((sev) => (
                          <button
                            key={sev}
                            className={`flex-1 py-1.5 px-2 rounded-full text-caption font-caption transition-colors ${
                              area.severity === sev
                                ? 'bg-surface text-on-surface shadow-sm border border-outline-variant/20 font-medium'
                                : 'text-on-surface-variant hover:bg-surface'
                            }`}
                            onClick={() => updateSeverity(area.id, sev)}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <PremiumInput
                        compact
                        className="text-caption font-caption"
                        placeholder="Add notes (e.g. sharp, dull ache)..."
                        type="text"
                        value={area.notes}
                        onChange={(e) => updateNotes(area.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex-none p-6 border-t border-surface-container-high bg-surface z-10 flex justify-between items-center gap-4 rounded-b-[16px]">
          <div className="flex items-center gap-6">
            <button className="text-on-surface-variant font-label-md text-label-md hover:text-on-surface transition-colors font-medium" onClick={() => navigate('/')}>
              Skip
            </button>
            <div className="hidden sm:flex items-center gap-2 text-caption text-outline">
              <Icon icon="verified_user" size="sm" className="text-primary" />
              HIPAA Compliant
            </div>
          </div>
          <button
            className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-3 px-8 rounded-full transition-all duration-200 shadow-[0_4px_14px_0_rgba(0,27,212,0.2)] hover:shadow-[0_6px_20px_rgba(0,27,212,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2 font-medium"
            onClick={() => {
              setContextAreas(selectedAreas)
              navigate('/pinpoint-pain')
            }}
          >
            Confirm Pain Areas
            <Icon icon="arrow_forward" size="sm" />
          </button>
        </div>
      </div>
    </div>
  )
}
