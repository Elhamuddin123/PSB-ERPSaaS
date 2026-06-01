import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Get saved language or default to English
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('i18nextLng');
  if (saved && ['en', 'fa', 'ps'].includes(saved)) {
    return saved;
  }
  return 'en';
};

// Create async initialization function
export async function initI18n(): Promise<void> {
  const resources: any = {
    en: {},
    fa: {},
    ps: {}
  };

  const languages: string[] = ['en', 'fa', 'ps'];
  const namespaces: string[] = ['common', 'login', 'register', 'dashboard', 'sidebar', 'admin', 'tickets', 'customers', 'reports', 'invoices'];

  // Load all JSON files dynamically
  for (const lang of languages) {
    for (const ns of namespaces) {
      try {
        const response = await fetch(`/locales/${lang}/${ns}.json`);
        if (response.ok) {
          const data = await response.json();
          resources[lang][ns] = data;
          console.log(`✅ Loaded /locales/${lang}/${ns}.json`);
        } else {
          console.warn(`⚠️ Failed to load /locales/${lang}/${ns}.json, status: ${response.status}`);
          resources[lang][ns] = {};
        }
      } catch (error) {
        console.error(`❌ Error loading /locales/${lang}/${ns}.json`, error);
        resources[lang][ns] = {};
      }
    }
  }

  const savedLanguage = getSavedLanguage();
  
  // Log what we have before initializing
  console.log('Resources loaded:', Object.keys(resources.en));
  console.log('Saved language:', savedLanguage);
  
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: "en",
      defaultNS: "common",
      ns: namespaces,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
      },
    });
    
  // Test if translation works after initialization
  setTimeout(() => {
    console.log('Test translation (login:title):', i18n.t('title', { ns: 'login' }));
    console.log('Current language:', i18n.language);
  }, 100);
}

export const RTL_LANGUAGES: string[] = ["fa", "ps"];

export function isRTL(lng?: string): boolean {
  return RTL_LANGUAGES.includes(lng || i18n.language);
}

export function changeLanguage(lng: string): void {
  i18n.changeLanguage(lng);
  localStorage.setItem('i18nextLng', lng);
  const isRtl = isRTL(lng);
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lng;
  document.body.style.direction = isRtl ? "rtl" : "ltr";
  document.body.style.textAlign = isRtl ? "right" : "left";
}

// Initialize i18n
initI18n().then(() => {
  const currentLang = i18n.language;
  const isRtl = RTL_LANGUAGES.includes(currentLang);
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = currentLang;
  document.body.style.direction = isRtl ? "rtl" : "ltr";
  document.body.style.textAlign = isRtl ? "right" : "left";
}).catch((error) => {
  console.error('Failed to initialize i18n:', error);
});

export default i18n;