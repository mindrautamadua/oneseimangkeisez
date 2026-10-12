import { NextResponse } from "next/server";
import { listAuthorizedApps } from "@/lib/catalogue/service";
import { withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

/** The caller's authorized catalogue for the active context (no target URLs exposed). */
export const GET = withAuth(async (auth) => {
  const apps = await listAuthorizedApps(auth.ctx);
  return NextResponse.json({
    context: auth.ctx ? { orgId: auth.ctx.org.externalOrgId, orgType: auth.ctx.org.orgType } : null,
    applications: apps,
  });
});
