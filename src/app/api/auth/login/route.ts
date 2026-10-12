import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { env, mockAuthActive } from "@/lib/env";
import { beginLogin, IdpUnavailableError } from "@/lib/auth/oidc";
import { baseCookieOptions, loginStateCookieName } from "@/lib/auth/cookies";
import { safeReturnPath } from "@/lib/security/url";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Starts the OIDC Authorization Code + PKCE flow. */
export async function GET(req: NextRequest) {
  const base = env().PORTAL_BASE_URL;
  const returnTo = safeReturnPath(req.nextUrl.searchParams.get("next"));
  if (mockAuthActive()) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, base));
  if (!rateLimit(`login:${clientIp(req.headers)}`, 30, 60_000)) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", base));
  }
  try {
    const { url, sealedState } = await beginLogin(returnTo);
    (await cookies()).set(loginStateCookieName(), sealedState, { ...baseCookieOptions(), maxAge: 600 });
    return NextResponse.redirect(url);
  } catch (e) {
    // AT-14: controlled error; never bypass authentication.
    log("error", "oidc_begin_failed", { error: e instanceof IdpUnavailableError ? "idp_unavailable" : String(e) });
    return NextResponse.redirect(new URL("/login?error=idp_unavailable", base));
  }
}
