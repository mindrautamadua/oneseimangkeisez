import { NextResponse } from "next/server";
import { updateAnnouncement } from "@/lib/announcements/service";
import { readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

export const PATCH = withAuth(async (auth, correlationId, req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await readJson(req);
  const a = await updateAnnouncement({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id, body);
  return NextResponse.json({ announcement: { id: a.id, version: a.version } });
});
