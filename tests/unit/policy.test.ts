import { describe, expect, it } from "vitest";
import {
  canLaunch,
  canReadAudit,
  canView,
  isPortalAdmin,
  resolveActiveContext,
  type AppRecord,
  type EntitlementRecord,
  type OrgRecord,
} from "@/lib/authz/policy";
import type { Principal } from "@/lib/authz/types";

const orgs: OrgRecord[] = [
  { id: "k", externalOrgId: "ext-k", displayName: "KINRA", orgType: "kinra", status: "active" },
  { id: "a", externalOrgId: "ext-a", displayName: "Tenant A", orgType: "tenant", status: "active" },
  { id: "b", externalOrgId: "ext-b", displayName: "Tenant B", orgType: "tenant", status: "active" },
  { id: "s", externalOrgId: "ext-s", displayName: "Suspended", orgType: "tenant", status: "suspended" },
];

const principal = (memberships: Principal["memberships"], activeOrgId: string | null = null): Principal => ({
  sub: "u1",
  name: "U",
  email: null,
  memberships,
  activeOrgId,
  authProvider: "mock",
});

const app = (over: Partial<AppRecord> = {}): AppRecord => ({
  id: "app1",
  status: "available",
  audience: "tenant",
  environment: "development",
  ...over,
});

const ents: EntitlementRecord[] = [
  { applicationId: "app1", organizationId: "a", roleKey: "tenant_user" },
  { applicationId: "int1", organizationId: "k", roleKey: "employee" },
];

describe("resolveActiveContext", () => {
  it("returns null without any eligible org (deny-by-default)", () => {
    expect(resolveActiveContext(principal([{ orgId: "unknown", roles: ["employee"] }]), orgs)).toBeNull();
    expect(resolveActiveContext(principal([]), orgs)).toBeNull();
  });
  it("ignores suspended orgs", () => {
    expect(resolveActiveContext(principal([{ orgId: "ext-s", roles: ["tenant_user"] }]), orgs)).toBeNull();
  });
  it("refuses an org the IdP did not assert, even if requested (AT-03)", () => {
    const ctx = resolveActiveContext(principal([{ orgId: "ext-a", roles: ["tenant_user"] }]), orgs, "ext-b");
    expect(ctx?.org.id).toBe("a");
  });
  it("honours a valid requested org for multi-org users", () => {
    const p = principal([
      { orgId: "ext-a", roles: ["tenant_admin"] },
      { orgId: "ext-b", roles: ["tenant_user"] },
    ]);
    const ctx = resolveActiveContext(p, orgs, "ext-b");
    expect(ctx?.org.id).toBe("b");
    expect(ctx?.roles).toEqual(["tenant_user"]);
  });
});

describe("canView / canLaunch", () => {
  const ctxA = resolveActiveContext(principal([{ orgId: "ext-a", roles: ["tenant_user"] }]), orgs)!;
  const ctxB = resolveActiveContext(principal([{ orgId: "ext-b", roles: ["tenant_user"] }]), orgs)!;
  const ctxK = resolveActiveContext(principal([{ orgId: "ext-k", roles: ["employee"] }]), orgs)!;

  it("grants only with a matching org + role entitlement", () => {
    expect(canView(ctxA, app(), ents, "development")).toBe(true);
    expect(canView(ctxB, app(), ents, "development")).toBe(false);
  });
  it("blocks role mismatch", () => {
    const ctx = resolveActiveContext(principal([{ orgId: "ext-a", roles: ["tenant_admin"] }]), orgs)!;
    expect(canView(ctx, app(), ents, "development")).toBe(false);
  });
  it("tenant users never see internal apps, even with a stray entitlement", () => {
    const stray = [...ents, { applicationId: "int1", organizationId: "a", roleKey: "tenant_user" }];
    expect(canView(ctxA, app({ id: "int1", audience: "internal" }), stray, "development")).toBe(false);
    expect(canView(ctxK, app({ id: "int1", audience: "internal" }), ents, "development")).toBe(true);
  });
  it("hides retired apps and apps from another environment (AT-07)", () => {
    expect(canView(ctxA, app({ status: "retired" }), ents, "development")).toBe(false);
    expect(canView(ctxA, app({ environment: "staging" }), ents, "development")).toBe(false);
  });
  it("planned / maintenance are visible but not launchable", () => {
    for (const status of ["planned", "maintenance"] as const) {
      expect(canView(ctxA, app({ status }), ents, "development")).toBe(true);
      expect(canLaunch(ctxA, app({ status }), ents, "development")).toBe(false);
    }
    expect(canLaunch(ctxA, app({ status: "pilot" }), ents, "development")).toBe(true);
  });
  it("null context is always denied", () => {
    expect(canView(null, app(), ents, "development")).toBe(false);
  });
});

describe("admin and audit roles", () => {
  it("portal_admin only counts inside a KINRA context", () => {
    const k = resolveActiveContext(principal([{ orgId: "ext-k", roles: ["portal_admin"] }]), orgs);
    const t = resolveActiveContext(principal([{ orgId: "ext-a", roles: ["portal_admin"] }]), orgs);
    expect(isPortalAdmin(k)).toBe(true);
    expect(isPortalAdmin(t)).toBe(false);
    expect(canReadAudit(t)).toBe(false);
  });
  it("auditor can read audit but not administer", () => {
    const a = resolveActiveContext(principal([{ orgId: "ext-k", roles: ["auditor"] }]), orgs);
    expect(canReadAudit(a)).toBe(true);
    expect(isPortalAdmin(a)).toBe(false);
  });
});
