import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { BodyMapProvider } from './context/BodyMapContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import App from './App'
import { queryClient } from './lib/queryClient'
import './index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister())
      })
      .catch(() => {})

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {})
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'missing-client-id'}>
          <BrowserRouter>
            <ThemeProvider>
              <BodyMapProvider>
                <AuthProvider>
                  <ToastProvider>
                    <App />
                    <ReactQueryDevtools initialIsOpen={false} />
                  </ToastProvider>
                </AuthProvider>
              </BodyMapProvider>
            </ThemeProvider>
          </BrowserRouter>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
