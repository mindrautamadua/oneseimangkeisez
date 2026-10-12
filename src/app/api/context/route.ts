import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getAuthState, writeSession } from "@/lib/auth/current";
import { recordAudit } from "@/lib/audit/audit";
import { jsonError } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * Switches the active organization context (FR-04). The requested org is accepted only if
 * the IAM provider asserted membership AND the org is active in the portal (AT-03).
 */
export async function POST(req: NextRequest) {
  const isJson = (req.headers.get("content-type") ?? "").includes("application/json");
  const auth = await getAuthState();
  if (auth.status !== "ok") {
    return isJson
      ? jsonError(401, auth.status === "expired" ? "session_expired" : "unauthenticated", "Silakan masuk kembali.")
      : NextResponse.redirect(new URL(auth.status === "expired" ? "/session-expired" : "/login", env().PORTAL_BASE_URL), 303);
  }
  let orgId = "";
  try {
    orgId = isJson
      ? String(((await req.json()) as { orgId?: unknown }).orgId ?? "")
      : String((await req.formData()).get("orgId") ?? "");
  } catch {
    return jsonError(400, "bad_request", "Permintaan tidak valid.");
  }
  const target = auth.orgs.find((o) => o.externalOrgId === orgId);
  if (!target) {
    await recordAudit({
      eventType: "context.switch",
      outcome: "denied",
      actorId: auth.principal.sub,
      organizationId: auth.ctx?.org.externalOrgId ?? null,
      resourceType: "organization",
      resourceId: orgId.slice(0, 128),
    });
    return isJson
      ? jsonError(403, "forbidden", "Anda tidak memiliki akses ke organisasi tersebut.")
      : NextResponse.redirect(new URL("/access-denied", env().PORTAL_BASE_URL), 303);
  }
  await writeSession({ ...auth.principal, activeOrgId: target.externalOrgId }, auth.expiresAt);
  await recordAudit({
    eventType: "context.switch",
    outcome: "success",
    actorId: auth.principal.sub,
    organizationId: target.externalOrgId,
    resourceType: "organization",
    resourceId: target.externalOrgId,
    metadata: { from: auth.ctx?.org.externalOrgId ?? null },
  });
  return isJson
    ? NextResponse.json({ activeOrgId: target.externalOrgId })
    : NextResponse.redirect(new URL("/workspace", env().PORTAL_BASE_URL), 303);
}
