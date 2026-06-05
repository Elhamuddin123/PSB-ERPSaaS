import "dotenv/config";
import {
  DEFAULT_BACKEND_PORT,
  EnvKeys,
  LegacyEnvKeys,
  parseOrigins,
} from "@contracts/app-config";

function firstEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

const appUrlRaw = firstEnv(
  EnvKeys.appUrl,
  LegacyEnvKeys.frontendUrl,
  LegacyEnvKeys.viteAppUrl,
);

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  appUrl: appUrlRaw,
  apiUrl: firstEnv(
    EnvKeys.apiUrl,
    LegacyEnvKeys.viteApiUrl,
    LegacyEnvKeys.viteApiBaseUrl,
  ),
  frontendOrigins: parseOrigins(appUrlRaw),
  port: Number(process.env[EnvKeys.port] || DEFAULT_BACKEND_PORT),
  sessionSameSiteNone:
    (process.env.SESSION_SAMESITE_NONE || "").toLowerCase() === "true",
  allowCrossSiteCookies:
    (process.env.ALLOW_CROSS_SITE_COOKIES || "").toLowerCase() === "true",
  forceCookieSecure: process.env.FORCE_COOKIE_SECURE !== "false",
  sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN?.trim() || undefined,
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
};
