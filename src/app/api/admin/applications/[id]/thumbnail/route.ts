import { NextResponse } from "next/server";
import { adminGetThumbnail, imageResponse, removeThumbnail, setThumbnail, THUMBNAIL_MAX_BYTES } from "@/lib/catalogue/thumbnail";
import { ValidationError } from "@/lib/catalogue/errors";
import { withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, correlationId, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  const thumb = await adminGetThumbnail({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id);
  return imageResponse(thumb, "private, no-cache");
});

/** Raw image body (PNG, JPEG or WebP, max 1 MB). The type is detected from the bytes. */
export const PUT = withAuth(async (auth, correlationId, req: Request, { params }: Ctx) => {
  const { id } = await params;
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > THUMBNAIL_MAX_BYTES) throw new ValidationError({ thumbnail: "Ukuran gambar maksimal 1 MB." });
  const bytes = new Uint8Array(await req.arrayBuffer());
  const updatedAt = await setThumbnail({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id, bytes);
  return NextResponse.json({ thumbnail: { updatedAt: updatedAt.toISOString() } });
});

export const DELETE = withAuth(async (auth, correlationId, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  await removeThumbnail({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id);
  return new NextResponse(null, { status: 204 });
});
