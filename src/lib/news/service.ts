import "server-only";
import { and, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { newsImages, newsItems, newsSourceState, type NewsItem } from "@/lib/db/schema";
import { canManageContent } from "@/lib/authz/policy";
import type { ActiveContext } from "@/lib/authz/types";
import { recordAudit } from "@/lib/audit/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/catalogue/errors";
import { sniffImageType } from "@/lib/catalogue/thumbnail";
import { log } from "@/lib/logger";
import { env } from "@/lib/env";
import { detectCharset, ogImageFrom, parseFeed, truncate } from "./feed";
import { NEWS_SOURCES, findSource, isSourceImageUrl, isSourceUrl, preferLargeImage, type NewsKind, type NewsSource } from "./sources";
import { isNewsTopic, isRelevantExternal, topicOf, type NewsTopic } from "./topics";

const MAX_FEED_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const MAX_ITEMS_PER_SOURCE = 60;
/** Industry headlines are only useful while recent; official KINRA news is kept. */
const INDUSTRY_RETENTION_DAYS = 120;
const MIN_SYNC_INTERVAL_MS = 60_000;
const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_IMAGES_PER_SYNC = 20;
const MAX_ARTICLE_BYTES = 1536 * 1024;

export interface NewsView {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  topic: NewsTopic;
  /**
   * Cover image: a same-origin copy for KINRA's own news, else the publisher's image URL
   * (hotlinked; render with referrerPolicy="no-referrer"), else null for a generated cover.
   */
  imageUrl: string | null;
  source: { key: string; name: string; kind: NewsKind };
}

function toView(n: NewsItem, imageAt: Date | null): NewsView | null {
  const s = findSource(n.sourceKey);
  // Items from a source removed from the code list are no longer shown.
  if (!s) return null;
  return {
    id: n.id,
    title: n.title,
    summary: n.summary,
    url: n.url,
    publishedAt: n.publishedAt,
    topic: isNewsTopic(n.topic) ? n.topic : "umum",
    // External URLs were validated against the source's image hosts when stored; re-checked
    // here so a source config change takes effect immediately.
    imageUrl: imageAt
      ? `/api/news/${n.id}/image?v=${imageAt.getTime()}`
      : n.imageUrl && isSourceImageUrl(s, n.imageUrl)
        ? n.imageUrl
        : null,
    source: { key: s.key, name: s.name, kind: s.kind },
  };
}

function activeKeys(kind?: NewsKind) {
  return NEWS_SOURCES.filter((s) => !kind || s.kind === kind).map((s) => s.key);
}

function visibleWhere(kind?: NewsKind) {
  return and(eq(newsItems.hidden, false), inArray(newsItems.sourceKey, activeKeys(kind)));
}

/** Public headlines: same for every signed-in user, so no per-user filtering is needed. */
export async function listNews(opts: { kind?: NewsKind; topic?: NewsTopic; limit?: number; offset?: number } = {}) {
  const where = and(visibleWhere(opts.kind), opts.topic ? eq(newsItems.topic, opts.topic) : undefined);
  const db = getDb();
  const [rows, [total]] = await Promise.all([
    db
      .select({ item: newsItems, imageAt: newsImages.fetchedAt })
      .from(newsItems)
      .leftJoin(newsImages, eq(newsImages.newsItemId, newsItems.id))
      .where(where)
      .orderBy(desc(newsItems.publishedAt))
      .limit(Math.min(opts.limit ?? 12, 50))
      .offset(Math.max(opts.offset ?? 0, 0)),
    db.select({ n: count() }).from(newsItems).where(where),
  ]);
  return { items: rows.map((r) => toView(r.item, r.imageAt)).filter((x): x is NewsView => !!x), total: total?.n ?? 0 };
}

/** Visible headline count per topic, for the topic filter. */
export async function newsTopicCounts(kind?: NewsKind): Promise<Partial<Record<NewsTopic, number>>> {
  const rows = await getDb()
    .select({ topic: newsItems.topic, n: count() })
    .from(newsItems)
    .where(visibleWhere(kind))
    .groupBy(newsItems.topic);
  const out: Partial<Record<NewsTopic, number>> = {};
  for (const r of rows) if (isNewsTopic(r.topic)) out[r.topic] = r.n;
  return out;
}

/** Cover image of a visible headline; null when missing or hidden. */
export async function getNewsImage(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await getDb()
    .select({ contentType: newsImages.contentType, data: newsImages.data, updatedAt: newsImages.fetchedAt })
    .from(newsImages)
    .innerJoin(newsItems, eq(newsItems.id, newsImages.newsItemId))
    .where(and(eq(newsImages.newsItemId, id), visibleWhere()));
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Feed synchronisation
// ---------------------------------------------------------------------------

export interface SourceResult {
  key: string;
  ok: boolean;
  fetched: number;
  accepted: number;
  error?: string;
}

/**
 * GET with a timeout, a size cap and redirects limited to the source's own hosts (https only).
 * Every outbound request of the news module goes through here.
 */
async function fetchLimited(source: NewsSource, startUrl: string, maxBytes: number, accept: string) {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!url.startsWith("https://") || !isSourceUrl(source, url)) throw new Error("URL di luar host sumber ditolak");
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": `OneSeiMangkeiSEZ-NewsReader/1.0 (+${env().PORTAL_BASE_URL})`, Accept: accept },
      cache: "no-store",
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) throw new Error(`redirect tanpa tujuan (${res.status})`);
      url = new URL(next, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new Error("respons terlalu besar");
    const reader = res.body?.getReader();
    if (!reader) throw new Error("respons kosong");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("respons terlalu besar");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) {
      bytes.set(c, off);
      off += c.byteLength;
    }
    return { bytes, contentType: res.headers.get("content-type") };
  }
  throw new Error("terlalu banyak redirect");
}

async function fetchFeed(source: NewsSource): Promise<string> {
  const { bytes, contentType } = await fetchLimited(
    source,
    source.feedUrl,
    MAX_FEED_BYTES,
    "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
  );
  return new TextDecoder(detectCharset(bytes, contentType)).decode(bytes);
}

async function fetchJson(source: NewsSource, url: string): Promise<unknown> {
  const { bytes } = await fetchLimited(source, url, 512 * 1024, "application/json");
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** WordPress post id from a feed guid such as https://example.com/?p=123. */
export function wpPostId(guid: string): number | null {
  const m = /[?&]p=(\d{1,10})\b/.exec(guid);
  return m ? Number(m[1]) : null;
}

/** Picks a card-sized rendition from a WP media object; falls back to the original. */
export function pickWpImage(media: unknown): string | null {
  if (!media || typeof media !== "object") return null;
  const m = media as { source_url?: unknown; media_details?: { sizes?: Record<string, { source_url?: unknown }> } };
  const sizes = m.media_details?.sizes ?? {};
  for (const k of ["medium_large", "large", "full"]) {
    const u = sizes[k]?.source_url;
    if (typeof u === "string") return u;
  }
  return typeof m.source_url === "string" ? m.source_url : null;
}

/**
 * Copies featured images for new official headlines from the KINRA WordPress site (only
 * sources with `wpImages`). Images are sniffed by magic bytes; anything else is skipped.
 * Each item is checked once; failures never fail the feed sync.
 */
async function syncWpImages(source: NewsSource) {
  const db = getDb();
  const pending = await db
    .select({ id: newsItems.id, guid: newsItems.guid })
    .from(newsItems)
    .where(and(eq(newsItems.sourceKey, source.key), isNull(newsItems.imageCheckedAt)))
    .orderBy(desc(newsItems.publishedAt))
    .limit(MAX_IMAGES_PER_SYNC);
  if (pending.length === 0) return 0;
  const base = new URL(source.feedUrl).origin;
  const byPost = new Map(pending.map((p) => [wpPostId(p.guid), p.id] as const).filter(([k]) => k !== null) as Array<[number, string]>);
  let stored = 0;
  try {
    if (byPost.size) {
      const posts = (await fetchJson(source, `${base}/wp-json/wp/v2/posts?include=${[...byPost.keys()].join(",")}&per_page=${byPost.size}&_fields=id,featured_media`)) as Array<{ id: number; featured_media: number }>;
      const mediaIds = [...new Set(posts.map((p) => p.featured_media).filter((m) => Number.isInteger(m) && m > 0))];
      const media = mediaIds.length
        ? ((await fetchJson(source, `${base}/wp-json/wp/v2/media?include=${mediaIds.join(",")}&per_page=${mediaIds.length}&_fields=id,source_url,media_details`)) as Array<{ id: number }>)
        : [];
      for (const p of posts) {
        const itemId = byPost.get(p.id);
        const url = pickWpImage(media.find((m) => m.id === p.featured_media));
        if (!itemId || !url) continue;
        try {
          const { bytes } = await fetchLimited(source, url, MAX_IMAGE_BYTES, "image/webp,image/jpeg,image/png");
          const type = sniffImageType(bytes);
          if (!type) continue;
          await db
            .insert(newsImages)
            .values({ newsItemId: itemId, contentType: type, byteSize: bytes.byteLength, data: Buffer.from(bytes), sourceUrl: url })
            .onConflictDoNothing();
          stored++;
        } catch (e) {
          log("warn", "news_image_failed", { source: source.key, error: String(e).slice(0, 200) });
        }
      }
    }
  } catch (e) {
    log("warn", "news_image_lookup_failed", { source: source.key, error: String(e).slice(0, 200) });
  }
  await db.update(newsItems).set({ imageCheckedAt: new Date() }).where(inArray(newsItems.id, pending.map((p) => p.id)));
  return stored;
}

/** Turns raw feed XML into rows to store. Exported for tests (no network). */
export function entriesToRows(source: NewsSource, xml: string, now = new Date()) {
  const cutoff = now.getTime() - INDUSTRY_RETENTION_DAYS * 86_400_000;
  const entries = parseFeed(xml);
  const rows = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (!e.title || !e.url || !isSourceUrl(source, e.url)) continue;
    const guid = (e.guid || e.url).slice(0, 500);
    if (seen.has(guid)) continue;
    // Items without a usable date cannot be ordered honestly; future dates are clamped.
    if (!e.publishedAt) continue;
    const publishedAt = e.publishedAt > now ? now : e.publishedAt;
    if (source.kind === "industry" && publishedAt.getTime() < cutoff) continue;
    if (source.filter === "priority" && !isRelevantExternal(`${e.title} ${e.summary}`)) continue;
    seen.add(guid);
    rows.push({
      sourceKey: source.key,
      guid,
      title: truncate(e.title, 300),
      summary: truncate(e.summary, 280),
      url: e.url.slice(0, 2048),
      publishedAt,
      topic: topicOf(`${e.title} ${e.summary}`),
      imageUrl: e.imageUrl && isSourceImageUrl(source, e.imageUrl) ? preferLargeImage(e.imageUrl).slice(0, 2048) : null,
    });
    if (rows.length >= MAX_ITEMS_PER_SOURCE) break;
  }
  return { fetched: entries.length, rows };
}

async function syncSource(source: NewsSource, fetcher: (s: NewsSource) => Promise<string>): Promise<SourceResult> {
  const db = getDb();
  const attemptAt = new Date();
  try {
    const { fetched, rows } = entriesToRows(source, await fetcher(source), attemptAt);
    if (rows.length) {
      await db
        .insert(newsItems)
        .values(rows)
        .onConflictDoUpdate({
          target: [newsItems.sourceKey, newsItems.guid],
          // Editorial visibility (hidden) is never overwritten by a sync.
          set: {
            title: sql`excluded.title`,
            summary: sql`excluded.summary`,
            url: sql`excluded.url`,
            publishedAt: sql`excluded.published_at`,
            topic: sql`excluded.topic`,
            // Keep an image found earlier (e.g. via og:image) when the feed has none.
            // Qualified explicitly: a bare column would be ambiguous with `excluded`.
            imageUrl: sql`coalesce(excluded.image_url, news_items.image_url)`,
          },
        });
    }
    await db
      .insert(newsSourceState)
      .values({ sourceKey: source.key, lastAttemptAt: attemptAt, lastSuccessAt: attemptAt, lastError: null, lastFetched: fetched, lastAccepted: rows.length })
      .onConflictDoUpdate({
        target: newsSourceState.sourceKey,
        set: { lastAttemptAt: attemptAt, lastSuccessAt: attemptAt, lastError: null, lastFetched: fetched, lastAccepted: rows.length },
      });
    if (fetcher === fetchFeed) {
      if (source.wpImages) await syncWpImages(source);
      if (source.ogImage) await syncOgImages(source);
    }
    return { key: source.key, ok: true, fetched, accepted: rows.length };
  } catch (e) {
    const error = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    log("warn", "news_sync_source_failed", { source: source.key, error });
    await db
      .insert(newsSourceState)
      .values({ sourceKey: source.key, lastAttemptAt: attemptAt, lastError: error })
      .onConflictDoUpdate({ target: newsSourceState.sourceKey, set: { lastAttemptAt: attemptAt, lastError: error } });
    return { key: source.key, ok: false, fetched: 0, accepted: 0, error };
  }
}

/**
 * For feeds without images: reads og:image from the article page of new items (only those that
 * passed the relevance filter, at most MAX_IMAGES_PER_SYNC per run, each checked once). Only the
 * URL is stored; the image itself is never downloaded.
 */
async function syncOgImages(source: NewsSource) {
  const db = getDb();
  const pending = await db
    .select({ id: newsItems.id, url: newsItems.url })
    .from(newsItems)
    .where(and(eq(newsItems.sourceKey, source.key), isNull(newsItems.imageUrl), isNull(newsItems.imageCheckedAt)))
    .orderBy(desc(newsItems.publishedAt))
    .limit(MAX_IMAGES_PER_SYNC);
  for (const p of pending) {
    let imageUrl: string | null = null;
    try {
      const { bytes } = await fetchLimited(source, p.url.replace(/^http:/, "https:"), MAX_ARTICLE_BYTES, "text/html");
      const og = ogImageFrom(new TextDecoder().decode(bytes));
      if (og && isSourceImageUrl(source, og)) imageUrl = og.slice(0, 2048);
    } catch (e) {
      log("warn", "news_og_image_failed", { source: source.key, error: String(e).slice(0, 200) });
    }
    await db.update(newsItems).set({ imageUrl, imageCheckedAt: new Date() }).where(eq(newsItems.id, p.id));
  }
}

/**
 * Re-derives topics for stored headlines that have dropped out of their feed (and for rows
 * created before topics existed). The table is small: retention keeps it to a few hundred rows.
 */
async function retopic() {
  const db = getDb();
  const rows = await db
    .select({ id: newsItems.id, sourceKey: newsItems.sourceKey, title: newsItems.title, summary: newsItems.summary, topic: newsItems.topic })
    .from(newsItems);
  const irrelevant: string[] = [];
  for (const r of rows) {
    const text = `${r.title} ${r.summary}`;
    // Filter rules changed since the item was stored: external news must still be relevant.
    if (findSource(r.sourceKey)?.filter === "priority" && !isRelevantExternal(text)) {
      irrelevant.push(r.id);
      continue;
    }
    const t = topicOf(text);
    if (t !== r.topic) await db.update(newsItems).set({ topic: t }).where(eq(newsItems.id, r.id));
  }
  if (irrelevant.length) await db.delete(newsItems).where(inArray(newsItems.id, irrelevant));
}

/**
 * Reads every configured feed. Called by the admin "sync now" action and by the scheduler
 * endpoint. A failing source never blocks the others; its error is stored for the admin view.
 */
export async function runNewsSync(
  trigger: { actorId: string | null; organizationId: string | null; correlationId?: string },
  fetcher: (s: NewsSource) => Promise<string> = fetchFeed,
): Promise<SourceResult[]> {
  const db = getDb();
  const [latest] = await db.select({ at: sql<Date | null>`max(${newsSourceState.lastAttemptAt})` }).from(newsSourceState);
  const last = latest?.at ? new Date(latest.at) : null;
  if (last && Date.now() - last.getTime() < MIN_SYNC_INTERVAL_MS) {
    throw new ValidationError({ _: "Sinkronisasi baru saja dijalankan. Coba lagi dalam satu menit." });
  }
  const results = await Promise.all(NEWS_SOURCES.map((s) => syncSource(s, fetcher)));
  await retopic();
  const cutoff = new Date(Date.now() - INDUSTRY_RETENTION_DAYS * 86_400_000);
  await db.delete(newsItems).where(and(inArray(newsItems.sourceKey, activeKeys("industry")), lt(newsItems.publishedAt, cutoff)));
  await recordAudit({
    eventType: "news.sync",
    outcome: results.every((r) => r.ok) ? "success" : "failure",
    actorId: trigger.actorId,
    organizationId: trigger.organizationId,
    resourceType: "news",
    metadata: { results: results.map((r) => ({ key: r.key, ok: r.ok, accepted: r.accepted })) },
    correlationId: trigger.correlationId,
  });
  return results;
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export interface NewsActor {
  sub: string;
  ctx: ActiveContext | null;
  correlationId?: string;
}

function assertManager(actor: NewsActor): asserts actor is NewsActor & { ctx: ActiveContext } {
  if (!canManageContent(actor.ctx)) throw new ForbiddenError();
}

export async function adminSyncNews(actor: NewsActor) {
  assertManager(actor);
  return runNewsSync({ actorId: actor.sub, organizationId: actor.ctx.org.externalOrgId, correlationId: actor.correlationId });
}

export async function adminNewsOverview(actor: NewsActor, page = 1) {
  assertManager(actor);
  const db = getDb();
  const size = 30;
  const [items, [total], states] = await Promise.all([
    db
      .select()
      .from(newsItems)
      .orderBy(desc(newsItems.publishedAt))
      .limit(size)
      .offset((Math.max(page, 1) - 1) * size),
    db.select({ n: count() }).from(newsItems),
    db.select().from(newsSourceState),
  ]);
  const counts = await db
    .select({ key: newsItems.sourceKey, n: count() })
    .from(newsItems)
    .where(eq(newsItems.hidden, false))
    .groupBy(newsItems.sourceKey);
  return {
    items,
    total: total?.n ?? 0,
    pageSize: size,
    sources: NEWS_SOURCES.map((s) => ({
      key: s.key,
      name: s.name,
      kind: s.kind,
      feedUrl: s.feedUrl,
      filtered: s.filter === "priority",
      visible: counts.find((c) => c.key === s.key)?.n ?? 0,
      state: states.find((x) => x.sourceKey === s.key) ?? null,
    })),
  };
}

export async function setNewsHidden(actor: NewsActor, id: string, hidden: boolean) {
  assertManager(actor);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundError();
  const [row] = await getDb()
    .update(newsItems)
    .set({ hidden, hiddenBy: hidden ? actor.sub : null })
    .where(eq(newsItems.id, id))
    .returning();
  if (!row) throw new NotFoundError();
  await recordAudit({
    eventType: "news.visibility",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx.org.externalOrgId,
    resourceType: "news_item",
    resourceId: id,
    metadata: { hidden, source: row.sourceKey },
    correlationId: actor.correlationId,
  });
  return row;
}
