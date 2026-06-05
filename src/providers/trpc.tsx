import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { getTrpcUrl } from "@/lib/app-config";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient();
const apiUrl = getTrpcUrl();

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
