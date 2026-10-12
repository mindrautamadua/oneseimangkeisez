import "server-only";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  applicationEntitlements,
  applicationThumbnails,
  applications,
  categories,
  organizations,
  type Application,
  type Category,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { canLaunch, canView, isPortalAdmin, type EntitlementRecord } from "@/lib/authz/policy";
import type { ActiveContext } from "@/lib/authz/types";
import { recordAudit } from "@/lib/audit/audit";
import { parseAllowedHosts, validateTargetUrl, type UrlPolicy } from "@/lib/security/url";
import { entitlementInputSchema, validateAppInput } from "./validation";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";

export function urlPolicy(): UrlPolicy {
  const e = env();
  return { allowedHosts: parseAllowedHosts(e.APP_URL_ALLOWED_HOSTS), allowHttp: e.APP_URL_ALLOW_HTTP };
}

/** Public-safe view of a catalogue entry for authorized users (no internal audit fields). */
export interface CatalogueApp {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  category: { id: string; slug: string; name: string };
  audience: Application["audience"];
  integrationMode: Application["integrationMode"];
  status: Application["status"];
  applicationOwner: string;
  businessOwner: string;
  supportContact: string;
  featured: boolean;
  isDemo: boolean;
  initiativeRef: string | null;
  targetPeriod: string | null;
  /** Versioned, authorization-checked image URL, or null when no cover image was uploaded. */
  thumbnailUrl: string | null;
  launchable: boolean;
}

function audiencesFor(ctx: ActiveContext): Array<Application["audience"]> {
  return ctx.org.orgType === "kinra" ? ["internal", "both"] : ["tenant", "both"];
}

/**
 * Returns only the applications the active context is entitled to (FR-05, AT-01..03).
 * Filtering happens in SQL and is then re-checked by the pure policy (defence in depth).
 */
export async function listAuthorizedApps(ctx: ActiveContext | null): Promise<CatalogueApp[]> {
  if (!ctx || ctx.roles.length === 0) return [];
  const runtimeEnv = env().APP_ENV;
  const db = getDb();
  const rows = await db
    .select({ app: applications, category: categories, thumbAt: applicationThumbnails.updatedAt })
    .from(applications)
    .innerJoin(categories, eq(applications.categoryId, categories.id))
    .leftJoin(applicationThumbnails, eq(applicationThumbnails.applicationId, applications.id))
    .where(
      and(
        ne(applications.status, "retired"),
        eq(applications.environment, runtimeEnv),
        inArray(applications.audience, audiencesFor(ctx)),
        sql`exists (select 1 from ${applicationEntitlements} e
                    where e.application_id = ${applications.id}
                      and e.organization_id = ${ctx.org.id}
                      and e.role_key in ${ctx.roles})`,
      ),
    )
    .orderBy(asc(categories.displayOrder), asc(applications.displayOrder), asc(applications.name));

  if (rows.length === 0) return [];
  const ents = await entitlementsFor(ctx, rows.map((r) => r.app.id));
  return rows
    .filter((r) => canView(ctx, r.app, ents, runtimeEnv))
    .map((r) => toCatalogueApp(r.app, r.category, canLaunch(ctx, r.app, ents, runtimeEnv), r.thumbAt));
}

async function entitlementsFor(ctx: ActiveContext, appIds: string[]): Promise<EntitlementRecord[]> {
  if (appIds.length === 0) return [];
  return getDb()
    .select({
      applicationId: applicationEntitlements.applicationId,
      organizationId: applicationEntitlements.organizationId,
      roleKey: applicationEntitlements.roleKey,
    })
    .from(applicationEntitlements)
    .where(
      and(
        inArray(applicationEntitlements.applicationId, appIds),
        eq(applicationEntitlements.organizationId, ctx.org.id),
      ),
    );
}

function toCatalogueApp(app: Application, category: Category, launchable: boolean, thumbAt: Date | null): CatalogueApp {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    description: app.description,
    iconKey: app.iconKey,
    category: { id: category.id, slug: category.slug, name: category.name },
    audience: app.audience,
    integrationMode: app.integrationMode,
    status: app.status,
    applicationOwner: app.applicationOwner,
    businessOwner: app.businessOwner,
    supportContact: app.supportContact,
    featured: app.featured,
    isDemo: app.isDemo,
    initiativeRef: app.initiativeRef,
    targetPeriod: app.targetPeriod,
    thumbnailUrl: thumbAt ? `/api/apps/${app.slug}/thumbnail?v=${thumbAt.getTime()}` : null,
    launchable,
  };
}

/** Single authorized app by slug, or null. Identical result for "missing" and "forbidden". */
export async function getAuthorizedApp(ctx: ActiveContext | null, slug: string): Promise<CatalogueApp | null> {
  if (!ctx || !/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const db = getDb();
  const [row] = await db
    .select({ app: applications, category: categories, thumbAt: applicationThumbnails.updatedAt })
    .from(applications)
    .innerJoin(categories, eq(applications.categoryId, categories.id))
    .leftJoin(applicationThumbnails, eq(applicationThumbnails.applicationId, applications.id))
    .where(eq(applications.slug, slug))
    .limit(1);
  if (!row) return null;
  const runtimeEnv = env().APP_ENV;
  const ents = await entitlementsFor(ctx, [row.app.id]);
  if (!canView(ctx, row.app, ents, runtimeEnv)) return null;
  return toCatalogueApp(row.app, row.category, canLaunch(ctx, row.app, ents, runtimeEnv), row.thumbAt);
}

export type LaunchDecision =
  | { ok: true; url: string; app: CatalogueApp }
  | { ok: false; reason: "not_found_or_forbidden" | "not_launchable" | "invalid_url"; app?: CatalogueApp };

/** Resolves the launch target from trusted server-side config only (FR-06, AT-04, AT-07). */
export async function decideLaunch(ctx: ActiveContext | null, slug: string): Promise<LaunchDecision> {
  const app = await getAuthorizedApp(ctx, slug);
  if (!app) return { ok: false, reason: "not_found_or_forbidden" };
  if (!app.launchable) return { ok: false, reason: "not_launchable", app };
  const [row] = await getDb()
    .select({ targetUrl: applications.targetUrl })
    .from(applications)
    .where(eq(applications.id, app.id));
  // Re-validate at launch time: the allowlist may have been tightened since the entry was saved.
  const check = validateTargetUrl(row?.targetUrl ?? "", urlPolicy());
  if (!check.ok) return { ok: false, reason: "invalid_url", app };
  return { ok: true, url: check.url, app };
}

export async function listCategories(): Promise<Category[]> {
  return getDb().select().from(categories).orderBy(asc(categories.displayOrder), asc(categories.name));
}

// ---------------------------------------------------------------------------
// Administration (FR-08). Every function re-checks authorization server-side.
// ---------------------------------------------------------------------------

export interface AdminActor {
  sub: string;
  ctx: ActiveContext | null;
  correlationId?: string;
}

function assertAdmin(actor: AdminActor): asserts actor is AdminActor & { ctx: ActiveContext } {
  if (!isPortalAdmin(actor.ctx)) throw new ForbiddenError();
}

export async function adminListApps(actor: AdminActor) {
  assertAdmin(actor);
  return getDb()
    .select({ app: applications, category: categories })
    .from(applications)
    .innerJoin(categories, eq(applications.categoryId, categories.id))
    .orderBy(asc(categories.displayOrder), asc(applications.displayOrder), asc(applications.name));
}

export async function adminGetApp(actor: AdminActor, id: string) {
  assertAdmin(actor);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundError();
  const [app] = await getDb().select().from(applications).where(eq(applications.id, id));
  if (!app) throw new NotFoundError();
  return app;
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const rows = await getDb().select({ id: applications.id }).from(applications).where(eq(applications.slug, slug));
  if (rows.some((r) => r.id !== exceptId)) throw new ValidationError({ slug: "Slug sudah digunakan." });
}

async function assertCategory(categoryId: string) {
  const rows = await getDb().select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId));
  if (rows.length === 0) throw new ValidationError({ categoryId: "Kategori tidak ditemukan." });
}

export async function createApp(actor: AdminActor, data: unknown): Promise<Application> {
  assertAdmin(actor);
  const v = validateAppInput(data, urlPolicy());
  if (!v.ok) {
    await recordAudit({
      eventType: "catalogue.create",
      outcome: "failure",
      actorId: actor.sub,
      organizationId: actor.ctx.org.externalOrgId,
      resourceType: "application",
      metadata: { fields: Object.keys(v.errors) },
      correlationId: actor.correlationId,
    });
    throw new ValidationError(v.errors);
  }
  await assertSlugFree(v.value.slug);
  await assertCategory(v.value.categoryId);
  const [created] = await getDb()
    .insert(applications)
    .values({ ...v.value, createdBy: actor.sub, updatedBy: actor.sub })
    .returning();
  await recordAudit({
    eventType: "catalogue.create",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx.org.externalOrgId,
    resourceType: "application",
    resourceId: created!.id,
    metadata: { slug: created!.slug, status: created!.status },
    correlationId: actor.correlationId,
  });
  return created!;
}

const AUDITED_FIELDS = [
  "slug",
  "name",
  "description",
  "iconKey",
  "categoryId",
  "targetUrl",
  "audience",
  "integrationMode",
  "status",
  "environment",
  "applicationOwner",
  "businessOwner",
  "supportContact",
  "displayOrder",
  "featured",
  "initiativeRef",
  "targetPeriod",
] as const;

export async function updateApp(actor: AdminActor, id: string, data: unknown): Promise<Application> {
  const before = await adminGetApp(actor, id);
  assertAdmin(actor);
  const v = validateAppInput(data, urlPolicy());
  if (!v.ok) {
    await recordAudit({
      eventType: "catalogue.update",
      outcome: "failure",
      actorId: actor.sub,
      organizationId: actor.ctx.org.externalOrgId,
      resourceType: "application",
      resourceId: id,
      metadata: { fields: Object.keys(v.errors) },
      correlationId: actor.correlationId,
    });
    throw new ValidationError(v.errors);
  }
  await assertSlugFree(v.value.slug, id);
  await assertCategory(v.value.categoryId);
  const [updated] = await getDb()
    .update(applications)
    .set({ ...v.value, updatedBy: actor.sub, updatedAt: new Date() })
    .where(eq(applications.id, id))
    .returning();
  const changed = AUDITED_FIELDS.filter((f) => String(before[f]) !== String(updated![f]));
  await recordAudit({
    eventType: v.value.status === "retired" && before.status !== "retired" ? "catalogue.retire" : "catalogue.update",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx.org.externalOrgId,
    resourceType: "application",
    resourceId: id,
    metadata: { slug: updated!.slug, changedFields: changed, statusFrom: before.status, statusTo: updated!.status },
    correlationId: actor.correlationId,
  });
  return updated!;
}

/** Soft retirement: keeps the record (and its audit history) but makes it unlaunchable. */
export async function retireApp(actor: AdminActor, id: string): Promise<Application> {
  const before = await adminGetApp(actor, id);
  assertAdmin(actor);
  const [updated] = await getDb()
    .update(applications)
    .set({ status: "retired", featured: false, updatedBy: actor.sub, updatedAt: new Date() })
    .where(eq(applications.id, id))
    .returning();
  await recordAudit({
    eventType: "catalogue.retire",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx.org.externalOrgId,
    resourceType: "application",
    resourceId: id,
    metadata: { slug: before.slug, statusFrom: before.status },
    correlationId: actor.correlationId,
  });
  return updated!;
}

export async function listEntitlements(applicationId: string) {
  return getDb()
    .select({
      id: applicationEntitlements.id,
      roleKey: applicationEntitlements.roleKey,
      organizationId: organizations.id,
      orgName: organizations.displayName,
      orgType: organizations.orgType,
      externalOrgId: organizations.externalOrgId,
    })
    .from(applicationEntitlements)
    .innerJoin(organizations, eq(applicationEntitlements.organizationId, organizations.id))
    .where(eq(applicationEntitlements.applicationId, applicationId))
    .orderBy(asc(organizations.displayName), asc(applicationEntitlements.roleKey));
}

export async function grantEntitlement(actor: AdminActor, applicationId: string, data: unknown) {
  const app = await adminGetApp(actor, applicationId);
  assertAdmin(actor);
  const parsed = entitlementInputSchema.safeParse(data);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "_")] ??= i.message;
    throw new ValidationError(errors);
  }
  const [org] = await getDb().select().from(organizations).where(eq(organizations.id, parsed.data.organizationId));
  if (!org) throw new ValidationError({ organizationId: "Organisasi tidak ditemukan." });
  // A grant must match the application's intended audience.
  if (app.audience === "internal" && org.orgType !== "kinra") {
    throw new ValidationError({ organizationId: "Aplikasi internal hanya dapat diberikan ke organisasi KINRA." });
  }
  if (app.audience === "tenant" && org.orgType !== "tenant") {
    throw new ValidationError({ organizationId: "Aplikasi tenant hanya dapat diberikan ke organisasi tenant." });
  }
  const inserted = await getDb()
    .insert(applicationEntitlements)
    .values({ applicationId, organizationId: org.id, roleKey: parsed.data.roleKey })
    .onConflictDoNothing()
    .returning();
  await recordAudit({
    eventType: "entitlement.grant",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx.org.externalOrgId,
    resourceType: "application",
    resourceId: applicationId,
    metadata: { slug: app.slug, targetOrg: org.externalOrgId, roleKey: parsed.data.roleKey, created: inserted.length > 0 },
    correlationId: actor.correlationId,
  });
}

export async function revokeEntitlement(actor: AdminActor, applicationId: string, entitlementId: string) {
  const app = await adminGetApp(actor, applicationId);
  assertAdmin(actor);
  if (!/^[0-9a-f-]{36}$/i.test(entitlementId)) throw new NotFoundError();
  const deleted = await getDb()
    .delete(applicationEntitlements)
    .where(and(eq(applicationEntitlements.id, entitlementId), eq(applicationEntitlements.applicationId, applicationId)))
    .returning();
  if (deleted.length === 0) throw new NotFoundError();
  await recordAudit({
    eventType: "entitlement.revoke",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx.org.externalOrgId,
    resourceType: "application",
    resourceId: applicationId,
    metadata: { slug: app.slug, roleKey: deleted[0]!.roleKey, targetOrgId: deleted[0]!.organizationId },
    correlationId: actor.correlationId,
  });
}

export async function listOrganizations() {
  return getDb().select().from(organizations).orderBy(asc(organizations.orgType), asc(organizations.displayName));
}

/** Read-only effective access overview (PRD screen 7). */
export async function accessOverview() {
  return getDb()
    .select({
      appName: applications.name,
      appSlug: applications.slug,
      appStatus: applications.status,
      appEnvironment: applications.environment,
      orgName: organizations.displayName,
      orgType: organizations.orgType,
      orgStatus: organizations.status,
      roleKey: applicationEntitlements.roleKey,
    })
    .from(applicationEntitlements)
    .innerJoin(applications, eq(applicationEntitlements.applicationId, applications.id))
    .innerJoin(organizations, eq(applicationEntitlements.organizationId, organizations.id))
    .orderBy(asc(organizations.orgType), asc(organizations.displayName), asc(applications.name));
}
