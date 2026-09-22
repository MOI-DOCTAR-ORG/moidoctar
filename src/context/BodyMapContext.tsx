import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type BodyArea = {
  id: string
  label: string
  severity: 'Mild' | 'Moderate' | 'Severe'
  notes: string
}

type BodyMapContextType = {
  selectedAreas: BodyArea[]
  setSelectedAreas: (areas: BodyArea[]) => void
  addArea: (area: BodyArea) => void
  removeArea: (id: string) => void
  clearAreas: () => void
  hasAreas: boolean
}

const BodyMapContext = createContext<BodyMapContextType | null>(null)

export function BodyMapProvider({ children }: { children: ReactNode }) {
  const [selectedAreas, setSelectedAreas] = useState<BodyArea[]>([])

  const addArea = useCallback((area: BodyArea) => {
    setSelectedAreas(prev => {
      const exists = prev.find(a => a.id === area.id)
      if (exists) return prev.map(a => a.id === area.id ? area : a)
      return [...prev, area]
    })
  }, [])

  const removeArea = useCallback((id: string) => {
    setSelectedAreas(prev => prev.filter(a => a.id !== id))
  }, [])

  const clearAreas = useCallback(() => {
    setSelectedAreas([])
  }, [])

  return (
    <BodyMapContext.Provider value={{ selectedAreas, setSelectedAreas, addArea, removeArea, clearAreas, hasAreas: selectedAreas.length > 0 }}>
      {children}
    </BodyMapContext.Provider>
  )
}

export function useBodyMap() {
  const ctx = useContext(BodyMapContext)
  if (!ctx) throw new Error('useBodyMap must be used within BodyMapProvider')
  return ctx
}
