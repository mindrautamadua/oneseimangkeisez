import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditEvents, categories, organizations } from "@/lib/db/schema";
import { resolveActiveContext, type OrgRecord } from "@/lib/authz/policy";
import type { ActiveContext, Membership } from "@/lib/authz/types";
import {
  createApp,
  decideLaunch,
  getAuthorizedApp,
  grantEntitlement,
  listAuthorizedApps,
  retireApp,
  updateApp,
} from "@/lib/catalogue/service";
import { ForbiddenError, ValidationError } from "@/lib/catalogue/errors";
import { MOCK_USERS } from "@/lib/auth/mock-users";

let orgs: OrgRecord[];

function ctxFor(username: string, activeOrg?: string): ActiveContext | null {
  const u = MOCK_USERS.find((x) => x.username === username)!;
  return resolveActiveContext(
    { sub: `mock|${u.username}`, name: u.name, email: u.email, memberships: u.memberships as Membership[], activeOrgId: activeOrg ?? null, authProvider: "mock" },
    orgs,
  );
}

beforeAll(async () => {
  orgs = (await getDb().select().from(organizations)).map((o) => ({
    id: o.id,
    externalOrgId: o.externalOrgId,
    displayName: o.displayName,
    orgType: o.orgType,
    status: o.status,
  }));
});

afterAll(async () => {
  const g = globalThis as unknown as { __onekinraDb?: { sql: { end: () => Promise<void> } } };
  await g.__onekinraDb?.sql.end();
});

const slugs = (apps: { slug: string }[]) => apps.map((a) => a.slug).sort();

describe("authorized catalogue (RSTI end-state demo)", () => {
  it("AT-01 internal employee sees only internal/both apps they are entitled to", async () => {
    const apps = await listAuthorizedApps(ctxFor("andi.karyawan"));
    expect(slugs(apps)).toEqual(
      [
        "akun-kinra",
        "asisten-ai",
        "digitalization-need",
        "dms-workflow",
        "email-kolaborasi",
        "intranet",
        "it-service-desk",
        "odoo-pengadaan",
        "security-awareness",
      ].sort(),
    );
  });

  it("functional roles add their domain applications", async () => {
    const exec = slugs(await listAuthorizedApps(ctxFor("sari.eksekutif")));
    expect(exec).toEqual(expect.arrayContaining(["dashboard-direksi", "dashboard-kek", "ieoc", "digital-twin"]));
    expect(exec).not.toContain("sap-fi");
    const fin = slugs(await listAuthorizedApps(ctxFor("lina.keuangan")));
    expect(fin).toEqual(expect.arrayContaining(["sap-fi", "meter-to-cash", "odoo-kontrak-billing"]));
    expect(fin).not.toContain("billing-utilitas-legacy"); // retired
    expect(fin).not.toContain("sap-hc");
  });

  it("IT governance and IAM consoles are limited to IT/admin roles", async () => {
    const it = slugs(await listAuthorizedApps(ctxFor("admin.it")));
    expect(it).toEqual(expect.arrayContaining(["assessment-ti", "digitalization-need", "iam-console"]));
    const emp = slugs(await listAuthorizedApps(ctxFor("andi.karyawan")));
    expect(emp).not.toContain("assessment-ti");
    expect(emp).not.toContain("iam-console");
    expect(slugs(await listAuthorizedApps(ctxFor("rina.auditor")))).not.toContain("iam-console");
  });

  it("tenant user management is only for tenant admins of that tenant", async () => {
    expect(slugs(await listAuthorizedApps(ctxFor("dewi.multi", "demo-org-tenant-a")))).toContain("kelola-pengguna-tenant");
    expect(slugs(await listAuthorizedApps(ctxFor("dewi.multi", "demo-org-tenant-b")))).not.toContain("kelola-pengguna-tenant");
    expect(slugs(await listAuthorizedApps(ctxFor("budi.tenant-a")))).not.toContain("kelola-pengguna-tenant");
  });

  it("AT-02 tenant A user sees tenant services for A only", async () => {
    const apps = await listAuthorizedApps(ctxFor("budi.tenant-a"));
    expect(apps.every((a) => a.audience !== "internal")).toBe(true);
    expect(slugs(apps)).toEqual(expect.arrayContaining(["tenant-portal", "tagihan-pembayaran", "konektivitas-tenant", "akun-kinra"]));
    expect(slugs(apps)).not.toContain("kontrak-dokumen-tenant"); // tenant_admin only
  });

  it("AT-03 tenant A-only service is not reachable from tenant B context", async () => {
    const b = ctxFor("citra.tenant-b");
    expect(await getAuthorizedApp(b, "konektivitas-tenant")).toBeNull();
    expect((await decideLaunch(b, "konektivitas-tenant")).ok).toBe(false);
    expect(await getAuthorizedApp(b, "sap-fi")).toBeNull();
    // Requesting tenant A as active org is ignored for a user without A membership.
    expect(ctxFor("citra.tenant-b", "demo-org-tenant-a")?.org.externalOrgId).toBe("demo-org-tenant-b");
  });

  it("multi-org user gets different catalogues per active context", async () => {
    const inA = slugs(await listAuthorizedApps(ctxFor("dewi.multi", "demo-org-tenant-a")));
    const inB = slugs(await listAuthorizedApps(ctxFor("dewi.multi", "demo-org-tenant-b")));
    expect(inA).toEqual(expect.arrayContaining(["kontrak-dokumen-tenant", "konektivitas-tenant"]));
    expect(inB).not.toContain("kontrak-dokumen-tenant"); // only tenant_user in B
    expect(inB).not.toContain("konektivitas-tenant");
  });

  it("users without an eligible org see nothing", async () => {
    expect(ctxFor("eko.tanpa-akses")).toBeNull();
    expect(await listAuthorizedApps(null)).toEqual([]);
  });

  it("AT-04 / AT-07 launch decisions", async () => {
    const k = ctxFor("andi.karyawan");
    expect(await decideLaunch(k, "dms-workflow")).toMatchObject({ ok: true, url: "https://dms-workflow.kinra.example/" });
    expect(await decideLaunch(k, "dashboard-direksi")).toEqual({ ok: false, reason: "not_found_or_forbidden" });
    expect(await decideLaunch(k, "does-not-exist")).toEqual({ ok: false, reason: "not_found_or_forbidden" });
    expect(await decideLaunch(ctxFor("lina.keuangan"), "billing-utilitas-legacy")).toEqual({ ok: false, reason: "not_found_or_forbidden" });
    expect(await decideLaunch(ctxFor("sari.eksekutif"), "digital-twin")).toMatchObject({ ok: false, reason: "not_launchable" });
    expect((await decideLaunch(ctxFor("rudi.operasi"), "video-analytics")).ok).toBe(true); // pilot
  });
});

describe("catalogue administration", () => {
  const admin = () => ({ sub: "mock|admin.it", ctx: ctxFor("admin.it"), correlationId: "test-corr" });
  let categoryId: string;
  beforeAll(async () => {
    [{ id: categoryId }] = (await getDb().select({ id: categories.id }).from(categories).where(eq(categories.slug, "layanan-ti"))) as [{ id: string }];
  });

  const base = () => ({
    slug: `uji-${Date.now()}`,
    name: "Aplikasi Uji",
    description: "Entri uji integrasi",
    iconKey: "app-window",
    categoryId,
    targetUrl: "https://uji.kinra.example/",
    audience: "internal",
    integrationMode: "authenticated_link",
    status: "available",
    environment: "development",
    applicationOwner: "Tim Uji",
    businessOwner: "Unit Uji",
    supportContact: "uji@kinra.example",
    displayOrder: 5,
    featured: false,
  });

  it("AT-09 non-admins are rejected by the service layer", async () => {
    await expect(createApp({ sub: "x", ctx: ctxFor("andi.karyawan") }, base())).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createApp({ sub: "x", ctx: ctxFor("rina.auditor") }, base())).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createApp({ sub: "x", ctx: ctxFor("dewi.multi") }, base())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("AT-11 unsafe URLs are rejected with a field message", async () => {
    for (const targetUrl of ["javascript:alert(1)", "https://evil.example", "http://uji.kinra.example"]) {
      const err = await createApp(admin(), { ...base(), targetUrl }).catch((e) => e);
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fieldErrors.targetUrl).toBeTruthy();
    }
  });

  it("AT-08 create → grant → update → retire is persisted and audited", async () => {
    const input = base();
    const created = await createApp(admin(), input);
    expect(created.slug).toBe(input.slug);

    // Not visible until an entitlement exists (deny-by-default).
    expect(await getAuthorizedApp(ctxFor("andi.karyawan"), input.slug)).toBeNull();
    const kinra = orgs.find((o) => o.orgType === "kinra")!;
    await grantEntitlement(admin(), created.id, { organizationId: kinra.id, roleKey: "employee" });
    expect(await getAuthorizedApp(ctxFor("andi.karyawan"), input.slug)).not.toBeNull();

    // Internal app cannot be granted to a tenant org.
    const tenantA = orgs.find((o) => o.externalOrgId === "demo-org-tenant-a")!;
    await expect(grantEntitlement(admin(), created.id, { organizationId: tenantA.id, roleKey: "tenant_user" })).rejects.toBeInstanceOf(ValidationError);

    const updated = await updateApp(admin(), created.id, { ...input, name: "Aplikasi Uji 2" });
    expect(updated.name).toBe("Aplikasi Uji 2");

    await expect(createApp(admin(), input)).rejects.toBeInstanceOf(ValidationError); // duplicate slug

    await retireApp(admin(), created.id);
    expect((await decideLaunch(ctxFor("andi.karyawan"), input.slug)).ok).toBe(false);

    const events = await getDb()
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.resourceId, created.id))
      .orderBy(desc(auditEvents.occurredAt));
    const types = events.map((e) => e.eventType);
    expect(types).toEqual(expect.arrayContaining(["catalogue.create", "entitlement.grant", "catalogue.update", "catalogue.retire"]));
    const update = events.find((e) => e.eventType === "catalogue.update")!;
    expect(update.actorId).toBe("mock|admin.it");
    expect(update.correlationId).toBe("test-corr");
    expect(update.metadata).toMatchObject({ changedFields: ["name"] });
  });
});

describe("audit trail integrity", () => {
  it("is append-only at the database level", async () => {
    await expect(getDb().execute(sql`update audit_events set outcome = 'success'`)).rejects.toThrow();
    await expect(getDb().execute(sql`delete from audit_events`)).rejects.toThrow();
  });

  it("AT-12 stored audit rows contain no secrets", async () => {
    const { recordAudit } = await import("@/lib/audit/audit");
    await recordAudit({
      eventType: "auth.login",
      outcome: "success",
      actorId: "mock|secret-test",
      metadata: { provider: "mock", access_token: "abc", password: "pw", note: "eyJhbGciOi.eyJzdWIi.sig" },
      correlationId: "secret-test",
    });
    const rows = await getDb().select().from(auditEvents).where(eq(auditEvents.correlationId, "secret-test"));
    const text = JSON.stringify(rows);
    expect(text).not.toContain("abc");
    expect(text).not.toContain('"pw"');
    expect(text).not.toContain("eyJhbGciOi");
    const all = JSON.stringify(await getDb().select().from(auditEvents));
    expect(all).not.toMatch(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
  });
});
