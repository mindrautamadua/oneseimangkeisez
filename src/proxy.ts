import { NextResponse, type NextRequest } from "next/server";
import { newsImageOrigins } from "@/lib/news/sources";

// Publisher image hosts for hotlinked news thumbnails (fixed in code, see lib/news/sources.ts).
const IMG_SRC = ["'self'", "data:", "blob:", ...newsImageOrigins()].join(" ");

/**
 * Edge of the request pipeline: security headers, CSP nonce, correlation IDs and a CSRF
 * Origin check for state-changing requests. NOT an authorization layer: every page and API
 * handler performs its own server-side authorization.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const expected = new Set([req.nextUrl.origin]);
  if (process.env.PORTAL_BASE_URL) {
    try {
      expected.add(new URL(process.env.PORTAL_BASE_URL).origin);
    } catch {
      /* ignored: env() validates this elsewhere */
    }
  }
  if (origin) return expected.has(origin);
  // No Origin header: fall back to Sec-Fetch-Site (sent by all modern browsers).
  const site = req.headers.get("sec-fetch-site");
  return site === null || site === "same-origin" || site === "none";
}

export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();

  if (MUTATING.has(request.method) && !sameOrigin(request)) {
    return NextResponse.json(
      { error: { code: "csrf_rejected", message: "Permintaan lintas situs ditolak." } },
      { status: 403, headers: { "x-request-id": requestId } },
    );
  }

  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === "development";
  const isHttps = (process.env.PORTAL_BASE_URL ?? "").startsWith("https://");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are used by Next.js internals; scripts remain nonce-locked.
    "style-src 'self' 'unsafe-inline'",
    `img-src ${IMG_SRC}`,
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'" + (process.env.OIDC_ISSUER ? ` ${safeOrigin(process.env.OIDC_ISSUER)}` : ""),
    "frame-ancestors 'none'",
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-request-id", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (isHttps) response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}

function safeOrigin(u: string): string {
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
