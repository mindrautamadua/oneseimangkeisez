/**
 * Pure authorization decisions. Deny-by-default.
 * All inputs must come from server-side sources (session + database), never the browser.
 */
import type { ActiveContext, Membership, OrgType, Principal } from "./types";
import { ROLES } from "./types";

export interface OrgRecord {
  id: string;
  externalOrgId: string;
  displayName: string;
  orgType: OrgType;
  status: "active" | "suspended";
}

export interface AppRecord {
  id: string;
  status: "available" | "pilot" | "planned" | "maintenance" | "retired";
  audience: "internal" | "tenant" | "both";
  environment: "production" | "staging" | "development";
}

export interface EntitlementRecord {
  applicationId: string;
  organizationId: string;
  roleKey: string;
}

/** Orgs the principal may act in: asserted by IAM AND mapped + active in the portal. */
export function eligibleOrgs(principal: Principal, orgs: OrgRecord[]): OrgRecord[] {
  const asserted = new Set(principal.memberships.map((m) => m.orgId));
  return orgs.filter((o) => o.status === "active" && asserted.has(o.externalOrgId));
}

/**
 * Resolves the active organization context. The requested org must be one the IAM
 * provider asserted for this user and that is active in the portal; otherwise the
 * first eligible org is used. Returns null when the user has no eligible org.
 */
export function resolveActiveContext(
  principal: Principal,
  orgs: OrgRecord[],
  requestedOrgId?: string | null,
): ActiveContext | null {
  const eligible = eligibleOrgs(principal, orgs);
  if (eligible.length === 0) return null;
  const wanted = requestedOrgId ?? principal.activeOrgId;
  const org = eligible.find((o) => o.externalOrgId === wanted) ?? eligible[0]!;
  const membership = principal.memberships.find((m) => m.orgId === org.externalOrgId) as Membership;
  return {
    org: { id: org.id, externalOrgId: org.externalOrgId, displayName: org.displayName, orgType: org.orgType },
    roles: [...new Set(membership.roles)],
  };
}

export function audienceMatches(app: Pick<AppRecord, "audience">, orgType: OrgType): boolean {
  if (app.audience === "both") return true;
  return orgType === "kinra" ? app.audience === "internal" : app.audience === "tenant";
}

export function hasEntitlement(
  ctx: ActiveContext,
  appId: string,
  entitlements: EntitlementRecord[],
): boolean {
  return entitlements.some(
    (e) => e.applicationId === appId && e.organizationId === ctx.org.id && ctx.roles.includes(e.roleKey),
  );
}

/** May the user see this catalogue entry in their workspace? */
export function canView(
  ctx: ActiveContext | null,
  app: AppRecord,
  entitlements: EntitlementRecord[],
  runtimeEnv: AppRecord["environment"],
): boolean {
  if (!ctx) return false;
  if (app.status === "retired") return false;
  if (app.environment !== runtimeEnv) return false;
  if (!audienceMatches(app, ctx.org.orgType)) return false;
  return hasEntitlement(ctx, app.id, entitlements);
}

export const LAUNCHABLE_STATUSES: ReadonlyArray<AppRecord["status"]> = ["available", "pilot"];

/** May the user launch this application right now? */
export function canLaunch(
  ctx: ActiveContext | null,
  app: AppRecord,
  entitlements: EntitlementRecord[],
  runtimeEnv: AppRecord["environment"],
): boolean {
  return canView(ctx, app, entitlements, runtimeEnv) && LAUNCHABLE_STATUSES.includes(app.status);
}

/** Portal administration is only available in a KINRA context. */
export function isPortalAdmin(ctx: ActiveContext | null): boolean {
  return !!ctx && ctx.org.orgType === "kinra" && ctx.roles.includes(ROLES.PORTAL_ADMIN);
}

/** Read access to the audit trail and access overview. */
export function canReadAudit(ctx: ActiveContext | null): boolean {
  return (
    !!ctx &&
    ctx.org.orgType === "kinra" &&
    (ctx.roles.includes(ROLES.PORTAL_ADMIN) || ctx.roles.includes(ROLES.AUDITOR))
  );
}

// ---------------------------------------------------------------------------
// Announcements (FR-13)
// ---------------------------------------------------------------------------

export interface AnnouncementRecord {
  status: "draft" | "published" | "withdrawn";
  audience: "internal" | "tenant" | "both";
  publishAt: Date | null;
  expiresAt: Date | null;
}

export interface AnnouncementTargetRecord {
  organizationId: string | null;
  roleKey: string | null;
}

/** Published, inside its publication window. Drafts, scheduled and expired items are not live. */
export function isAnnouncementLive(a: AnnouncementRecord, now: Date): boolean {
  if (a.status !== "published" || !a.publishAt) return false;
  if (a.publishAt.getTime() > now.getTime()) return false;
  return !a.expiresAt || a.expiresAt.getTime() > now.getTime();
}

/** No targets = whole audience. Otherwise at least one target must match the active org and roles. */
export function announcementTargetsMatch(ctx: ActiveContext, targets: AnnouncementTargetRecord[]): boolean {
  if (targets.length === 0) return true;
  return targets.some(
    (t) =>
      (t.organizationId === null || t.organizationId === ctx.org.id) &&
      (t.roleKey === null || ctx.roles.includes(t.roleKey)),
  );
}

export function canViewAnnouncement(
  ctx: ActiveContext | null,
  a: AnnouncementRecord,
  targets: AnnouncementTargetRecord[],
  now: Date,
): boolean {
  if (!ctx || ctx.roles.length === 0) return false;
  return isAnnouncementLive(a, now) && audienceMatches(a, ctx.org.orgType) && announcementTargetsMatch(ctx, targets);
}

/**
 * Creating, publishing and withdrawing official content. Limited to portal admins in a KINRA
 * context until separate editor/publisher roles are approved in IAM (DECISIONS A-17).
 */
export function canManageContent(ctx: ActiveContext | null): boolean {
  return isPortalAdmin(ctx);
}
