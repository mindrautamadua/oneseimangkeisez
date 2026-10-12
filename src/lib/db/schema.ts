import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const audienceEnum = pgEnum("audience", ["internal", "tenant", "both"]);
export const orgTypeEnum = pgEnum("org_type", ["kinra", "tenant"]);
export const orgStatusEnum = pgEnum("org_status", ["active", "suspended"]);
export const integrationModeEnum = pgEnum("integration_mode", [
  "oidc_sso",
  "saml_sso",
  "authenticated_link",
  "external_link",
]);
export const appStatusEnum = pgEnum("app_status", [
  "available",
  "pilot",
  "planned",
  "maintenance",
  "retired",
]);
export const appEnvironmentEnum = pgEnum("app_environment", ["production", "staging", "development"]);
export const auditOutcomeEnum = pgEnum("audit_outcome", ["success", "failure", "denied"]);
export const announcementPriorityEnum = pgEnum("announcement_priority", ["critical", "high", "normal"]);
/** Scheduling is derived: a published announcement with publish_at in the future is "scheduled". */
export const announcementStatusEnum = pgEnum("announcement_status", ["draft", "published", "withdrawn"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(100),
  audienceScope: audienceEnum("audience_scope").notNull(),
  ...timestamps,
});

/**
 * Local mapping of IAM organization identifiers to portal metadata.
 * The IAM provider stays the source of truth for membership; this table only
 * classifies orgs (kinra vs tenant) and lets admins suspend portal access.
 */
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalOrgId: text("external_org_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  orgType: orgTypeEnum("org_type").notNull(),
  status: orgStatusEnum("status").notNull().default("active"),
  ...timestamps,
});

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    iconKey: text("icon_key").notNull().default("app-window"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    targetUrl: text("target_url").notNull(),
    audience: audienceEnum("audience").notNull(),
    integrationMode: integrationModeEnum("integration_mode").notNull(),
    status: appStatusEnum("status").notNull().default("planned"),
    environment: appEnvironmentEnum("environment").notNull().default("production"),
    ownerOrgId: uuid("owner_org_id").references(() => organizations.id, { onDelete: "set null" }),
    applicationOwner: text("application_owner").notNull(),
    businessOwner: text("business_owner").notNull(),
    supportContact: text("support_contact").notNull(),
    displayOrder: integer("display_order").notNull().default(100),
    featured: boolean("featured").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    /** Roadmap reference, e.g. RSTI initiative code "IT-08". Informational only. */
    initiativeRef: text("initiative_ref"),
    /** Planned delivery period from the roadmap, e.g. "2026–27". Informational only. */
    targetPeriod: text("target_period"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    ...timestamps,
  },
  (t) => [
    index("applications_category_idx").on(t.categoryId),
    check("applications_target_url_scheme", sql`${t.targetUrl} ~* '^https?://'`),
  ],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * Optional cover image per catalogue entry. Stored in the portal DB (small, admin-curated) so
 * deployments need no object storage. Served only through authorized routes.
 */
export const applicationThumbnails = pgTable(
  "application_thumbnails",
  {
    applicationId: uuid("application_id")
      .primaryKey()
      .references(() => applications.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    data: bytea("data").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("application_thumbnails_type", sql`${t.contentType} in ('image/png', 'image/jpeg', 'image/webp')`)],
);

/**
 * Portal-owned grant: members of `organizationId` holding `roleKey` may access
 * `applicationId`. Deny-by-default: no row means no access.
 */
export const applicationEntitlements = pgTable(
  "application_entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleKey: text("role_key").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("entitlement_unique").on(t.applicationId, t.organizationId, t.roleKey),
    index("entitlement_org_idx").on(t.organizationId),
  ],
);

/** Append-only audit trail. UPDATE/DELETE are blocked by a database trigger. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: text("actor_id"),
    organizationId: text("organization_id"),
    eventType: text("event_type").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    outcome: auditOutcomeEnum("outcome").notNull(),
    correlationId: text("correlation_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index("audit_occurred_idx").on(t.occurredAt),
    index("audit_type_idx").on(t.eventType),
    index("audit_actor_idx").on(t.actorId),
  ],
);

/**
 * Official portal announcements (PRD FR-13). Never hard-deleted: withdrawal keeps the record
 * and its acknowledgments as audit evidence. Body is plain text, rendered escaped.
 */
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    category: text("category").notNull(),
    priority: announcementPriorityEnum("priority").notNull().default("normal"),
    status: announcementStatusEnum("status").notNull().default("draft"),
    audience: audienceEnum("audience").notNull(),
    /** Issuing unit shown to readers, e.g. "Divisi TI". */
    publisher: text("publisher").notNull(),
    /** Visible from this moment (required once published). */
    publishAt: timestamp("publish_at", { withTimezone: true }),
    /** Hidden after this moment; null = until withdrawn. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    requiresAck: boolean("requires_ack").notNull().default(false),
    /** Incremented on every content change; acknowledgments apply to one version. */
    version: integer("version").notNull().default(1),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    publishedBy: text("published_by"),
    withdrawnBy: text("withdrawn_by"),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("announcements_visible_idx").on(t.status, t.publishAt),
    check("announcements_published_has_date", sql`${t.status} = 'draft' or ${t.publishAt} is not null`),
    check("announcements_window", sql`${t.expiresAt} is null or ${t.publishAt} is null or ${t.expiresAt} > ${t.publishAt}`),
  ],
);

/**
 * Optional narrowing of an announcement's audience. No rows = everyone in the audience.
 * With rows, a reader must match at least one: (organization is null or = active org) and
 * (role is null or held in the active org).
 */
export const announcementTargets = pgTable(
  "announcement_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
    roleKey: text("role_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("announcement_targets_ann_idx").on(t.announcementId),
    check("announcement_targets_not_empty", sql`${t.organizationId} is not null or ${t.roleKey} is not null`),
  ],
);

/** Append-only read confirmations. `subject` is the IdP subject from the session, never from input. */
export const announcementAcks = pgTable(
  "announcement_acks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    subject: text("subject").notNull(),
    /** Display name from the session at confirmation time (IdP holds no copy in the portal). */
    subjectName: text("subject_name").notNull(),
    /** Org context active when confirming. */
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    ackedAt: timestamp("acked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("announcement_acks_unique").on(t.announcementId, t.version, t.subject)],
);

/**
 * Headlines collected from public RSS feeds (sources are fixed in code, see lib/news/sources.ts).
 * Only title, a short plain-text excerpt and the original link are kept; readers go to the source.
 */
export const newsItems = pgTable(
  "news_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceKey: text("source_key").notNull(),
    guid: text("guid").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    hidden: boolean("hidden").notNull().default(false),
    hiddenBy: text("hidden_by"),
    /** Derived at sync time from title + excerpt (lib/news/topics.ts). */
    topic: text("topic").notNull().default("umum"),
    /**
     * Publisher's own image URL, shown by hotlinking (never copied to the portal). Only https URLs on
     * the source's `imageHosts`, which are also the only external hosts allowed by the CSP.
     */
    imageUrl: text("image_url"),
    /** Last attempt to look up a cover image (WP copy or og:image); avoids refetching every sync. */
    imageCheckedAt: timestamp("image_checked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("news_items_source_guid").on(t.sourceKey, t.guid),
    index("news_items_published_idx").on(t.publishedAt),
    check("news_items_url_scheme", sql`${t.url} ~* '^https?://'`),
  ],
);

/**
 * Cover photos for official KINRA news only, copied from KINRA's own website so the page needs
 * no third-party image hosts (CSP img-src 'self'). Third-party media images are never stored.
 */
export const newsImages = pgTable(
  "news_images",
  {
    newsItemId: uuid("news_item_id")
      .primaryKey()
      .references(() => newsItems.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    data: bytea("data").notNull(),
    sourceUrl: text("source_url").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("news_images_type", sql`${t.contentType} in ('image/png', 'image/jpeg', 'image/webp')`)],
);

/** Last synchronisation result per news source, shown honestly in admin. */
export const newsSourceState = pgTable("news_source_state", {
  sourceKey: text("source_key").primaryKey(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastError: text("last_error"),
  lastFetched: integer("last_fetched").notNull().default(0),
  lastAccepted: integer("last_accepted").notNull().default(0),
});

export type Category = typeof categories.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationEntitlement = typeof applicationEntitlements.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AnnouncementTarget = typeof announcementTargets.$inferSelect;
export type NewsItem = typeof newsItems.$inferSelect;
