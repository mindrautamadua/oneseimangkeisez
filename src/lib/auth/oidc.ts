import "server-only";
import * as client from "openid-client";
import { EncryptJWT, jwtDecrypt } from "jose";
import { env } from "@/lib/env";
import type { Membership } from "@/lib/authz/types";
import { membershipsFromGeneric, membershipsFromZitadel } from "./claims";

export class IdpUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Identity provider tidak dapat dihubungi.");
    this.name = "IdpUnavailableError";
    this.cause = cause;
  }
}

let cachedConfig: { config: client.Configuration; at: number } | null = null;
const CONFIG_TTL_MS = 60 * 60 * 1000;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (cachedConfig && Date.now() - cachedConfig.at < CONFIG_TTL_MS) return cachedConfig.config;
  const e = env();
  try {
    const auth = e.OIDC_CLIENT_SECRET ? client.ClientSecretBasic(e.OIDC_CLIENT_SECRET) : client.None();
    const config = await client.discovery(
      new URL(e.OIDC_ISSUER),
      e.OIDC_CLIENT_ID,
      undefined,
      auth,
      { timeout: 5 },
    );
    cachedConfig = { config, at: Date.now() };
    return config;
  } catch (err) {
    throw new IdpUnavailableError(err);
  }
}

export function redirectUri(): string {
  return new URL("/api/auth/callback", env().PORTAL_BASE_URL).toString();
}

interface LoginState {
  verifier: string;
  state: string;
  nonce: string;
  returnTo: string;
}

async function stateKey() {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`login-state:${env().SESSION_SECRET}`));
  return new Uint8Array(d);
}

/** Starts Authorization Code + PKCE. Returns the IdP URL and the sealed state for a cookie. */
export async function beginLogin(returnTo: string): Promise<{ url: URL; sealedState: string }> {
  const config = await getOidcConfig();
  const verifier = client.randomPKCECodeVerifier();
  const state = client.randomState();
  const nonce = client.randomNonce();
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(),
    scope: env().OIDC_SCOPES,
    code_challenge: await client.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
    nonce,
  });
  const sealedState = await new EncryptJWT({ verifier, state, nonce, returnTo })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .encrypt(await stateKey());
  return { url, sealedState };
}

export async function openLoginState(sealed: string | undefined): Promise<LoginState | null> {
  if (!sealed) return null;
  try {
    const { payload } = await jwtDecrypt(sealed, await stateKey());
    const { verifier, state, nonce, returnTo } = payload as Record<string, unknown>;
    if ([verifier, state, nonce, returnTo].some((v) => typeof v !== "string")) return null;
    return { verifier, state, nonce, returnTo } as LoginState;
  } catch {
    return null;
  }
}

export interface OidcIdentity {
  sub: string;
  name: string;
  email: string | null;
  memberships: Membership[];
}

/** Completes the code exchange. openid-client validates issuer, audience, signature, expiry, nonce. */
export async function completeLogin(currentUrl: URL, st: LoginState): Promise<OidcIdentity> {
  const config = await getOidcConfig();
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: st.verifier,
    expectedState: st.state,
    expectedNonce: st.nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims) throw new Error("ID token tidak tersedia.");
  const raw = claims as unknown as Record<string, unknown>;
  const e = env();
  const memberships =
    e.OIDC_CLAIM_MAPPING === "zitadel"
      ? membershipsFromZitadel(raw)
      : membershipsFromGeneric(raw, e.OIDC_MEMBERSHIPS_CLAIM);
  const name =
    (typeof raw.name === "string" && raw.name) ||
    (typeof raw.preferred_username === "string" && raw.preferred_username) ||
    claims.sub;
  return {
    sub: claims.sub,
    name,
    email: typeof raw.email === "string" ? raw.email : null,
    memberships,
  };
  // Tokens are intentionally discarded: the portal does not store IdP tokens.
}

/** RP-initiated logout URL, or null when the IdP does not advertise end_session_endpoint. */
export async function endSessionUrl(): Promise<string | null> {
  try {
    const config = await getOidcConfig();
    if (!config.serverMetadata().end_session_endpoint) return null;
    return client
      .buildEndSessionUrl(config, {
        client_id: env().OIDC_CLIENT_ID,
        post_logout_redirect_uri: new URL("/login?logged_out=1", env().PORTAL_BASE_URL).toString(),
      })
      .toString();
  } catch {
    return null;
  }
}
