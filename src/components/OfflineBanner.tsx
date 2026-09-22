import { useState, useEffect } from 'react'
import Icon from './Icon'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-3 backdrop-blur-xl bg-[rgba(255,51,51,0.15)] border-b border-[rgba(255,51,51,0.4)] shadow-[0_0_30px_rgba(255,51,51,0.2),0_0_60px_rgba(255,51,51,0.1)]">
      <Icon icon="wifi_off" size="lg" className="text-[#ff3366] drop-shadow-[0_0_8px_rgba(255,51,102,0.8)]" />
      <p className="font-body-md text-sm font-medium text-[#ff3366]">
        You are offline. Some features may be unavailable until your connection is restored.
      </p>
    </div>
  )
}
