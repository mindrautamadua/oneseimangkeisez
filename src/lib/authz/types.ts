/** Identity as asserted by the IAM provider (or the local mock adapter). */
export interface Membership {
  /** IAM organization identifier (maps to organizations.external_org_id). */
  orgId: string;
  roles: string[];
}

export interface Principal {
  sub: string;
  name: string;
  email: string | null;
  memberships: Membership[];
  /** External org id of the active context; always re-validated server-side. */
  activeOrgId: string | null;
  authProvider: "oidc" | "kinra_iam" | "mock";
}

export type OrgType = "kinra" | "tenant";

export interface ActiveContext {
  org: { id: string; externalOrgId: string; displayName: string; orgType: OrgType };
  roles: string[];
}

/** Logical product roles (see PRD §5.1). Mapped from IAM role keys. */
export const ROLES = {
  PORTAL_ADMIN: "portal_admin",
  AUDITOR: "auditor",
  EXECUTIVE: "executive",
  EMPLOYEE: "employee",
  MARKETING: "marketing",
  FINANCE: "finance",
  HR: "hr",
  ESTATE_OPS: "estate_ops",
  IT_STAFF: "it_staff",
  APP_OWNER: "app_owner",
  TENANT_ADMIN: "tenant_admin",
  TENANT_USER: "tenant_user",
} as const;
