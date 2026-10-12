import { NextResponse } from "next/server";
import { adminListApps, createApp } from "@/lib/catalogue/service";
import { readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (auth, correlationId) => {
  const rows = await adminListApps({ sub: auth.principal.sub, ctx: auth.ctx, correlationId });
  return NextResponse.json({ applications: rows.map((r) => ({ ...r.app, category: r.category.name })) });
});

export const POST = withAuth(async (auth, correlationId, req: Request) => {
  const body = await readJson(req);
  const app = await createApp({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, body);
  return NextResponse.json({ application: app }, { status: 201 });
});
