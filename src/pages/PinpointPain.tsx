import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useBodyMap } from '../context/BodyMapContext'

interface BodyRegion {
  id: string
  label: string
  view: 'anterior' | 'posterior'
  top: string
  left?: string
  right?: string
  width: string
  height: string
  rounded: string
  rotate?: string
}

const bodyRegions: BodyRegion[] = [
  { id: 'head', label: 'Head', view: 'anterior', top: '10%', left: '50%', width: 'w-16', height: 'h-16', rounded: 'rounded-full' },
  { id: 'chest', label: 'Chest', view: 'anterior', top: '28%', left: '50%', width: 'w-20', height: 'h-20', rounded: 'rounded-[2rem]' },
  { id: 'abdomen', label: 'Abdomen', view: 'anterior', top: '45%', left: '50%', width: 'w-20', height: 'h-20', rounded: 'rounded-[2rem]' },
  { id: 'left-arm', label: 'Left Arm', view: 'anterior', top: '35%', left: '25%', width: 'w-12', height: 'h-24', rounded: 'rounded-full', rotate: 'rotate-12' },
  { id: 'right-arm', label: 'Right Arm', view: 'anterior', top: '35%', right: '25%', width: 'w-12', height: 'h-24', rounded: 'rounded-full', rotate: '-rotate-12' },
  { id: 'upper-back', label: 'Upper Back', view: 'posterior', top: '25%', left: '50%', width: 'w-24', height: 'h-16', rounded: 'rounded-[2rem]' },
  { id: 'lower-back', label: 'Lower Back', view: 'posterior', top: '42%', left: '50%', width: 'w-20', height: 'h-16', rounded: 'rounded-[1.5rem]' },
  { id: 'left-leg-back', label: 'Left Leg', view: 'posterior', top: '65%', left: '38%', width: 'w-14', height: 'h-32', rounded: 'rounded-full' },
  { id: 'right-leg-back', label: 'Right Leg', view: 'posterior', top: '65%', right: '38%', width: 'w-14', height: 'h-32', rounded: 'rounded-full' },
]

export default function PinpointPain() {
  const navigate = useNavigate()
  const { setSelectedAreas } = useBodyMap()
  const [selected, setSelected] = useState<string[]>([])

  const toggleRegion = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    const areas = selected.map(id => {
      const region = bodyRegions.find(r => r.id === id)
      return {
        id,
        label: region?.label || id,
        severity: 'Moderate' as const,
        notes: '',
      }
    })
    setSelectedAreas(areas)
    navigate('/new-triage')
  }

  const anteriorRegions = bodyRegions.filter((r) => r.view === 'anterior')
  const posteriorRegions = bodyRegions.filter((r) => r.view === 'posterior')

  const renderBodyMap = (regions: BodyRegion[], imageSrc: string, alt: string, flipped?: boolean) => (
    <div className="flex flex-col items-center h-full">
      <div className="bg-surface-container py-2 px-6 rounded-full mb-6 border border-surface-container-high">
        <h2 className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
          {flipped ? 'Posterior (Back)' : 'Anterior (Front)'}
        </h2>
      </div>
      <div className="relative w-full max-w-[400px] flex-grow min-h-[400px] bg-surface-container-lowest rounded-2xl flex items-center justify-center">
        <img
          alt={alt}
          className={`object-contain w-full h-full opacity-60 mix-blend-multiply drop-shadow-sm grayscale contrast-125 ${flipped ? 'scale-x-[-1]' : ''}`}
          src={imageSrc}
        />
        <div className="absolute inset-0">
          {regions.map((region) => {
            const isSelected = selected.includes(region.id)
            return (
              <button
                key={region.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${region.width} ${region.height} ${region.rounded} ${region.rotate || ''} transition-all cursor-pointer flex items-center justify-center backdrop-blur-sm ${
                  isSelected
                    ? 'bg-primary border-2 border-primary-container shadow-[0_0_20px_rgba(43,62,240,0.4)]'
                    : 'bg-primary-container/10 border-2 border-primary-container/30 hover:bg-primary-container/20 hover:border-primary-container'
                }`}
                style={{ top: region.top, left: region.left, right: region.right }}
                onClick={() => toggleRegion(region.id)}
              >
                {isSelected && <Icon icon="check" size="xl" className="text-on-primary" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-on-background/40 backdrop-blur-[4px] z-50 flex items-center justify-center p-4 md:p-gutter">
      <div
        className="bg-surface w-full max-w-container-max-width md:w-11/12 h-auto min-h-[500px] md:h-[870px] rounded-[24px] shadow-2xl flex flex-col overflow-hidden relative border border-outline-variant/50"
        style={{ animation: 'modalEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <style>{`
          @keyframes modalEnter { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        `}</style>

        <div className="flex-none p-6 md:p-8 border-b border-surface-container-high bg-surface/80 backdrop-blur-md flex justify-between items-start z-10">
          <div className="max-w-2xl">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Pinpoint Your Pain</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
              Tap the regions on the body map to specify the location of your symptoms.
            </p>
          </div>
          <button className="p-3 text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors group" onClick={() => navigate('/body-map')}>
            <Icon icon="close" size="xl" className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 md:p-8 bg-surface-container-lowest z-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 h-full max-w-5xl mx-auto">
            {renderBodyMap(
              anteriorRegions,
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBlj_Htvuw9k3N4nx4y986R4bfcXOKNYlVosjS6GouThcYkH4JNDXPFWa5pzUXyAGBqMjPIlgDzVmwNbc3xoUZuLnw6Hau4-_afcrjdOZxk0eOiu--PuSep6FCHbqKA2BLzMq2rmr4YlMgTB2sfnpIzfhPcYofaEcKr2ylSHV8HLVaCdyrOtuZvl27BHMohirFZUVa1cJaAo5advHJ1DpP1QTQGIgnJ5mLTxLeTHMgZxvEG7YTerS998JA1Phvb7qrD2fGNQwHtbK0',
              'Front Body Map Model'
            )}
            {renderBodyMap(
              posteriorRegions,
              'https://lh3.googleusercontent.com/aida-public/AB6AXuB0avWUXBYD4B6oSYI_6U5nEC-a-9ahQwGKecHADxv0ABrP5IdNy1N8r8oOC3TRycFSrcESULkh3zbZ2bxOcsOitWbA-If2sysSiJpwFzlifi2BAGgCTGJj-gyNPsJLVm0hBF5qWhemdJzcyv6zfWKDf0PmlQyhj2sipfExnKiedYthB3yT7smqCzG01iv4LCFmE4vt_2R1BpKyJu7RFw4EE3ajT8h5UjmwzYvitpcoY5-orWstl3PbZdl5hVnvjVJz1Uqo9YMfvzw',
              'Back Body Map Model',
              true
            )}
          </div>
        </div>

        <div className="flex-none p-6 md:p-8 border-t border-surface-container-high bg-surface z-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 order-2 md:order-1 bg-surface-container-low px-4 py-2 rounded-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              {selected.length} Region{selected.length !== 1 ? 's' : ''} Selected
            </span>
          </div>
          <button className="order-1 md:order-2 w-full md:w-auto bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-md text-label-md py-4 px-10 rounded-full transition-all duration-200 shadow-[0_4px_14px_0_rgba(0,27,212,0.39)] hover:shadow-[0_6px_20px_rgba(0,27,212,0.23)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2" onClick={handleConfirm}>
            Confirm Location
            <Icon icon="arrow_forward" size="sm" />
          </button>
        </div>
      </div>
    </div>
  )
}
