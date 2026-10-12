import { NextResponse } from "next/server";
import { listEntitlements, revokeEntitlement } from "@/lib/catalogue/service";
import { withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

export const DELETE = withAuth(
  async (auth, correlationId, _req: Request, { params }: { params: Promise<{ id: string; entitlementId: string }> }) => {
    const { id, entitlementId } = await params;
    await revokeEntitlement({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id, entitlementId);
    return NextResponse.json({ entitlements: await listEntitlements(id) });
  },
);
