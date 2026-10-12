/**
 * DEMO SEED DATA — NON-PRODUCTION. Loads the RSTI 2026–2030 end-state simulation from
 * scripts/catalogue-rsti.ts. Organizations and URLs are fictional (*.kinra.example).
 * Removes older demo entries (is_demo = true) that are no longer in the list.
 * Refuses to run when APP_ENV=production.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, notInArray, sql as dsql } from "drizzle-orm";
import postgres from "postgres";
import { scriptDatabaseUrl, scriptSqlOptions } from "./_env";
import * as s from "../src/lib/db/schema";
import { APPS, CATEGORIES, ORGS } from "./catalogue-rsti";
import { DEMO_ANNOUNCEMENTS } from "./announcements-demo";

async function main() {
  if (process.env.APP_ENV === "production") throw new Error("Seed demo dilarang ketika APP_ENV=production.");
  const environment = (process.env.ONEKINRA_TARGET === "test" ? "development" : process.env.APP_ENV ?? "development") as
    | "development"
    | "staging";
  const sql = postgres(scriptDatabaseUrl(), scriptSqlOptions(scriptDatabaseUrl()));
  const db = drizzle(sql, { schema: s });

  const orgIds = new Map<string, string>();
  for (const o of ORGS) {
    const [row] = await db
      .insert(s.organizations)
      .values(o)
      .onConflictDoUpdate({ target: s.organizations.externalOrgId, set: { displayName: o.displayName, orgType: o.orgType } })
      .returning();
    orgIds.set(o.externalOrgId, row!.id);
  }

  const catIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const [row] = await db
      .insert(s.categories)
      .values({ ...c, displayOrder: (i + 1) * 10 })
      .onConflictDoUpdate({ target: s.categories.slug, set: { name: c.name, description: c.description, audienceScope: c.audienceScope, displayOrder: (i + 1) * 10 } })
      .returning();
    catIds.set(c.slug, row!.id);
  }

  for (const [i, a] of APPS.entries()) {
    const values = {
      slug: a.slug,
      name: a.name,
      description: a.description,
      iconKey: a.iconKey,
      categoryId: catIds.get(a.category)!,
      targetUrl: a.targetUrl ?? `https://${a.slug}.kinra.example/`,
      audience: a.audience,
      integrationMode: a.integrationMode,
      status: a.status,
      environment,
      applicationOwner: "Divisi TI (Demo)",
      businessOwner: `${a.businessOwner} (Demo)`,
      supportContact:
        a.audience === "tenant"
          ? "Tenant Service Center (Demo) — tsc-demo@kinra.example"
          : "IT Service Desk (Demo) — servicedesk-demo@kinra.example",
      initiativeRef: a.initiativeRef,
      targetPeriod: a.targetPeriod,
      displayOrder: (i + 1) * 10,
      featured: a.featured ?? false,
      isDemo: true,
      createdBy: "seed",
      updatedBy: "seed",
    };
    const [row] = await db
      .insert(s.applications)
      .values(values)
      .onConflictDoUpdate({ target: s.applications.slug, set: { ...values, updatedAt: new Date() } })
      .returning();
    await db.delete(s.applicationEntitlements).where(eq(s.applicationEntitlements.applicationId, row!.id));
    for (const [org, role] of a.grants) {
      await db
        .insert(s.applicationEntitlements)
        .values({ applicationId: row!.id, organizationId: orgIds.get(org)!, roleKey: role })
        .onConflictDoNothing();
    }
  }
  // Remove demo entries and empty categories that are no longer part of the catalogue.
  const slugs = APPS.map((a) => a.slug);
  const removed = await db
    .delete(s.applications)
    .where(and(eq(s.applications.isDemo, true), notInArray(s.applications.slug, slugs)))
    .returning({ slug: s.applications.slug });
  const catSlugs = CATEGORIES.map((c) => c.slug);
  await db
    .delete(s.categories)
    .where(
      and(
        notInArray(s.categories.slug, catSlugs),
        dsql`not exists (select 1 from ${s.applications} a where a.category_id = ${s.categories.id})`,
      ),
    );
  if (removed.length) console.log(`Entri demo lama dihapus: ${removed.map((r) => r.slug).join(", ")}`);

  // Demo announcements: upsert by fixed id. Acknowledgments are append-only, so existing rows
  // are updated in place rather than deleted; targets are replaced.
  const now = Date.now();
  const at = (h: number | null) => (h === null ? null : new Date(now + h * 3_600_000));
  for (const d of DEMO_ANNOUNCEMENTS) {
    const values = {
      id: d.id,
      title: d.title,
      summary: d.summary,
      body: d.body,
      category: d.category,
      priority: d.priority,
      status: d.status,
      audience: d.audience,
      publisher: d.publisher,
      publishAt: at(d.publishInH),
      expiresAt: at(d.expiresInH),
      requiresAck: d.requiresAck,
      isDemo: true,
      createdBy: "seed",
      updatedBy: "seed",
      publishedBy: d.status === "draft" ? null : "seed",
      withdrawnBy: d.status === "withdrawn" ? "seed" : null,
      withdrawnAt: d.status === "withdrawn" ? new Date(now) : null,
    };
    const { id: _id, ...update } = values;
    await db.insert(s.announcements).values(values).onConflictDoUpdate({ target: s.announcements.id, set: { ...update, updatedAt: new Date() } });
    await db.delete(s.announcementTargets).where(eq(s.announcementTargets.announcementId, d.id));
    for (const t of d.targets) {
      await db.insert(s.announcementTargets).values({
        announcementId: d.id,
        organizationId: t.org ? orgIds.get(t.org)! : null,
        roleKey: t.role ?? null,
      });
    }
  }

  await sql.end();
  console.log(`Seed demo selesai: ${ORGS.length} organisasi, ${CATEGORIES.length} kategori, ${APPS.length} aplikasi RSTI end state 2030 (environment=${environment}), ${DEMO_ANNOUNCEMENTS.length} pengumuman contoh.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
