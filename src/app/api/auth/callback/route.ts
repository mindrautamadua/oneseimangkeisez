import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { completeLogin, IdpUnavailableError, openLoginState } from "@/lib/auth/oidc";
import { baseCookieOptions, loginStateCookieName } from "@/lib/auth/cookies";
import { writeSession } from "@/lib/auth/current";
import { recordAudit } from "@/lib/audit/audit";
import { safeReturnPath } from "@/lib/security/url";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = env().PORTAL_BASE_URL;
  const store = await cookies();
  const st = await openLoginState(store.get(loginStateCookieName())?.value);
  store.delete({ name: loginStateCookieName(), ...baseCookieOptions() });

  if (!st) return NextResponse.redirect(new URL("/login?error=state", base));
  if (req.nextUrl.searchParams.get("error")) {
    await recordAudit({ eventType: "auth.login", outcome: "failure", metadata: { reason: "idp_error" } });
    return NextResponse.redirect(new URL("/login?error=login_failed", base));
  }
  // Build the callback URL from the configured base, not the Host header.
  const callbackUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, base);
  try {
    const id = await completeLogin(callbackUrl, st);
    await writeSession({
      sub: id.sub,
      name: id.name,
      email: id.email,
      memberships: id.memberships,
      activeOrgId: null,
      authProvider: "oidc",
    });
    await recordAudit({
      eventType: "auth.login",
      outcome: "success",
      actorId: id.sub,
      metadata: { provider: "oidc", membershipCount: id.memberships.length },
    });
    return NextResponse.redirect(new URL(safeReturnPath(st.returnTo), base));
  } catch (e) {
    const reason = e instanceof IdpUnavailableError ? "idp_unavailable" : "login_failed";
    log("warn", "oidc_callback_failed", { reason, error: e instanceof Error ? e.name : "unknown" });
    await recordAudit({ eventType: "auth.login", outcome: "failure", metadata: { provider: "oidc", reason } });
    return NextResponse.redirect(new URL(`/login?error=${reason}`, base));
  }
}
