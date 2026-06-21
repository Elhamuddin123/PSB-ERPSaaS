import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  isAppRoute,
  isPublicRoute,
  reloadLanguageNamespaces,
  resetI18nToPristine,
} from "@/lib/i18n";

/**
 * Resets i18n when entering the authenticated app from a public route.
 * Must run before app pages render so t() never reads a corrupted store.
 */
export default function I18nRouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { i18n } = useTranslation();
  const previousPathRef = useRef(location.pathname);

  const enteringAppFromPublic =
    isAppRoute(location.pathname) && isPublicRoute(previousPathRef.current);

  if (enteringAppFromPublic) {
    resetI18nToPristine(i18n.language);
  }

  useLayoutEffect(() => {
    if (isAppRoute(location.pathname)) {
      const prev = previousPathRef.current;
      if (prev === location.pathname || isPublicRoute(prev)) {
        resetI18nToPristine(i18n.language);
      }
    }
    previousPathRef.current = location.pathname;
  }, [location.pathname, i18n.language]);

  useEffect(() => {
    if (!isAppRoute(location.pathname)) return;
    void reloadLanguageNamespaces(i18n.language);
  }, [location.pathname, i18n.language]);

  return children;
}
