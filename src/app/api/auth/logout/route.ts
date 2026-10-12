import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clearSession, getAuthState } from "@/lib/auth/current";
import { endSessionUrl } from "@/lib/auth/oidc";
import { recordAudit } from "@/lib/audit/audit";

export const dynamic = "force-dynamic";

/** POST-only logout (CSRF-protected by the proxy Origin check and SameSite cookies). */
export async function POST() {
  const auth = await getAuthState();
  await clearSession();
  if (auth.status === "ok") {
    await recordAudit({
      eventType: "auth.logout",
      outcome: "success",
      actorId: auth.principal.sub,
      organizationId: auth.ctx?.org.externalOrgId ?? null,
    });
    if (auth.principal.authProvider === "oidc") {
      // Ends the IdP session too. Single logout in destination apps is NOT guaranteed.
      const url = await endSessionUrl();
      if (url) return NextResponse.redirect(url, 303);
    }
  }
  return NextResponse.redirect(new URL("/login?logged_out=1", env().PORTAL_BASE_URL), 303);
}
