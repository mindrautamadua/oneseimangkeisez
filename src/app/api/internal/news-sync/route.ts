import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { currentCorrelationId } from "@/lib/audit/audit";
import { ValidationError } from "@/lib/catalogue/errors";
import { runNewsSync } from "@/lib/news/service";
import { jsonError } from "@/lib/request";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

function tokenMatches(header: string | null, token: string): boolean {
  const given = Buffer.from(header?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Scheduler hook for refreshing news feeds (e.g. cron every 30 minutes):
 *   curl -X POST -H "Authorization: Bearer $NEWS_SYNC_TOKEN" https://<portal>/api/internal/news-sync
 * Disabled (404) unless NEWS_SYNC_TOKEN is configured. Returns only per-source counts.
 */
export async function POST(req: Request) {
  const token = env().NEWS_SYNC_TOKEN;
  if (!token) return jsonError(404, "not_found", "Data tidak ditemukan.");
  if (!tokenMatches(req.headers.get("authorization"), token)) return jsonError(401, "unauthenticated", "Token tidak valid.");
  const correlationId = await currentCorrelationId();
  try {
    const results = await runNewsSync({ actorId: "system:news-sync", organizationId: null, correlationId });
    return NextResponse.json({ results: results.map(({ key, ok, accepted }) => ({ key, ok, accepted })) });
  } catch (e) {
    if (e instanceof ValidationError) return jsonError(429, "too_soon", "Sinkronisasi baru saja dijalankan.");
    log("error", "news_sync_failed", { correlationId, error: String(e) });
    return jsonError(500, "internal_error", "Sinkronisasi gagal.", { correlationId });
  }
}
