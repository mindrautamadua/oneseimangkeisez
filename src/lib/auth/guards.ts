import "server-only";
import { redirect } from "next/navigation";
import { canReadAudit, isPortalAdmin } from "@/lib/authz/policy";
import { recordAudit } from "@/lib/audit/audit";
import { requireAuth } from "./current";

async function deny(auth: Awaited<ReturnType<typeof requireAuth>>, path: string): Promise<never> {
  await recordAudit({
    eventType: "admin.access",
    outcome: "denied",
    actorId: auth.principal.sub,
    organizationId: auth.ctx?.org.externalOrgId ?? null,
    resourceType: "page",
    resourceId: path,
  });
  redirect("/access-denied");
}

/** Server-side guard for portal administration pages (FR-08, AT-09). */
export async function requireAdmin(path: string) {
  const auth = await requireAuth(path);
  if (!isPortalAdmin(auth.ctx)) await deny(auth, path);
  return auth;
}

/** Server-side guard for read-only audit/access pages (admins and auditors). */
export async function requireAuditReader(path: string) {
  const auth = await requireAuth(path);
  if (!canReadAudit(auth.ctx)) await deny(auth, path);
  return auth;
}
