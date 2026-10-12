import { getAuthState } from "@/lib/auth/current";
import { getAuthorizedThumbnail, imageResponse } from "@/lib/catalogue/thumbnail";
import { jsonError } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * Catalogue cover image. Same authorization as the catalogue entry itself; unknown and
 * unauthorized slugs both return 404. URLs carry a version query, so caching can be long.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await getAuthState();
  if (auth.status !== "ok") return jsonError(401, "unauthenticated", "Silakan masuk terlebih dahulu.");
  const thumb = await getAuthorizedThumbnail(auth.ctx, slug);
  if (!thumb) return jsonError(404, "not_found", "Data tidak ditemukan.");
  return imageResponse(thumb, "private, max-age=31536000, immutable");
}
