import { describe, expect, it } from "vitest";
import {
  announcementTargetsMatch,
  canManageContent,
  canViewAnnouncement,
  isAnnouncementLive,
  type AnnouncementRecord,
} from "@/lib/authz/policy";
import type { ActiveContext } from "@/lib/authz/types";
import { expandTargets, parseWibDateTime, validateAnnouncementInput } from "@/lib/announcements/validation";

const now = new Date("2026-10-11T03:00:00Z");
const h = (n: number) => new Date(now.getTime() + n * 3_600_000);
const ann = (over: Partial<AnnouncementRecord> = {}): AnnouncementRecord => ({
  status: "published",
  audience: "both",
  publishAt: h(-1),
  expiresAt: null,
  ...over,
});
const ctx = (orgType: "kinra" | "tenant", id: string, roles: string[]): ActiveContext => ({
  org: { id, externalOrgId: `ext-${id}`, displayName: id, orgType },
  roles,
});
const employee = ctx("kinra", "k", ["employee"]);
const tenantA = ctx("tenant", "a", ["tenant_user"]);
const tenantB = ctx("tenant", "b", ["tenant_user"]);

describe("isAnnouncementLive", () => {
  it("only published items inside their window are live", () => {
    expect(isAnnouncementLive(ann(), now)).toBe(true);
    expect(isAnnouncementLive(ann({ status: "draft" }), now)).toBe(false);
    expect(isAnnouncementLive(ann({ status: "withdrawn" }), now)).toBe(false);
    expect(isAnnouncementLive(ann({ publishAt: h(1) }), now)).toBe(false); // scheduled
    expect(isAnnouncementLive(ann({ publishAt: null }), now)).toBe(false);
    expect(isAnnouncementLive(ann({ expiresAt: h(-0.5) }), now)).toBe(false); // expired
    expect(isAnnouncementLive(ann({ expiresAt: now }), now)).toBe(false); // boundary: expired
    expect(isAnnouncementLive(ann({ expiresAt: h(1) }), now)).toBe(true);
  });
});

describe("canViewAnnouncement", () => {
  it("separates internal and tenant audiences", () => {
    expect(canViewAnnouncement(employee, ann({ audience: "internal" }), [], now)).toBe(true);
    expect(canViewAnnouncement(tenantA, ann({ audience: "internal" }), [], now)).toBe(false);
    expect(canViewAnnouncement(employee, ann({ audience: "tenant" }), [], now)).toBe(false);
    expect(canViewAnnouncement(tenantA, ann({ audience: "tenant" }), [], now)).toBe(true);
    expect(canViewAnnouncement(tenantA, ann({ audience: "both" }), [], now)).toBe(true);
  });

  it("tenant-targeted announcements reach only that tenant", () => {
    const t = [{ organizationId: "a", roleKey: null }];
    expect(canViewAnnouncement(tenantA, ann({ audience: "tenant" }), t, now)).toBe(true);
    expect(canViewAnnouncement(tenantB, ann({ audience: "tenant" }), t, now)).toBe(false);
  });

  it("denies without context or roles", () => {
    expect(canViewAnnouncement(null, ann(), [], now)).toBe(false);
    expect(canViewAnnouncement(ctx("kinra", "k", []), ann(), [], now)).toBe(false);
  });
});

describe("announcementTargetsMatch", () => {
  it("requires org AND role of the same target row", () => {
    const t = [
      { organizationId: "a", roleKey: "tenant_admin" },
      { organizationId: null, roleKey: "finance" },
    ];
    expect(announcementTargetsMatch(tenantA, t)).toBe(false);
    expect(announcementTargetsMatch(ctx("tenant", "a", ["tenant_admin"]), t)).toBe(true);
    expect(announcementTargetsMatch(ctx("kinra", "k", ["employee", "finance"]), t)).toBe(true);
    expect(announcementTargetsMatch(employee, t)).toBe(false);
    expect(announcementTargetsMatch(employee, [])).toBe(true);
  });
});

describe("canManageContent", () => {
  it("is limited to portal admins in a KINRA context", () => {
    expect(canManageContent(ctx("kinra", "k", ["portal_admin"]))).toBe(true);
    expect(canManageContent(employee)).toBe(false);
    expect(canManageContent(ctx("tenant", "a", ["portal_admin", "tenant_admin"]))).toBe(false);
    expect(canManageContent(null)).toBe(false);
  });
});

describe("announcement validation", () => {
  it("interprets datetime-local values as WIB", () => {
    expect(parseWibDateTime("2026-10-11T08:00")?.toISOString()).toBe("2026-10-11T01:00:00.000Z");
    expect(parseWibDateTime("2026-10-11T08:00:00Z")?.toISOString()).toBe("2026-10-11T08:00:00.000Z");
    expect(parseWibDateTime("")).toBeNull();
    expect(parseWibDateTime(null)).toBeNull();
    expect(parseWibDateTime("besok")).toBeUndefined();
    expect(parseWibDateTime(42)).toBeUndefined();
  });

  const valid = {
    title: "Pemeliharaan sistem",
    summary: "Ringkasan pemeliharaan sistem",
    body: "Isi",
    category: "maintenance",
    priority: "high",
    audience: "internal",
    publisher: "Divisi TI",
    publishAt: "2026-10-11T08:00",
    expiresAt: "2026-10-12T08:00",
    requiresAck: true,
    targetOrganizationIds: [],
    targetRoleKeys: ["employee", "employee"],
  };

  it("accepts valid input and de-duplicates targets", () => {
    const r = validateAnnouncementInput(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.targetRoleKeys).toEqual(["employee"]);
  });

  it("rejects bad enums, windows and role keys with field errors", () => {
    const r = validateAnnouncementInput({
      ...valid,
      priority: "urgent",
      expiresAt: "2026-10-10T08:00",
      targetRoleKeys: ["Bad Role"],
      title: "x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["expiresAt", "priority", "targetRoleKeys", "title"]);
  });

  it("expands org and role lists into target rows", () => {
    expect(expandTargets(["o1", "o2"], ["r1"])).toEqual([
      { organizationId: "o1", roleKey: "r1" },
      { organizationId: "o2", roleKey: "r1" },
    ]);
    expect(expandTargets(["o1"], [])).toEqual([{ organizationId: "o1", roleKey: null }]);
    expect(expandTargets([], ["r1"])).toEqual([{ organizationId: null, roleKey: "r1" }]);
    expect(expandTargets([], [])).toEqual([]);
  });
});
