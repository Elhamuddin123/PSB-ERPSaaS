import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { applyDocumentDirection, initI18n } from '@/lib/i18n'
import { TRPCProvider } from "@/providers/trpc"
import { Toaster } from "@/components/ui/sonner"
import App from './App.tsx'
import { useTranslation } from 'react-i18next'

function LanguageDirectionHandler() {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    const update = () => applyDocumentDirection(i18n.language);
    update();
    i18n.on('languageChanged', update);
    return () => {
      i18n.off('languageChanged', update);
    };
  }, [i18n]);
  
  return null;
}

// Main render function - only call initI18n once
async function renderApp() {
  await initI18n(); // Initialize once
  
  const root = document.getElementById('root');
  if (!root) return;
  
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <TRPCProvider>
          <LanguageDirectionHandler />
          <App />
          <Toaster />
        </TRPCProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

renderApp();