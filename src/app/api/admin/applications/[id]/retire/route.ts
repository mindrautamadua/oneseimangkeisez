import { NextResponse } from "next/server";
import { retireApp } from "@/lib/catalogue/service";
import { jsonError, readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Destructive action: requires an explicit { "confirm": true } body. */
export const POST = withAuth(async (auth, correlationId, req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await readJson(req)) as { confirm?: unknown };
  if (body?.confirm !== true) return jsonError(400, "confirmation_required", "Konfirmasi penonaktifan diperlukan.");
  const app = await retireApp({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id);
  return NextResponse.json({ application: app });
});
