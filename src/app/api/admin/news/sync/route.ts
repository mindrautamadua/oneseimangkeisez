import { NextResponse } from "next/server";
import { adminSyncNews } from "@/lib/news/service";
import { withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (auth, correlationId) => {
  const results = await adminSyncNews({ sub: auth.principal.sub, ctx: auth.ctx, correlationId });
  return NextResponse.json({ results });
});
