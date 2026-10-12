import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { announcementAcks, auditEvents, newsItems, newsSourceState, organizations } from "@/lib/db/schema";
import { resolveActiveContext, type OrgRecord } from "@/lib/authz/policy";
import type { ActiveContext, Membership } from "@/lib/authz/types";
import {
  acknowledgeAnnouncement,
  adminGetAnnouncement,
  createAnnouncement,
  getVisibleAnnouncement,
  listVisibleAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
  withdrawAnnouncement,
} from "@/lib/announcements/service";
import { listNews, runNewsSync, setNewsHidden } from "@/lib/news/service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/catalogue/errors";
import { MOCK_USERS } from "@/lib/auth/mock-users";

let orgs: OrgRecord[];

function reader(username: string, activeOrg?: string) {
  const u = MOCK_USERS.find((x) => x.username === username)!;
  const ctx: ActiveContext | null = resolveActiveContext(
    { sub: `mock|${u.username}`, name: u.name, email: u.email, memberships: u.memberships as Membership[], activeOrgId: activeOrg ?? null, authProvider: "mock" },
    orgs,
  );
  return { sub: `mock|${u.username}`, name: u.name, ctx };
}

const ID = {
  critical: "00000000-0000-4000-a000-000000000001",
  policyAck: "00000000-0000-4000-a000-000000000002",
  tenantA: "00000000-0000-4000-a000-000000000003",
  finance: "00000000-0000-4000-a000-000000000004",
  scheduled: "00000000-0000-4000-a000-000000000005",
  expired: "00000000-0000-4000-a000-000000000006",
  draft: "00000000-0000-4000-a000-000000000007",
  withdrawn: "00000000-0000-4000-a000-000000000008",
};

const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();

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

describe("announcement visibility", () => {
  it("internal employee sees live internal/both items, critical first", async () => {
    const list = await listVisibleAnnouncements(reader("andi.karyawan"));
    expect(ids(list)).toEqual([ID.critical, ID.policyAck].sort());
    expect(list[0]!.id).toBe(ID.critical);
  });

  it("role targeting: finance-only item reaches finance staff only", async () => {
    expect(ids(await listVisibleAnnouncements(reader("lina.keuangan")))).toContain(ID.finance);
    expect(ids(await listVisibleAnnouncements(reader("andi.karyawan")))).not.toContain(ID.finance);
  });

  it("tenant users never see internal announcements; tenant-targeted items stay with that tenant", async () => {
    const a = ids(await listVisibleAnnouncements(reader("budi.tenant-a")));
    const b = ids(await listVisibleAnnouncements(reader("citra.tenant-b")));
    expect(a).toEqual([ID.critical, ID.tenantA].sort());
    expect(b).toEqual([ID.critical]);
    // Same multi-org user, different active context.
    expect(ids(await listVisibleAnnouncements(reader("dewi.multi", "demo-org-tenant-a")))).toContain(ID.tenantA);
    expect(ids(await listVisibleAnnouncements(reader("dewi.multi", "demo-org-tenant-b")))).not.toContain(ID.tenantA);
  });

  it("scheduled, expired, draft and withdrawn items are hidden, also by direct id", async () => {
    const r = reader("admin.it");
    const visible = ids(await listVisibleAnnouncements(r));
    for (const id of [ID.scheduled, ID.expired, ID.draft, ID.withdrawn]) {
      expect(visible).not.toContain(id);
      expect(await getVisibleAnnouncement(r, id)).toBeNull();
    }
  });

  it("direct URL access to another audience's item returns null (indistinguishable from missing)", async () => {
    expect(await getVisibleAnnouncement(reader("citra.tenant-b"), ID.tenantA)).toBeNull();
    expect(await getVisibleAnnouncement(reader("budi.tenant-a"), ID.policyAck)).toBeNull();
    expect(await getVisibleAnnouncement(reader("budi.tenant-a"), "not-a-uuid")).toBeNull();
    expect(await getVisibleAnnouncement(reader("eko.tanpa-akses"), ID.critical)).toBeNull();
  });
});

describe("read confirmation", () => {
  it("records the session user once and only for visible items", async () => {
    const r = reader("hendra.sdm");
    const before = await getVisibleAnnouncement(r, ID.policyAck);
    expect(before?.ackedAt).toBeNull(); // opening the page is not a confirmation
    const at = await acknowledgeAnnouncement(r, ID.policyAck);
    expect(await acknowledgeAnnouncement(r, ID.policyAck)).toEqual(at); // idempotent
    const rows = await getDb().select().from(announcementAcks).where(and(eq(announcementAcks.announcementId, ID.policyAck), eq(announcementAcks.subject, r.sub)));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.subjectName).toBe(r.name);
    // Another user's state is untouched.
    expect((await getVisibleAnnouncement(reader("andi.karyawan"), ID.policyAck))?.ackedAt).toBeNull();
  });

  it("cannot confirm an announcement the user cannot see, or one that needs no confirmation", async () => {
    await expect(acknowledgeAnnouncement(reader("budi.tenant-a"), ID.policyAck)).rejects.toBeInstanceOf(NotFoundError);
    await expect(acknowledgeAnnouncement(reader("andi.karyawan"), ID.critical)).rejects.toBeInstanceOf(ValidationError);
  });

  it("confirmations are append-only in the database", async () => {
    // Drizzle wraps the driver error; the trigger message is on `cause`.
    const cause = (q: Promise<unknown>) => q.then(() => "", (e: { cause?: unknown }) => String(e.cause));
    expect(await cause(getDb().execute(sql`delete from announcement_acks`))).toMatch(/append-only/);
    expect(await cause(getDb().execute(sql`update announcement_acks set subject = 'x'`))).toMatch(/append-only/);
  });
});

describe("content administration", () => {
  const input = {
    title: "Uji pengumuman integrasi",
    summary: "Ringkasan pengumuman integrasi",
    body: "Isi pengumuman",
    category: "general",
    priority: "high",
    audience: "tenant",
    publisher: "Tim Uji",
    publishAt: null,
    expiresAt: null,
    requiresAck: true,
    targetOrganizationIds: [] as string[],
    targetRoleKeys: [] as string[],
  };
  const admin = () => {
    const r = reader("admin.it");
    return { sub: r.sub, ctx: r.ctx };
  };

  it("non-admins (including tenant admins) cannot create, publish or withdraw", async () => {
    for (const u of ["andi.karyawan", "rina.auditor", "dewi.multi"]) {
      const r = reader(u);
      await expect(createAnnouncement({ sub: r.sub, ctx: r.ctx }, input)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(publishAnnouncement({ sub: r.sub, ctx: r.ctx }, ID.draft)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(withdrawAnnouncement({ sub: r.sub, ctx: r.ctx }, ID.critical)).rejects.toBeInstanceOf(ForbiddenError);
    }
  });

  it("rejects target organizations that do not fit the audience", async () => {
    const kinra = orgs.find((o) => o.orgType === "kinra")!.id;
    await expect(createAnnouncement(admin(), { ...input, targetOrganizationIds: [kinra] })).rejects.toBeInstanceOf(ValidationError);
  });

  it("draft → publish → edit bumps version → withdraw, all audited", async () => {
    const tenantB = orgs.find((o) => o.externalOrgId === "demo-org-tenant-b")!.id;
    const created = await createAnnouncement(admin(), { ...input, targetOrganizationIds: [tenantB] });
    expect(created.status).toBe("draft");
    expect(await getVisibleAnnouncement(reader("citra.tenant-b"), created.id)).toBeNull();

    await publishAnnouncement(admin(), created.id);
    expect(await getVisibleAnnouncement(reader("citra.tenant-b"), created.id)).not.toBeNull();
    expect(await getVisibleAnnouncement(reader("budi.tenant-a"), created.id)).toBeNull();

    await acknowledgeAnnouncement(reader("citra.tenant-b"), created.id);
    // Changing the body after publication requires a fresh confirmation.
    const updated = await updateAnnouncement(admin(), created.id, {
      ...input,
      body: "Isi baru",
      publishAt: (await adminGetAnnouncement(admin(), created.id)).announcement.publishAt!.toISOString(),
      targetOrganizationIds: [tenantB],
    });
    expect(updated.version).toBe(2);
    expect((await getVisibleAnnouncement(reader("citra.tenant-b"), created.id))?.ackedAt).toBeNull();

    await withdrawAnnouncement(admin(), created.id);
    expect(await getVisibleAnnouncement(reader("citra.tenant-b"), created.id)).toBeNull();
    await expect(updateAnnouncement(admin(), created.id, input)).rejects.toBeInstanceOf(ValidationError);

    const events = await getDb()
      .select({ type: auditEvents.eventType })
      .from(auditEvents)
      .where(eq(auditEvents.resourceId, created.id))
      .orderBy(desc(auditEvents.occurredAt));
    expect(events.map((e) => e.type).sort()).toEqual(
      ["announcement.ack", "announcement.create", "announcement.publish", "announcement.update", "announcement.withdraw"].sort(),
    );
  });
});

describe("news", () => {
  const feed = (title: string, link: string) =>
    `<rss><channel><item><title>${title}</title><link>${link}</link><pubDate>${new Date().toUTCString()}</pubDate><description>Ringkas</description></item></channel></rss>`;

  it("sync stores only relevant, on-host items; failures are isolated and recorded", async () => {
    const results = await runNewsSync({ actorId: "test", organizationId: null }, async (s) => {
      if (s.key === "kontan-industri") throw new Error("HTTP 503");
      if (s.key === "kinra-sez") return feed("Kegiatan KINRA", "https://seimangkeisez.com/kegiatan/");
      if (s.key === "sindonews-ekbis") return feed("Investasi pabrik baru di kawasan industri", "https://ekbis.sindonews.com/read/1");
      return feed("Hasil pertandingan sepak bola", "https://www.antaranews.com/berita/2");
    });
    expect(results.find((r) => r.key === "kontan-industri")).toMatchObject({ ok: false, error: "HTTP 503" });
    expect(results.find((r) => r.key === "antara-ekonomi")).toMatchObject({ ok: true, fetched: 1, accepted: 0 });
    const [state] = await getDb().select().from(newsSourceState).where(eq(newsSourceState.sourceKey, "kontan-industri"));
    expect(state?.lastError).toBe("HTTP 503");

    const { items, total } = await listNews();
    expect(total).toBe(2);
    expect(items.map((i) => i.source.kind).sort()).toEqual(["industry", "official"]);
    expect((await listNews({ kind: "official" })).items.map((i) => i.title)).toEqual(["Kegiatan KINRA"]);
  });

  it("re-syncing existing items updates them in place and keeps a known image", async () => {
    // The throttle is based on the last attempt; move it back so a second sync may run.
    await getDb().update(newsSourceState).set({ lastAttemptAt: new Date(Date.now() - 120_000) });
    const [before] = await getDb().select().from(newsItems).where(eq(newsItems.sourceKey, "kinra-sez"));
    await getDb().update(newsItems).set({ imageUrl: "https://example.invalid/kept.jpg" }).where(eq(newsItems.id, before!.id));
    const results = await runNewsSync({ actorId: "test", organizationId: null }, async (s) =>
      s.key === "kinra-sez" ? feed("Kegiatan KINRA (diperbarui)", "https://seimangkeisez.com/kegiatan/") : "<rss/>",
    );
    expect(results.find((r) => r.key === "kinra-sez")).toMatchObject({ ok: true, accepted: 1 });
    const [after] = await getDb().select().from(newsItems).where(eq(newsItems.id, before!.id));
    expect(after!.title).toBe("Kegiatan KINRA (diperbarui)");
    expect(after!.imageUrl).toBe("https://example.invalid/kept.jpg");
  });

  it("a second sync within a minute is refused", async () => {
    await expect(runNewsSync({ actorId: "test", organizationId: null }, async () => "")).rejects.toBeInstanceOf(ValidationError);
  });

  it("only content managers can hide items; hidden items disappear for readers", async () => {
    const [item] = await getDb().select().from(newsItems).where(eq(newsItems.sourceKey, "sindonews-ekbis"));
    const emp = reader("andi.karyawan");
    await expect(setNewsHidden({ sub: emp.sub, ctx: emp.ctx }, item!.id, true)).rejects.toBeInstanceOf(ForbiddenError);
    const adm = reader("admin.it");
    await setNewsHidden({ sub: adm.sub, ctx: adm.ctx }, item!.id, true);
    expect((await listNews()).items.map((i) => i.id)).not.toContain(item!.id);
  });
});
