import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const LANGUAGES: string[] = ["en", "fa", "ps"];
const NAMESPACES: string[] = [
  "common", "login", "register", "dashboard", "sidebar", 
  "admin", "tickets", "customers", "reports", "invoices",
];

const resourceCache: Record<string, Record<string, any>> = {
  en: {},
  fa: {},
  ps: {},
};

// Load resources BEFORE i18n init
async function loadAllResources(): Promise<void> {
  const languagesToLoad = [getSavedLanguage()];
  if (getSavedLanguage() !== "en") {
    languagesToLoad.push("en");
  }
  
  for (const lng of languagesToLoad) {
    for (const ns of NAMESPACES) {
      if (!resourceCache[lng][ns]) {
        try {
          const response = await fetch(`/locales/${lng}/${ns}.json`);
          if (response.ok) {
            resourceCache[lng][ns] = await response.json();
            console.log(`✅ Loaded /locales/${lng}/${ns}.json`);
          } else {
            console.warn(`⚠️ Failed to load /locales/${lng}/${ns}.json`);
            resourceCache[lng][ns] = {};
          }
        } catch (error) {
          console.error(`❌ Error loading /locales/${lng}/${ns}.json`, error);
          resourceCache[lng][ns] = {};
        }
      }
    }
  }
}

function getSavedLanguage(): string {
  const saved = localStorage.getItem('i18nextLng');
  if (saved && LANGUAGES.includes(saved)) {
    return saved;
  }
  return 'en';
}

export async function initI18n(): Promise<void> {
  // Load all needed resources first
  await loadAllResources();
  
  const savedLanguage = getSavedLanguage();
  
  // Build complete resources object
  const resources: Record<string, any> = {};
  for (const lng of [savedLanguage, "en"]) {
    if (resourceCache[lng] && Object.keys(resourceCache[lng]).length > 0) {
      resources[lng] = resourceCache[lng];
    }
  }
  
  // Initialize i18n
  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: "en",
      defaultNS: "common",
      ns: NAMESPACES,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "i18nextLng",
      },
      react: {
        useSuspense: false, // Prevent suspense issues
      },
    });
  
  // Apply RTL settings
  applyDocumentDirection(savedLanguage);
}

export const RTL_LANGUAGES: string[] = ["fa", "ps"];

export function isRTL(lng?: string): boolean {
  return RTL_LANGUAGES.includes(lng || i18n.language);
}

export function applyDocumentDirection(lng: string): void {
  const isRtl = isRTL(lng);
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lng;
  document.body.style.direction = isRtl ? "rtl" : "ltr";
  document.body.style.textAlign = isRtl ? "right" : "left";
}

export async function changeLanguage(lng: string): Promise<void> {
  if (!LANGUAGES.includes(lng)) return;
  
  // Load new language resources if not cached
  if (!resourceCache[lng] || Object.keys(resourceCache[lng]).length === 0) {
    for (const ns of NAMESPACES) {
      try {
        const response = await fetch(`/locales/${lng}/${ns}.json`);
        if (response.ok) {
          const data = await response.json();
          resourceCache[lng] = resourceCache[lng] || {};
          resourceCache[lng][ns] = data;
          i18n.addResourceBundle(lng, ns, data, true, true);
        }
      } catch (error) {
        console.error(`Error loading ${lng}/${ns}.json`, error);
      }
    }
  } else {
    // Add cached resources
    for (const ns of NAMESPACES) {
      if (resourceCache[lng][ns]) {
        i18n.addResourceBundle(lng, ns, resourceCache[lng][ns], true, true);
      }
    }
  }
  
  await i18n.changeLanguage(lng);
  localStorage.setItem('i18nextLng', lng);
  applyDocumentDirection(lng);
}

export default i18n;