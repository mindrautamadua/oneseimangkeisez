import { NextResponse } from "next/server";
import { adminGetApp, grantEntitlement, listEntitlements } from "@/lib/catalogue/service";
import { readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, correlationId, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  await adminGetApp({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id);
  return NextResponse.json({ entitlements: await listEntitlements(id) });
});

export const POST = withAuth(async (auth, correlationId, req: Request, { params }: Ctx) => {
  const { id } = await params;
  await grantEntitlement({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id, await readJson(req));
  return NextResponse.json({ entitlements: await listEntitlements(id) }, { status: 201 });
});
