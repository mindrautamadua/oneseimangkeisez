import { NextResponse } from "next/server";
import { adminGetApp, updateApp } from "@/lib/catalogue/service";
import { readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, correlationId, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  const app = await adminGetApp({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id);
  return NextResponse.json({ application: app });
});

export const PATCH = withAuth(async (auth, correlationId, req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = await readJson(req);
  const app = await updateApp({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id, body);
  return NextResponse.json({ application: app });
});
