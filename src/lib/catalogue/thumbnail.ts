import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applicationThumbnails } from "@/lib/db/schema";
import { recordAudit } from "@/lib/audit/audit";
import { adminGetApp, getAuthorizedApp, type AdminActor } from "./service";
import type { ActiveContext } from "@/lib/authz/types";
import { NotFoundError, ValidationError } from "./errors";

export const THUMBNAIL_MAX_BYTES = 1024 * 1024;
export const THUMBNAIL_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type ThumbnailType = (typeof THUMBNAIL_TYPES)[number];

/**
 * Detects the image type from magic bytes. The declared Content-Type is never trusted, and SVG
 * is deliberately unsupported (it can carry script).
 */
export function sniffImageType(buf: Uint8Array): ThumbnailType | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 12 &&
    String.fromCharCode(...buf.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...buf.subarray(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export interface StoredThumbnail {
  contentType: string;
  data: Buffer;
  updatedAt: Date;
}

async function readThumbnail(applicationId: string): Promise<StoredThumbnail | null> {
  const [row] = await getDb()
    .select({ contentType: applicationThumbnails.contentType, data: applicationThumbnails.data, updatedAt: applicationThumbnails.updatedAt })
    .from(applicationThumbnails)
    .where(eq(applicationThumbnails.applicationId, applicationId));
  return row ?? null;
}

/** Cover image for an app the active context may view. Same null for "missing" and "forbidden". */
export async function getAuthorizedThumbnail(ctx: ActiveContext | null, slug: string): Promise<StoredThumbnail | null> {
  const app = await getAuthorizedApp(ctx, slug);
  if (!app) return null;
  return readThumbnail(app.id);
}

export async function adminGetThumbnail(actor: AdminActor, applicationId: string): Promise<StoredThumbnail> {
  await adminGetApp(actor, applicationId);
  const thumb = await readThumbnail(applicationId);
  if (!thumb) throw new NotFoundError();
  return thumb;
}

export async function setThumbnail(actor: AdminActor, applicationId: string, bytes: Uint8Array): Promise<Date> {
  const app = await adminGetApp(actor, applicationId);
  if (bytes.length === 0) throw new ValidationError({ thumbnail: "Berkas gambar kosong." });
  if (bytes.length > THUMBNAIL_MAX_BYTES) throw new ValidationError({ thumbnail: "Ukuran gambar maksimal 1 MB." });
  const contentType = sniffImageType(bytes);
  if (!contentType) throw new ValidationError({ thumbnail: "Format harus PNG, JPEG, atau WebP." });

  const now = new Date();
  const values = { contentType, byteSize: bytes.length, data: Buffer.from(bytes), updatedBy: actor.sub, updatedAt: now };
  await getDb()
    .insert(applicationThumbnails)
    .values({ applicationId, ...values })
    .onConflictDoUpdate({ target: applicationThumbnails.applicationId, set: values });
  await recordAudit({
    eventType: "catalogue.update",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx?.org.externalOrgId ?? null,
    resourceType: "application",
    resourceId: applicationId,
    metadata: { slug: app.slug, changedFields: ["thumbnail"], contentType, byteSize: bytes.length },
    correlationId: actor.correlationId,
  });
  return now;
}

export async function removeThumbnail(actor: AdminActor, applicationId: string): Promise<void> {
  const app = await adminGetApp(actor, applicationId);
  const deleted = await getDb()
    .delete(applicationThumbnails)
    .where(eq(applicationThumbnails.applicationId, applicationId))
    .returning({ id: applicationThumbnails.applicationId });
  if (deleted.length === 0) return;
  await recordAudit({
    eventType: "catalogue.update",
    outcome: "success",
    actorId: actor.sub,
    organizationId: actor.ctx?.org.externalOrgId ?? null,
    resourceType: "application",
    resourceId: applicationId,
    metadata: { slug: app.slug, changedFields: ["thumbnail"], removed: true },
    correlationId: actor.correlationId,
  });
}

/** Image response with headers that stop the bytes being interpreted as anything but an image. */
export function imageResponse(thumb: StoredThumbnail, cacheControl: string): Response {
  return new Response(new Uint8Array(thumb.data), {
    headers: {
      "Content-Type": thumb.contentType,
      "Content-Length": String(thumb.data.length),
      "Cache-Control": cacheControl,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Last-Modified": thumb.updatedAt.toUTCString(),
    },
  });
}

/** Last upload time for the admin edit page, or null. Callers must already be authorized. */
export async function thumbnailUpdatedAt(applicationId: string): Promise<Date | null> {
  const [row] = await getDb()
    .select({ updatedAt: applicationThumbnails.updatedAt })
    .from(applicationThumbnails)
    .where(eq(applicationThumbnails.applicationId, applicationId));
  return row?.updatedAt ?? null;
}
