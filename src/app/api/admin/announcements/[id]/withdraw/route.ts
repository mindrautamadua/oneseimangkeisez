import { NextResponse } from "next/server";
import { withdrawAnnouncement } from "@/lib/announcements/service";
import { jsonError, readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Withdrawal hides the announcement from readers; the record and confirmations are kept. */
export const POST = withAuth(async (auth, correlationId, req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await readJson(req)) as { confirm?: unknown };
  if (body?.confirm !== true) return jsonError(400, "confirmation_required", "Konfirmasi penarikan diperlukan.");
  const a = await withdrawAnnouncement({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id);
  return NextResponse.json({ announcement: { id: a.id, status: a.status } });
});
