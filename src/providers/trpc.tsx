import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient();
const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
const apiUrl = rawApiBaseUrl
  ? `${rawApiBaseUrl.replace(/\/$/, "")}/api/trpc`
  : import.meta.env.PROD
  ? "https://api.psb-erp.com/api/trpc"
  : "/api/trpc";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: apiUrl,
      transformer: superjson,
      headers() {
        const h: Record<string, string> = {};
        if (import.meta.env.DEV) {
          const raw = localStorage.getItem("psb-erp-auth");
          if (raw) h["x-dev-auth"] = raw;
        }
        return h;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
