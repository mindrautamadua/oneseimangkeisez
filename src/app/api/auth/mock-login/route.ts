import { NextResponse, type NextRequest } from "next/server";
import { env, mockAuthActive } from "@/lib/env";
import { findMockUser } from "@/lib/auth/mock-users";
import { writeSession } from "@/lib/auth/current";
import { recordAudit } from "@/lib/audit/audit";
import { safeReturnPath } from "@/lib/security/url";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * ⚠️ MOCK LOGIN — LOCAL DEVELOPMENT ONLY. Returns 404 unless AUTH_PROVIDER=mock,
 * MOCK_AUTH_ENABLED=true and APP_ENV is not production.
 */
export async function POST(req: NextRequest) {
  if (!mockAuthActive()) return new NextResponse("Not Found", { status: 404 });
  const base = env().PORTAL_BASE_URL;
  if (!rateLimit(`mock-login:${clientIp(req.headers)}`, 60, 60_000)) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", base), 303);
  }
  const form = await req.formData();
  const username = String(form.get("username") ?? "");
  const returnTo = safeReturnPath(String(form.get("next") ?? ""));
  const user = findMockUser(username);
  if (!user) {
    await recordAudit({ eventType: "auth.login", outcome: "failure", metadata: { provider: "mock", reason: "unknown_user" } });
    return NextResponse.redirect(new URL("/login?error=login_failed", base), 303);
  }
  await writeSession({
    sub: `mock|${user.username}`,
    name: user.name,
    email: user.email,
    memberships: user.memberships,
    activeOrgId: null,
    authProvider: "mock",
  });
  await recordAudit({
    eventType: "auth.login",
    outcome: "success",
    actorId: `mock|${user.username}`,
    metadata: { provider: "mock" },
  });
  return NextResponse.redirect(new URL(returnTo, base), 303);
}
