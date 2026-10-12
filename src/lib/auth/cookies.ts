import "server-only";
import { env } from "@/lib/env";

export function secureCookies(): boolean {
  return env().PORTAL_BASE_URL.startsWith("https://");
}

/** __Host- prefix (requires Secure, Path=/, no Domain) is used whenever HTTPS is on. */
export function sessionCookieName(): string {
  return secureCookies() ? "__Host-onekinra_session" : "onekinra_session";
}

export function loginStateCookieName(): string {
  return secureCookies() ? "__Host-onekinra_login" : "onekinra_login";
}

export function baseCookieOptions() {
  return { httpOnly: true, secure: secureCookies(), sameSite: "lax" as const, path: "/" };
}
