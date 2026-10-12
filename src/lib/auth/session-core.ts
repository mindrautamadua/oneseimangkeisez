/**
 * Encrypted session token (JWE, dir + A256GCM). The cookie contents are opaque to the
 * browser and cannot be forged or edited without SESSION_SECRET. No IdP tokens are stored.
 */
import { EncryptJWT, jwtDecrypt, errors } from "jose";
import type { Membership, Principal } from "@/lib/authz/types";

export type SessionResult =
  | { status: "valid"; principal: Principal; expiresAt: number }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "none" };

async function keyFromSecret(secret: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return new Uint8Array(digest);
}

const ISSUER = "onekinra-portal";

export async function sealSession(
  principal: Principal,
  secret: string,
  maxAgeSeconds: number,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  return new EncryptJWT({
    name: principal.name,
    email: principal.email,
    memberships: principal.memberships,
    activeOrgId: principal.activeOrgId,
    authProvider: principal.authProvider,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(principal.sub)
    .setIssuer(ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + maxAgeSeconds)
    .encrypt(await keyFromSecret(secret));
}

function isMemberships(v: unknown): v is Membership[] {
  return (
    Array.isArray(v) &&
    v.every(
      (m) =>
        m &&
        typeof m === "object" &&
        typeof (m as Membership).orgId === "string" &&
        Array.isArray((m as Membership).roles) &&
        (m as Membership).roles.every((r) => typeof r === "string"),
    )
  );
}

export async function openSession(
  token: string | undefined | null,
  secret: string,
  currentDate?: Date,
): Promise<SessionResult> {
  if (!token) return { status: "none" };
  try {
    const { payload } = await jwtDecrypt(token, await keyFromSecret(secret), {
      issuer: ISSUER,
      currentDate,
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      !isMemberships(payload.memberships) ||
      (payload.authProvider !== "oidc" && payload.authProvider !== "mock") ||
      typeof payload.exp !== "number"
    ) {
      return { status: "invalid" };
    }
    return {
      status: "valid",
      expiresAt: payload.exp,
      principal: {
        sub: payload.sub,
        name: payload.name,
        email: typeof payload.email === "string" ? payload.email : null,
        memberships: payload.memberships,
        activeOrgId: typeof payload.activeOrgId === "string" ? payload.activeOrgId : null,
        authProvider: payload.authProvider,
      },
    };
  } catch (e) {
    if (e instanceof errors.JWTExpired) return { status: "expired" };
    return { status: "invalid" };
  }
}
