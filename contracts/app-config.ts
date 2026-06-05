export const DEFAULT_BACKEND_PORT = 3000;
export const DEFAULT_FRONTEND_PORT = 5173;

/** Canonical environment variable names for app URLs. */
export const EnvKeys = {
  appUrl: "APP_URL",
  apiUrl: "API_URL",
  port: "PORT",
} as const;

/** Legacy names kept for backward compatibility during migration. */
export const LegacyEnvKeys = {
  frontendUrl: "FRONTEND_URL",
  viteAppUrl: "VITE_APP_URL",
  viteApiUrl: "VITE_API_URL",
  viteApiBaseUrl: "VITE_API_BASE_URL",
} as const;

export function parseOrigins(raw: string): string[] {
  return raw
    .split(/[;,]/)
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function buildTrpcEndpoint(apiBaseUrl: string): string {
  return `${normalizeBaseUrl(apiBaseUrl)}/api/trpc`;
}

export function resolveUrl(
  values: Record<string, string | undefined>,
  canonical: string,
  ...legacy: string[]
): string {
  for (const key of [canonical, ...legacy]) {
    const value = values[key]?.trim();
    if (value) return value;
  }
  return "";
}
