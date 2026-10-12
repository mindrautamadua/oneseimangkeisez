import { NextResponse } from "next/server";
import { createAnnouncement } from "@/lib/announcements/service";
import { readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Creates a draft announcement. */
export const POST = withAuth(async (auth, correlationId, req: Request) => {
  const body = await readJson(req);
  const a = await createAnnouncement({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, body);
  return NextResponse.json({ announcement: { id: a.id } }, { status: 201 });
});
