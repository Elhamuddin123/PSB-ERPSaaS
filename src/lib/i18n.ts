import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const LANGUAGES: string[] = ["en", "fa", "ps"];
const NAMESPACES: string[] = [
  "common", "login", "register", "dashboard", "sidebar",
  "admin", "tickets", "customers", "reports", "invoices",
];

/** Immutable golden copies loaded from JSON — never written by i18next runtime. */
const pristineBundles: Record<string, Record<string, Record<string, unknown>>> = {
  en: {},
  fa: {},
  ps: {},
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getSavedLanguage(): string {
  const saved = localStorage.getItem("i18nextLng");
  if (saved && LANGUAGES.includes(saved)) {
    return saved;
  }
  return "en";
}

function normalizeLanguage(lng: string): string {
  const base = lng.split("-")[0];
  return LANGUAGES.includes(base) ? base : "en";
}

function storePristineBundle(lng: string, ns: string, data: Record<string, unknown>): void {
  pristineBundles[lng] = pristineBundles[lng] || {};
  pristineBundles[lng][ns] = deepClone(data);
}

async function fetchNamespace(lng: string, ns: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`/locales/${lng}/${ns}.json`);
    if (response.ok) {
      return await response.json();
    }
    console.warn(`⚠️ Failed to load /locales/${lng}/${ns}.json`);
  } catch (error) {
    console.error(`❌ Error loading /locales/${lng}/${ns}.json`, error);
  }
  return {};
}

function languagesFor(lng: string): string[] {
  const language = normalizeLanguage(lng);
  return language === "en" ? ["en"] : [language, "en"];
}

function notifyI18nSubscribers(lng: string): void {
  if (!i18n.isInitialized) return;
  i18n.emit("loaded");
  i18n.emit("languageChanged", lng);
}

function applyBundleToStore(lng: string, ns: string, data: Record<string, unknown>): void {
  if (!i18n.isInitialized) return;
  i18n.removeResourceBundle(lng, ns);
  i18n.addResourceBundle(lng, ns, deepClone(data), true, true);
}

/**
 * Reset i18next in-memory store from immutable pristine JSON copies.
 * Call synchronously before rendering app routes so t() reads clean bundles.
 */
export function resetI18nToPristine(lng?: string): void {
  if (!i18n.isInitialized) return;

  const language = normalizeLanguage(lng || i18n.language || getSavedLanguage());

  for (const loadLng of languagesFor(language)) {
    for (const ns of NAMESPACES) {
      const pristine = pristineBundles[loadLng]?.[ns];
      if (!pristine || Object.keys(pristine).length === 0) continue;
      applyBundleToStore(loadLng, ns, pristine);
    }
  }

  notifyI18nSubscribers(language);
}

async function loadAllResources(): Promise<void> {
  const languagesToLoad = languagesFor(getSavedLanguage());

  for (const lng of languagesToLoad) {
    for (const ns of NAMESPACES) {
      if (pristineBundles[lng]?.[ns]) continue;
      const data = await fetchNamespace(lng, ns);
      storePristineBundle(lng, ns, data);
      if (Object.keys(data).length > 0) {
        console.log(`✅ Loaded /locales/${lng}/${ns}.json`);
      }
    }
  }
}

/** Reload namespace bundles from disk into pristine cache and i18n store. */
export async function reloadLanguageNamespaces(lng?: string): Promise<void> {
  const language = normalizeLanguage(lng || i18n.language || getSavedLanguage());

  const loaded = await Promise.all(
    languagesFor(language).flatMap((loadLng) =>
      NAMESPACES.map(async (ns) => ({
        loadLng,
        ns,
        data: await fetchNamespace(loadLng, ns),
      })),
    ),
  );

  for (const { loadLng, ns, data } of loaded) {
    storePristineBundle(loadLng, ns, data);
    applyBundleToStore(loadLng, ns, data);
  }

  notifyI18nSubscribers(language);
}

/** @deprecated Use resetI18nToPristine — kept for compatibility. */
export function restoreNamespacesFromCache(lng?: string): void {
  resetI18nToPristine(lng);
}

export async function ensureNamespacesLoaded(lng?: string): Promise<void> {
  const language = normalizeLanguage(lng || i18n.language || getSavedLanguage());
  let needsReload = false;

  for (const checkLng of languagesFor(language)) {
    for (const ns of NAMESPACES) {
      const pristine = pristineBundles[checkLng]?.[ns];
      if (!pristine || Object.keys(pristine).length === 0) {
        needsReload = true;
        break;
      }
    }
    if (needsReload) break;
  }

  if (needsReload) {
    await reloadLanguageNamespaces(language);
  } else {
    resetI18nToPristine(language);
  }
}

export async function initI18n(): Promise<void> {
  await loadAllResources();

  const savedLanguage = getSavedLanguage();
  const resources: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const lng of languagesFor(savedLanguage)) {
    resources[lng] = {};
    for (const ns of NAMESPACES) {
      const pristine = pristineBundles[lng]?.[ns];
      if (pristine && Object.keys(pristine).length > 0) {
        resources[lng][ns] = deepClone(pristine);
      }
    }
  }

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: "en",
      defaultNS: "common",
      ns: NAMESPACES,
      returnObjects: false,
      returnNull: false,
      saveMissing: false,
      updateMissing: false,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "i18nextLng",
      },
      react: {
        useSuspense: false,
        bindI18n: "languageChanged loaded",
        bindI18nStore: "added removed",
      },
    });

  applyDocumentDirection(savedLanguage);
}

export const RTL_LANGUAGES: string[] = ["fa", "ps"];

export const PUBLIC_ROUTE_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/register/success",
]);

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PATHS.has(pathname);
}

export function isAppRoute(pathname: string): boolean {
  return !isPublicRoute(pathname);
}

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
  const language = normalizeLanguage(lng);
  if (!LANGUAGES.includes(language)) return;

  await reloadLanguageNamespaces(language);
  await i18n.changeLanguage(language);
  localStorage.setItem("i18nextLng", language);
  applyDocumentDirection(language);
}

export default i18n;
