export const ROLES = {
  SUPER_ADMIN: "super_admin",
  AGENCY_ADMIN: "admin",
  MANAGER: "manager",
  ACCOUNTANT: "accountant",
  AGENT: "agent",
  VIEWER: "viewer",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

/** Day-to-day ERP work within a tenant (includes agency admin). */
export const OPERATIONAL_ROLES = [
  ROLES.AGENCY_ADMIN,
  ROLES.AGENT,
  ROLES.ACCOUNTANT,
  ROLES.MANAGER,
  ROLES.SUPER_ADMIN,
] as const;

/** Approval and oversight actions within a tenant. */
export const SUPERVISORY_ROLES = [
  ROLES.AGENCY_ADMIN,
  ROLES.MANAGER,
  ROLES.ACCOUNTANT,
  ROLES.SUPER_ADMIN,
] as const;

export const MANAGER_ROLES = [
  ROLES.AGENCY_ADMIN,
  ROLES.MANAGER,
  ROLES.SUPER_ADMIN,
] as const;

export const ACCOUNTANT_ROLES = [
  ROLES.AGENCY_ADMIN,
  ROLES.ACCOUNTANT,
  ROLES.SUPER_ADMIN,
] as const;

export function hasAnyRole(
  userRole: string | null | undefined,
  allowed: readonly string[],
): boolean {
  return !!userRole && allowed.includes(userRole);
}

export function isAgencyAdmin(role?: string | null): boolean {
  return role === ROLES.AGENCY_ADMIN;
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export function canManageAgencyStaff(role?: string | null): boolean {
  return isAgencyAdmin(role);
}

export function canViewSecurityAudit(role?: string | null): boolean {
  return isAgencyAdmin(role) || isSuperAdmin(role);
}

export function canAccessAppRoute(
  role: string | undefined | null,
  path: string,
): boolean {
  if (!role) return false;

  if (path === "/admin" || path.startsWith("/admin/")) {
    return isSuperAdmin(role);
  }

  // Agency admin has full tenant ERP access.
  if (isSuperAdmin(role) || isAgencyAdmin(role)) {
    return true;
  }

  return true;
}

export function canAccessNavItem(
  role: string | undefined | null,
  allowedRoles: readonly string[],
): boolean {
  if (!role) return false;
  if (isSuperAdmin(role)) return true;
  if (isAgencyAdmin(role)) return true;
  return allowedRoles.includes(role);
}
