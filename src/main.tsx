import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { initI18n, isRTL } from '@/lib/i18n'
import { TRPCProvider } from "@/providers/trpc"
import { Toaster } from "@/components/ui/sonner"
import App from './App.tsx'

// Initialize i18n first, then render
initI18n().then(() => {
  const savedLang = localStorage.getItem('i18nextLng') || 'en'
  const lng = savedLang
  document.documentElement.dir = isRTL(lng) ? 'rtl' : 'ltr'
  document.documentElement.lang = lng

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <TRPCProvider>
          <App />
          <Toaster />
        </TRPCProvider>
      </BrowserRouter>
    </StrictMode>,
  )
});