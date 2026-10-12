import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { cache } from "react";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import { eligibleOrgs, resolveActiveContext, type OrgRecord } from "@/lib/authz/policy";
import type { ActiveContext, Principal } from "@/lib/authz/types";
import { openSession, sealSession } from "./session-core";
import { baseCookieOptions, sessionCookieName } from "./cookies";

export type AuthState =
  | { status: "none" | "expired" | "invalid" }
  | {
      status: "ok";
      principal: Principal;
      ctx: ActiveContext | null;
      orgs: OrgRecord[];
      expiresAt: number;
    };

async function loadOrgs(principal: Principal): Promise<OrgRecord[]> {
  const ids = principal.memberships.map((m) => m.orgId);
  if (ids.length === 0) return [];
  const rows = await getDb()
    .select()
    .from(organizations)
    .where(inArray(organizations.externalOrgId, ids));
  return rows.map((r) => ({
    id: r.id,
    externalOrgId: r.externalOrgId,
    displayName: r.displayName,
    orgType: r.orgType,
    status: r.status,
  }));
}

/** Reads and validates the session, then resolves the active org context server-side. */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const store = await cookies();
  const res = await openSession(store.get(sessionCookieName())?.value, env().SESSION_SECRET);
  if (res.status !== "valid") return { status: res.status };
  const orgRows = await loadOrgs(res.principal);
  return {
    status: "ok",
    principal: res.principal,
    orgs: eligibleOrgs(res.principal, orgRows),
    ctx: resolveActiveContext(res.principal, orgRows),
    expiresAt: res.expiresAt,
  };
});

/** For pages: redirects to login / session-expired when there is no valid session. */
export async function requireAuth(returnTo: string) {
  const s = await getAuthState();
  if (s.status === "expired") redirect(`/session-expired?next=${encodeURIComponent(returnTo)}`);
  if (s.status !== "ok") redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return s;
}

/**
 * Writes the session cookie. Pass `expiresAt` to keep the original absolute expiry
 * (e.g. when switching organization context) so sessions cannot be extended indefinitely.
 */
export async function writeSession(principal: Principal, expiresAt?: number) {
  const e = env();
  const now = Math.floor(Date.now() / 1000);
  const maxAge = expiresAt ? Math.max(1, expiresAt - now) : e.SESSION_MAX_AGE_SECONDS;
  const token = await sealSession(principal, e.SESSION_SECRET, maxAge, now);
  // Browser-session cookie: no Max-Age, so expiry is detectable from the encrypted `exp`.
  (await cookies()).set(sessionCookieName(), token, baseCookieOptions());
}

export async function clearSession() {
  (await cookies()).delete({ name: sessionCookieName(), path: "/" });
}
