import { getAuthState } from "@/lib/auth/current";
import { imageResponse } from "@/lib/catalogue/thumbnail";
import { getNewsImage } from "@/lib/news/service";
import { jsonError } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Cover photo of an official KINRA headline. Signed-in users only; URLs are versioned. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthState();
  if (auth.status !== "ok") return jsonError(401, "unauthenticated", "Silakan masuk terlebih dahulu.");
  const image = await getNewsImage(id);
  if (!image) return jsonError(404, "not_found", "Data tidak ditemukan.");
  return imageResponse(image, "private, max-age=31536000, immutable");
}
