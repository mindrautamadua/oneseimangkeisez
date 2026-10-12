import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  announcementAcks,
  announcementTargets,
  announcements,
  organizations,
  type Announcement,
} from "@/lib/db/schema";
import { canManageContent, canViewAnnouncement, type AnnouncementTargetRecord } from "@/lib/authz/policy";
import type { ActiveContext } from "@/lib/authz/types";
import { recordAudit } from "@/lib/audit/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/catalogue/errors";
import { expandTargets, validateAnnouncementInput, type AnnouncementInput } from "./validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reader-safe view: no internal actor identifiers. */
export interface AnnouncementView {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  priority: Announcement["priority"];
  publisher: string;
  publishAt: Date;
  expiresAt: Date | null;
  updatedAt: Date;
  /** True when the content changed after first publication. */
  revised: boolean;
  requiresAck: boolean;
  /** When the current user confirmed the current version, if they did. */
  ackedAt: Date | null;
  isDemo: boolean;
}

export interface Reader {
  sub: string;
  name: string;
  ctx: ActiveContext | null;
}

function audiencesFor(ctx: ActiveContext): Array<Announcement["audience"]> {
  return ctx.org.orgType === "kinra" ? ["internal", "both"] : ["tenant", "both"];
}

const PRIORITY_RANK = sql`case ${announcements.priority} when 'critical' then 0 when 'high' then 1 else 2 end`;

/**
 * Live announcements for the active context (FR-13). Filtered in SQL, then re-checked by the
 * pure policy (defence in depth), the same pattern as the catalogue.
 */
async function queryVisible(ctx: ActiveContext, now: Date, opts: { id?: string; limit?: number }) {
  const db = getDb();
  const rows = await db
    .select()
    .from(announcements)
    .where(
      and(
        opts.id ? eq(announcements.id, opts.id) : undefined,
        eq(announcements.status, "published"),
        lte(announcements.publishAt, now),
        or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
        inArray(announcements.audience, audiencesFor(ctx)),
        sql`(not exists (select 1 from ${announcementTargets} t where t.announcement_id = ${announcements.id})
             or exists (select 1 from ${announcementTargets} t
                        where t.announcement_id = ${announcements.id}
                          and (t.organization_id is null or t.organization_id = ${ctx.org.id})
                          and (t.role_key is null or t.role_key in ${ctx.roles})))`,
      ),
    )
    .orderBy(PRIORITY_RANK, desc(announcements.publishAt))
    .limit(opts.limit ?? 50);
  if (rows.length === 0) return [];
  const targets = await targetsFor(rows.map((r) => r.id));
  return rows.filter((r) => canViewAnnouncement(ctx, r, targets.get(r.id) ?? [], now));
}

async function targetsFor(ids: string[]): Promise<Map<string, AnnouncementTargetRecord[]>> {
  const map = new Map<string, AnnouncementTargetRecord[]>();
  if (ids.length === 0) return map;
  const rows = await getDb()
    .select({
      announcementId: announcementTargets.announcementId,
      organizationId: announcementTargets.organizationId,
      roleKey: announcementTargets.roleKey,
    })
    .from(announcementTargets)
    .where(inArray(announcementTargets.announcementId, ids));
  for (const r of rows) {
    if (!map.has(r.announcementId)) map.set(r.announcementId, []);
    map.get(r.announcementId)!.push({ organizationId: r.organizationId, roleKey: r.roleKey });
  }
  return map;
}

async function acksFor(sub: string, rows: Announcement[]): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  const needing = rows.filter((r) => r.requiresAck);
  if (needing.length === 0) return map;
  const acks = await getDb()
    .select({ announcementId: announcementAcks.announcementId, version: announcementAcks.version, ackedAt: announcementAcks.ackedAt })
    .from(announcementAcks)
    .where(and(eq(announcementAcks.subject, sub), inArray(announcementAcks.announcementId, needing.map((r) => r.id))));
  const version = new Map(needing.map((r) => [r.id, r.version]));
  for (const a of acks) if (version.get(a.announcementId) === a.version) map.set(a.announcementId, a.ackedAt);
  return map;
}

function toView(a: Announcement, ackedAt: Date | null): AnnouncementView {
  return {
    id: a.id,
    title: a.title,
    summary: a.summary,
    body: a.body,
    category: a.category,
    priority: a.priority,
    publisher: a.publisher,
    publishAt: a.publishAt!,
    expiresAt: a.expiresAt,
    updatedAt: a.updatedAt,
    revised: a.version > 1,
    requiresAck: a.requiresAck,
    ackedAt,
    isDemo: a.isDemo,
  };
}

export async function listVisibleAnnouncements(reader: Reader, limit = 50): Promise<AnnouncementView[]> {
  if (!reader.ctx || reader.ctx.roles.length === 0) return [];
  const rows = await queryVisible(reader.ctx, new Date(), { limit });
  const acks = await acksFor(reader.sub, rows);
  return rows.map((r) => toView(r, acks.get(r.id) ?? null));
}

/** Identical null result for missing, expired, draft and not-targeted announcements. */
export async function getVisibleAnnouncement(reader: Reader, id: string): Promise<AnnouncementView | null> {
  if (!reader.ctx || reader.ctx.roles.length === 0 || !UUID.test(id)) return null;
  const [row] = await queryVisible(reader.ctx, new Date(), { id, limit: 1 });
  if (!row) return null;
  const acks = await acksFor(reader.sub, [row]);
  return toView(row, acks.get(row.id) ?? null);
}

/**
 * Records that the session user read the current version. Identity comes from the session
 * only; the announcement must be visible to them right now. Idempotent.
 */
export async function acknowledgeAnnouncement(reader: Reader, id: string, correlationId?: string): Promise<Date> {
  const view = await getVisibleAnnouncement(reader, id);
  if (!view || !reader.ctx) throw new NotFoundError();
  if (!view.requiresAck) throw new ValidationError({ _: "Pengumuman ini tidak memerlukan konfirmasi." });
  if (view.ackedAt) return view.ackedAt;
  const [current] = await getDb().select({ version: announcements.version }).from(announcements).where(eq(announcements.id, id));
  const [row] = await getDb()
    .insert(announcementAcks)
    .values({
      announcementId: id,
      version: current!.version,
      subject: reader.sub,
      subjectName: reader.name.slice(0, 200),
      organizationId: reader.ctx.org.id,
    })
    .onConflictDoNothing()
    .returning({ ackedAt: announcementAcks.ackedAt });
  await recordAudit({
    eventType: "announcement.ack",
    outcome: "success",
    actorId: reader.sub,
    organizationId: reader.ctx.org.externalOrgId,
    resourceType: "announcement",
    resourceId: id,
    metadata: { version: current!.version },
    correlationId,
  });
  return row?.ackedAt ?? new Date();
}

// ---------------------------------------------------------------------------
// Administration. Every function re-checks authorization server-side.
// ---------------------------------------------------------------------------

export interface ContentActor {
  sub: string;
  ctx: ActiveContext | null;
  correlationId?: string;
}

function assertManager(actor: ContentActor): asserts actor is ContentActor & { ctx: ActiveContext } {
  if (!canManageContent(actor.ctx)) throw new ForbiddenError();
}

export type AdminAnnouncementState = "draft" | "scheduled" | "active" | "expired" | "withdrawn";

export function announcementState(a: Pick<Announcement, "status" | "publishAt" | "expiresAt">, now = new Date()): AdminAnnouncementState {
  if (a.status === "draft") return "draft";
  if (a.status === "withdrawn") return "withdrawn";
  if (a.publishAt && a.publishAt > now) return "scheduled";
  if (a.expiresAt && a.expiresAt <= now) return "expired";
  return "active";
}

export async function adminListAnnouncements(actor: ContentActor) {
  assertManager(actor);
  const db = getDb();
  const rows = await db.select().from(announcements).orderBy(desc(announcements.updatedAt)).limit(200);
  if (rows.length === 0) return [];
  const counts = await db
    .select({ id: announcementAcks.announcementId, version: announcementAcks.version, n: sql<number>`count(*)::int` })
    .from(announcementAcks)
    .where(inArray(announcementAcks.announcementId, rows.map((r) => r.id)))
    .groupBy(announcementAcks.announcementId, announcementAcks.version);
  const targets = await targetsFor(rows.map((r) => r.id));
  return rows.map((a) => ({
    announcement: a,
    state: announcementState(a),
    targeted: (targets.get(a.id) ?? []).length > 0,
    ackCount: counts.find((c) => c.id === a.id && c.version === a.version)?.n ?? 0,
  }));
}

export async function adminGetAnnouncement(actor: ContentActor, id: string) {
  assertManager(actor);
  if (!UUID.test(id)) throw new NotFoundError();
  const db = getDb();
  const [a] = await db.select().from(announcements).where(eq(announcements.id, id));
  if (!a) throw new NotFoundError();
  const targets = (await targetsFor([id])).get(id) ?? [];
  const acks = await db
    .select({
      subject: announcementAcks.subject,
      subjectName: announcementAcks.subjectName,
      version: announcementAcks.version,
      ackedAt: announcementAcks.ackedAt,
      orgName: organizations.displayName,
    })
    .from(announcementAcks)
    .innerJoin(organizations, eq(organizations.id, announcementAcks.organizationId))
    .where(eq(announcementAcks.announcementId, id))
    .orderBy(desc(announcementAcks.ackedAt))
    .limit(500);
  return {
    announcement: a,
    state: announcementState(a),
    targetOrganizationIds: [...new Set(targets.map((t) => t.organizationId).filter((x): x is string => !!x))],
    targetRoleKeys: [...new Set(targets.map((t) => t.roleKey).filter((x): x is string => !!x))],
    acks,
  };
}

/** Target organizations must exist and fit the audience (no internal org on a tenant notice). */
async function assertTargetsFit(v: AnnouncementInput) {
  if (v.targetOrganizationIds.length === 0) return;
  const rows = await getDb()
    .select({ id: organizations.id, orgType: organizations.orgType })
    .from(organizations)
    .where(inArray(organizations.id, v.targetOrganizationIds));
  if (rows.length !== v.targetOrganizationIds.length) {
    throw new ValidationError({ targetOrganizationIds: "Organisasi target tidak ditemukan." });
  }
  const allowed = v.audience === "both" ? ["kinra", "tenant"] : v.audience === "internal" ? ["kinra"] : ["tenant"];
  if (rows.some((r) => !allowed.includes(r.orgType))) {
    throw new ValidationError({ targetOrganizationIds: "Organisasi target tidak sesuai dengan audiens." });
  }
}

async function validated(actor: ContentActor & { ctx: ActiveContext }, data: unknown, event: "announcement.create" | "announcement.update", id?: string) {
  const v = validateAnnouncementInput(data);
  if (!v.ok) {
    await recordAudit({
      eventType: event,
      outcome: "failure",
      actorId: actor.sub,
      organizationId: actor.ctx.org.externalOrgId,
      resourceType: "announcement",
      resourceId: id ?? null,
      metadata: { fields: Object.keys(v.errors) },
      correlationId: actor.correlationId,
    });
    throw new ValidationError(v.errors);
  }
  await assertTargetsFit(v.value);
  return v.value;
}

function contentColumns(v: AnnouncementInput) {
  return {
    title: v.title,
    summary: v.summary,
    body: v.body,
    category: v.category,
    priority: v.priority,
    audience: v.audience,
    publisher: v.publisher,
    publishAt: v.publishAt,
    expiresAt: v.expiresAt,
    requiresAck: v.requiresAck,
  };
}

/** Creates a draft. Publishing is a separate, explicit action. */
export async function createAnnouncement(actor: ContentActor, data: unknown): Promise<Announcement> {
  assertManager(actor);
  const v = await validated(actor, data, "announcement.create");
  const created = await getDb().transaction(async (tx) => {
    const [a] = await tx
      .insert(announcements)
      .values({ ...contentColumns(v), status: "draft", createdBy: actor.sub, updatedBy: actor.sub })
      .returning();
    const targets = expandTargets(v.targetOrganizationIds, v.targetRoleKeys);
    if (targets.length) await tx.insert(announcementTargets).values(targets.map((t) => ({ ...t, announcementId: a!.id })));
    return a!;
  });
  await recordAudit({
    eventType: "announcement.create",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx.org.externalOrgId,
    resourceType: "announcement",
    resourceId: created.id,
    metadata: { priority: created.priority, audience: created.audience, targets: v.targetOrganizationIds.length + v.targetRoleKeys.length },
    correlationId: actor.correlationId,
  });
  return created;
}

const READER_FIELDS = ["title", "summary", "body", "requiresAck"] as const;

/**
 * Updates content and targeting. Once an announcement has been published, any change to what
 * readers confirm bumps the version so earlier confirmations no longer count.
 */
export async function updateAnnouncement(actor: ContentActor, id: string, data: unknown): Promise<Announcement> {
  assertManager(actor);
  const before = (await adminGetAnnouncement(actor, id)).announcement;
  if (before.status === "withdrawn") throw new ValidationError({ _: "Pengumuman yang sudah ditarik tidak dapat diubah." });
  const v = await validated(actor, data, "announcement.update", id);
  if (before.status === "published" && !v.publishAt) {
    throw new ValidationError({ publishAt: "Pengumuman terbit harus memiliki waktu tayang." });
  }
  const cols = contentColumns(v);
  const changed = (Object.keys(cols) as Array<keyof typeof cols>).filter((k) => {
    const a = before[k];
    const b = cols[k];
    return a instanceof Date || b instanceof Date ? (a as Date | null)?.getTime() !== (b as Date | null)?.getTime() : a !== b;
  });
  const bump = before.publishedBy !== null && READER_FIELDS.some((f) => changed.includes(f));
  const updated = await getDb().transaction(async (tx) => {
    const [a] = await tx
      .update(announcements)
      .set({ ...cols, updatedBy: actor.sub, updatedAt: new Date(), version: bump ? before.version + 1 : before.version })
      .where(eq(announcements.id, id))
      .returning();
    await tx.delete(announcementTargets).where(eq(announcementTargets.announcementId, id));
    const targets = expandTargets(v.targetOrganizationIds, v.targetRoleKeys);
    if (targets.length) await tx.insert(announcementTargets).values(targets.map((t) => ({ ...t, announcementId: id })));
    return a!;
  });
  await recordAudit({
    eventType: "announcement.update",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx!.org.externalOrgId,
    resourceType: "announcement",
    resourceId: id,
    metadata: { changed, version: updated.version, targetsReplaced: true },
    correlationId: actor.correlationId,
  });
  return updated;
}

/** Publishes now, or at the stored future `publishAt` (scheduled). Also re-publishes a withdrawn item. */
export async function publishAnnouncement(actor: ContentActor, id: string): Promise<Announcement> {
  assertManager(actor);
  const before = (await adminGetAnnouncement(actor, id)).announcement;
  if (before.status === "published") return before;
  const now = new Date();
  const publishAt = before.publishAt && before.publishAt > now ? before.publishAt : now;
  if (before.expiresAt && before.expiresAt <= publishAt) {
    throw new ValidationError({ expiresAt: "Waktu berakhir sudah lewat. Perbarui sebelum menerbitkan." });
  }
  const [a] = await getDb()
    .update(announcements)
    .set({ status: "published", publishAt, publishedBy: actor.sub, withdrawnAt: null, withdrawnBy: null, updatedBy: actor.sub, updatedAt: now })
    .where(eq(announcements.id, id))
    .returning();
  await recordAudit({
    eventType: "announcement.publish",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx!.org.externalOrgId,
    resourceType: "announcement",
    resourceId: id,
    metadata: { priority: a!.priority, audience: a!.audience, scheduled: publishAt > now, version: a!.version },
    correlationId: actor.correlationId,
  });
  return a!;
}

export async function withdrawAnnouncement(actor: ContentActor, id: string): Promise<Announcement> {
  assertManager(actor);
  const before = (await adminGetAnnouncement(actor, id)).announcement;
  if (before.status !== "published") throw new ValidationError({ _: "Hanya pengumuman terbit yang dapat ditarik." });
  const now = new Date();
  const [a] = await getDb()
    .update(announcements)
    .set({ status: "withdrawn", withdrawnAt: now, withdrawnBy: actor.sub, updatedBy: actor.sub, updatedAt: now })
    .where(eq(announcements.id, id))
    .returning();
  await recordAudit({
    eventType: "announcement.withdraw",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx!.org.externalOrgId,
    resourceType: "announcement",
    resourceId: id,
    metadata: { priority: a!.priority },
    correlationId: actor.correlationId,
  });
  return a!;
}

/** Organizations selectable as targets in the admin form. */
export async function adminListTargetOrgs(actor: ContentActor) {
  assertManager(actor);
  return getDb()
    .select({ id: organizations.id, displayName: organizations.displayName, orgType: organizations.orgType, status: organizations.status })
    .from(organizations)
    .orderBy(asc(organizations.orgType), asc(organizations.displayName));
}
