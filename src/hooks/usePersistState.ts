import { useState, useEffect } from 'react'
import { scopeKey } from '../utils/storage'

export function usePersistState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const scoped = scopeKey(key)
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(scoped)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(scoped, JSON.stringify(state))
    } catch { /* quota exceeded */ }
  }, [scoped, state])

  return [state, setState]
}
