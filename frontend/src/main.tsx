import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { SkeletonStyles } from './components/ui/Skeleton.tsx'
import { AccountProvider } from './contexts/AccountContext.tsx'
import { settingsService } from './services/api.ts'

const applyTheme = () => {
  const settings = settingsService.getSettings()
  const root = document.documentElement
  
  if (settings.theme === 'dark') {
    root.classList.add('dark')
  } else if (settings.theme === 'light') {
    root.classList.remove('dark')
  } else if (settings.theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

applyTheme()

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const settings = settingsService.getSettings()
  if (settings.theme === 'system') {
    applyTheme()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AccountProvider>
        <ToastProvider>
          <App />
          <SkeletonStyles />
        </ToastProvider>
      </AccountProvider>
    </ErrorBoundary>
  </StrictMode>,
)
