import type { CookieOptions } from "hono/utils/cookie";
import { env } from "./env";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);

  // Default to `SameSite=None` for non-localhost deployments because the
  // frontend and backend are hosted on separate subdomains.
  const allowSameSiteNone =
    env.sessionSameSiteNone ||
    env.allowCrossSiteCookies ||
    !localhost;

  const sameSiteValue = localhost ? "Lax" : allowSameSiteNone ? "None" : "Lax";
  const secureValue = !localhost && env.forceCookieSecure;
  const domainValue = env.sessionCookieDomain;

  return {
    httpOnly: true,
    path: "/",
    sameSite: sameSiteValue,
    secure: secureValue,
    domain: domainValue,
  } as CookieOptions;
}
