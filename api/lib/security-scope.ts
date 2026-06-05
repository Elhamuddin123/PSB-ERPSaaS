import { ROLES } from "@contracts/roles";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../context";

/** `null` = platform-wide scope for super admins. */
export function getSecurityTenantScope(ctx: TrpcContext): number | null {
  if (ctx.user?.role === ROLES.SUPER_ADMIN) {
    return null;
  }
  return ctx.user?.tenantId ?? null;
}

export function assertSecurityTenantScope(ctx: TrpcContext): number {
  const tenantId = getSecurityTenantScope(ctx);
  if (tenantId == null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Agency context required.",
    });
  }
  return tenantId;
}
