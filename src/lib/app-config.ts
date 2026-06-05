import { buildTrpcEndpoint } from "@contracts/app-config";

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL?.trim() || "";
}

export function getAppUrl(): string {
  return import.meta.env.VITE_APP_URL?.trim() || "";
}

export function getTrpcUrl(): string {
  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl) {
    return buildTrpcEndpoint(apiBaseUrl);
  }

  if (import.meta.env.DEV) {
    return "/api/trpc";
  }

  throw new Error(
    "API_URL is required for production builds. Set it in .env.production or hosting env.",
  );
}
