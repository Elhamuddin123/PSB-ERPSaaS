import type { AuthUser } from "@/hooks/useAuth";

export type SubscriptionInfo = {
  status: "pending" | "active" | "expired" | "cancelled";
  plan?: string;
  expiresAt?: Date | string | null;
  startsAt?: Date | string | null;
};

export function getUserSubscription(user: AuthUser | null | undefined): SubscriptionInfo | null {
  return user?.subscription ?? null;
}

export function hasActiveSubscription(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return user.subscription?.status === "active";
}

export function getSubscriptionStatusLabel(status?: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "pending":
      return "Pending Payment";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}
