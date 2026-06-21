import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { getLocalUser, logoutLocal } from "@/lib/localAuth";

export interface AuthUser {
  id: number;
  unionId?: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  avatar: string | null;
  role: string;
  department?: string | null;
  tenantId?: number | null;
  subscription?: {
    status: "pending" | "active" | "expired" | "cancelled";
    plan?: string;
    durationMonths?: number;
    startsAt?: Date | string | null;
    expiresAt?: Date | string | null;
  } | null;
  registrationToken?: string | null;
  tenantName?: string | null;
  billing?: {
    paidUntil: string | null;
    nextPaymentDue: string | null;
    billingStatus: "inactive" | "paid" | "due" | "overdue";
    isOverdue: boolean;
    isDue: boolean;
  } | null;
}

export function useAuth() {
  const [localUser, setLocalUser] = useState<AuthUser | null>(() => {
    const local = getLocalUser();
    return local ? {
      id: local.id,
      unionId: undefined,
      name: local.name,
      email: local.email,
      avatar: local.avatar || null,
      role: local.role,
      department: local.department,
    } : null;
  });

  // Try tRPC auth first, then fall back to localStorage
  const trpcUser = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const user: AuthUser | null = (trpcUser.data as AuthUser | null) || localUser;
  const loading = trpcUser.isLoading;
  console.log(
    "[useAuth]",
    {
      loading,
      trpcUser,
      localUser
    }
  );

  const navigate = useNavigate();
  const utils = trpc.useContext();
  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = async () => {
    // Prefer to inform the server first (in case it relies on cookies/session),
    // then clear local state and redirect.
    try {
      if (logoutMutation && typeof (logoutMutation as any).mutateAsync === "function") {
        try {
          await (logoutMutation as any).mutateAsync(undefined);
        } catch (err) {
          console.warn("logout mutation failed", err);
        }
      }

      try {
        // Invalidate client-side auth cache
        await utils.auth.me.invalidate();
      } catch (e) {
        // ignore
      }
      try {
        (utils as any).queryClient?.clear();
      } catch {}

      try {
        if (typeof utils.auth.me.setData === "function") {
          utils.auth.me.setData(undefined, () => undefined);
        }
      } catch {}

      // Now clear local/demo auth and storages
      try {
        logoutLocal();
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn("failed to clear storage during logout", e);
      }

      setLocalUser(null);

      // Finally redirect to public home page
      try {
        if (typeof window !== "undefined") {
          window.location.replace("/");
        } else {
          navigate("/", { replace: true });
        }
      } catch (e) {
        console.warn("navigate failed during logout", e);
      }
    } catch (e) {
      console.warn("unexpected error during logout", e);
      // Best-effort fallback: clear local and redirect
      try {
        logoutLocal();
        localStorage.clear();
        sessionStorage.clear();
        setLocalUser(null);
      } catch {}
      try {
        if (typeof window !== "undefined") window.location.replace("/");
        else navigate("/", { replace: true });
      } catch {}
    }
  };

  return { user, loading, isLoggedIn: !!user, logout };
}
