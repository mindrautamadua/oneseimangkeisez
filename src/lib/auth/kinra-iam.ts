import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "@/lib/env";
import type { Membership } from "@/lib/authz/types";
import { IdpUnavailableError } from "./oidc";

/**
 * KINRA IAM adapter: email/NIK + password are forwarded once to the IAM SSO endpoint
 * (never stored). The returned access token is verified against the IAM JWKS before the
 * profile in the response body is trusted.
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Kredensial tidak valid.");
    this.name = "InvalidCredentialsError";
  }
}

export class AppNotAllowedError extends Error {
  constructor() {
    super("Akun tidak memiliki akses ke aplikasi ini.");
    this.name = "AppNotAllowedError";
  }
}

const responseSchema = z.object({
  success: z.literal(true),
  token: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().nullable().optional(),
  }),
  allowed_applications: z.array(z.object({ app_code: z.string(), role: z.string().nullable().optional() })),
});

let jwks: { url: string; set: ReturnType<typeof createRemoteJWKSet> } | null = null;

function getJwks(url: string) {
  if (jwks?.url !== url) jwks = { url, set: createRemoteJWKSet(new URL(url)) };
  return jwks.set;
}

function rolesFor(iamRole: string | null | undefined): string[] {
  const map = env().KINRA_IAM_ROLE_MAP;
  return (iamRole && map[iamRole]) || map["*"] || ["employee"];
}

export interface IamIdentity {
  sub: string;
  name: string;
  email: string | null;
  memberships: Membership[];
}

export async function loginWithKinraIam(identifier: string, password: string): Promise<IamIdentity> {
  const e = env();
  let res: Response;
  try {
    res = await fetch(new URL("/api/v1/sso/login", e.KINRA_IAM_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-client-id": e.KINRA_IAM_CLIENT_ID,
        "x-client-secret": e.KINRA_IAM_CLIENT_SECRET,
      },
      body: JSON.stringify({ identifier, password }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new IdpUnavailableError(err);
  }
  if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
    const message = await res
      .json()
      .then((b: { message?: unknown }) => (typeof b?.message === "string" ? b.message : ""))
      .catch(() => "");
    // Rejected application credentials are a portal misconfiguration, not a wrong password.
    if (/x-client|client[ _-]?(id|secret)|kredensial aplikasi/i.test(message)) {
      throw new IdpUnavailableError(new Error(`IAM menolak kredensial aplikasi: ${message}`));
    }
    throw new InvalidCredentialsError();
  }
  if (!res.ok) throw new IdpUnavailableError(new Error(`IAM HTTP ${res.status}`));

  const parsed = responseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new IdpUnavailableError(new Error("IAM response tidak dikenali"));
  const body = parsed.data;

  let claims;
  try {
    ({ payload: claims } = await jwtVerify(body.token, getJwks(e.KINRA_IAM_JWKS_URL), {
      issuer: e.KINRA_IAM_ISSUER,
      audience: "authenticated",
      algorithms: ["ES256", "RS256"],
    }));
  } catch (err) {
    throw new IdpUnavailableError(err);
  }
  // The body profile is only trusted when it belongs to the verified token subject.
  if (claims.sub !== body.user.id) throw new IdpUnavailableError(new Error("IAM subject mismatch"));

  const app = body.allowed_applications.find((a) => a.app_code === e.KINRA_IAM_APP_CODE);
  if (!app) throw new AppNotAllowedError();

  const email = typeof claims.email === "string" && claims.email ? claims.email : (body.user.email ?? null);
  return {
    sub: `kinra-iam|${claims.sub}`,
    name: body.user.name,
    email,
    memberships: [{ orgId: e.KINRA_IAM_ORG_ID, roles: rolesFor(app.role) }],
  };
}
