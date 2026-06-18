import { canAccessAppRoute } from "@contracts/roles";

export {
  ROLES,
  type AppRole,
  OPERATIONAL_ROLES,
  SUPERVISORY_ROLES,
  hasAnyRole,
  isAgencyAdmin,
  isSuperAdmin,
  canManageAgencyStaff,
  canViewSecurityAudit,
  canAccessAppRoute,
  canAccessNavItem,
} from "@contracts/roles";

/** @deprecated Use ROLES.AGENCY_ADMIN */
export const AGENCY_ADMIN_ROLE = "admin" as const;

/** @deprecated Use ROLES.SUPER_ADMIN */
export const SUPER_ADMIN_ROLE = "super_admin" as const;

/** @deprecated Agency admin now has full tenant ERP access via canAccessAppRoute */
export const AGENCY_ADMIN_ALLOWED_PATHS = [
  "/dashboard",
  "/reports",
  "/settings",
  "/payment-locations",
  "/payment-activation",
] as const;

/** @deprecated Use canAccessAppRoute */
export function isAgencyAdminAllowedPath(path: string): boolean {
  return canAccessAppRoute(AGENCY_ADMIN_ROLE, path);
}
