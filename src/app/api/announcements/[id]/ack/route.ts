import { NextResponse } from "next/server";
import { acknowledgeAnnouncement } from "@/lib/announcements/service";
import { withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Confirms the current user has read an announcement. Identity is taken from the session only. */
export const POST = withAuth(async (auth, correlationId, _req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const ackedAt = await acknowledgeAnnouncement(
    { sub: auth.principal.sub, name: auth.principal.name, ctx: auth.ctx },
    id,
    correlationId,
  );
  return NextResponse.json({ ackedAt }, { headers: { "Cache-Control": "no-store" } });
});
