import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { AppNotAllowedError, InvalidCredentialsError, loginWithKinraIam } from "@/lib/auth/kinra-iam";
import { IdpUnavailableError } from "@/lib/auth/oidc";
import { writeSession } from "@/lib/auth/current";
import { recordAudit } from "@/lib/audit/audit";
import { safeReturnPath } from "@/lib/security/url";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Email/NIK + password login validated by KINRA IAM. 404 unless AUTH_PROVIDER=kinra_iam. */
export async function POST(req: NextRequest) {
  const e = env();
  if (e.AUTH_PROVIDER !== "kinra_iam") return new NextResponse("Not Found", { status: 404 });
  const base = e.PORTAL_BASE_URL;
  const form = await req.formData();
  const identifier = String(form.get("identifier") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const returnTo = safeReturnPath(String(form.get("next") ?? ""));
  const back = (error: string) => {
    const u = new URL("/login", base);
    u.searchParams.set("error", error);
    if (returnTo !== "/workspace") u.searchParams.set("next", returnTo);
    return NextResponse.redirect(u, 303);
  };

  if (
    !rateLimit(`iam-login:${clientIp(req.headers)}`, 20, 5 * 60_000) ||
    !rateLimit(`iam-login-id:${identifier.toLowerCase()}`, 10, 5 * 60_000)
  ) {
    return back("rate_limited");
  }
  if (!identifier || !password || identifier.length > 320 || password.length > 1024) {
    return back("invalid_credentials");
  }

  try {
    const id = await loginWithKinraIam(identifier, password);
    await writeSession({
      sub: id.sub,
      name: id.name,
      email: id.email,
      memberships: id.memberships,
      activeOrgId: null,
      authProvider: "kinra_iam",
    });
    await recordAudit({
      eventType: "auth.login",
      outcome: "success",
      actorId: id.sub,
      metadata: { provider: "kinra_iam" },
    });
    return NextResponse.redirect(new URL(returnTo, base), 303);
  } catch (err) {
    const reason =
      err instanceof InvalidCredentialsError
        ? "invalid_credentials"
        : err instanceof AppNotAllowedError
          ? "app_not_allowed"
          : err instanceof IdpUnavailableError
            ? "idp_unavailable"
            : "login_failed";
    if (reason !== "invalid_credentials") {
      log("warn", "kinra_iam_login_failed", {
        reason,
        error: err instanceof Error ? err.name : "unknown",
        cause: err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined,
      });
    }
    await recordAudit({ eventType: "auth.login", outcome: "failure", metadata: { provider: "kinra_iam", reason } });
    return back(reason);
  }
}
