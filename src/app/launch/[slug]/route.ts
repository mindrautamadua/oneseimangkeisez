import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getAuthState } from "@/lib/auth/current";
import { decideLaunch } from "@/lib/catalogue/service";
import { recordAudit } from "@/lib/audit/audit";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Launch route (FR-06). The destination URL is read from trusted server-side catalogue data,
 * never from the request. Unknown and unauthorized slugs produce the same response (AT-04).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = env().PORTAL_BASE_URL;
  const auth = await getAuthState();
  if (auth.status === "expired") {
    return NextResponse.redirect(new URL(`/session-expired?next=${encodeURIComponent("/workspace")}`, base));
  }
  if (auth.status !== "ok") return NextResponse.redirect(new URL("/login", base));
  if (!rateLimit(`launch:${auth.principal.sub}:${clientIp(req.headers)}`, 60, 60_000)) {
    return NextResponse.redirect(new URL("/error?code=rate_limited", base));
  }
  const decision = await decideLaunch(auth.ctx, slug);
  const common = {
    actorId: auth.principal.sub,
    organizationId: auth.ctx?.org.externalOrgId ?? null,
    resourceType: "application",
    resourceId: decision.app?.id ?? slug.slice(0, 64),
  };
  if (!decision.ok) {
    if (decision.reason === "not_found_or_forbidden") {
      await recordAudit({ ...common, eventType: "app.launch", outcome: "denied", metadata: { reason: decision.reason } });
      return NextResponse.redirect(new URL("/access-denied?from=launch", base));
    }
    await recordAudit({ ...common, eventType: "app.launch", outcome: "failure", metadata: { reason: decision.reason } });
    return NextResponse.redirect(new URL(`/apps/${decision.app!.slug}?unavailable=${decision.reason}`, base));
  }
  await recordAudit({
    ...common,
    eventType: "app.launch",
    outcome: "success",
    metadata: { slug: decision.app.slug, integrationMode: decision.app.integrationMode },
  });
  const res = NextResponse.redirect(decision.url, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
