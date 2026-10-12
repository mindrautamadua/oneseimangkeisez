/**
 * Maps IAM ID-token claims to organization memberships. Pure and unit-tested.
 * The output is still only an *assertion*: orgs must also exist and be active in the
 * portal's organization mapping before they grant any context.
 */
import type { Membership } from "@/lib/authz/types";

const ROLE_KEY = /^[a-z][a-z0-9_.-]{0,63}$/;
const ORG_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

function push(map: Map<string, Set<string>>, org: string, role: string) {
  if (!ORG_ID.test(org) || !ROLE_KEY.test(role)) return;
  if (!map.has(org)) map.set(org, new Set());
  map.get(org)!.add(role);
}

function toList(map: Map<string, Set<string>>): Membership[] {
  return [...map.entries()].map(([orgId, roles]) => ({ orgId, roles: [...roles].sort() }));
}

/**
 * ZITADEL project roles claim: { "<roleKey>": { "<orgId>": "<orgDomain>" } }.
 * Also accepts the project-specific variant urn:zitadel:iam:org:project:<projectId>:roles.
 */
export function membershipsFromZitadel(claims: Record<string, unknown>): Membership[] {
  const map = new Map<string, Set<string>>();
  for (const [key, value] of Object.entries(claims)) {
    if (!/^urn:zitadel:iam:org:project:(?:[0-9]+:)?roles$/.test(key)) continue;
    if (!value || typeof value !== "object") continue;
    for (const [role, orgs] of Object.entries(value as Record<string, unknown>)) {
      if (!orgs || typeof orgs !== "object") continue;
      for (const orgId of Object.keys(orgs as Record<string, unknown>)) push(map, orgId, role);
    }
  }
  return toList(map);
}

/** Generic claim: [{ "org": "<id>", "roles": ["role"] }] (e.g. via a Keycloak protocol mapper). */
export function membershipsFromGeneric(claims: Record<string, unknown>, claimName: string): Membership[] {
  const map = new Map<string, Set<string>>();
  let value = claims[claimName];
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { org, roles } = entry as { org?: unknown; roles?: unknown };
    if (typeof org !== "string" || !Array.isArray(roles)) continue;
    for (const r of roles) if (typeof r === "string") push(map, org, r);
  }
  return toList(map);
}
