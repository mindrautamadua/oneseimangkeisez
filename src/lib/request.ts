import "server-only";
import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/current";
import { currentCorrelationId, recordAudit } from "@/lib/audit/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/catalogue/errors";
import { log } from "@/lib/logger";

/** JSON error helper. Messages are user-safe; no stack traces or internals. */
export function jsonError(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Wraps an API handler that requires an authenticated session.
 * 401 for missing/expired sessions; domain errors mapped to 403/404/422.
 */
export function withAuth<A extends unknown[]>(
  handler: (
    auth: Extract<Awaited<ReturnType<typeof getAuthState>>, { status: "ok" }>,
    correlationId: string,
    ...args: A
  ) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> => {
    const correlationId = await currentCorrelationId();
    const auth = await getAuthState();
    if (auth.status === "expired") return jsonError(401, "session_expired", "Sesi Anda telah berakhir. Silakan masuk kembali.");
    if (auth.status !== "ok") return jsonError(401, "unauthenticated", "Silakan masuk terlebih dahulu.");
    try {
      return await handler(auth, correlationId, ...args);
    } catch (e) {
      if (e instanceof ForbiddenError) {
        await recordAudit({
          eventType: "authz.denied",
          outcome: "denied",
          actorId: auth.principal.sub,
          organizationId: auth.ctx?.org.externalOrgId ?? null,
          resourceType: "api",
          metadata: { reason: e.message },
          correlationId,
        });
        return jsonError(403, "forbidden", "Anda tidak memiliki izin untuk tindakan ini.");
      }
      if (e instanceof NotFoundError) return jsonError(404, "not_found", "Data tidak ditemukan.");
      if (e instanceof ValidationError) return jsonError(422, "validation_failed", "Periksa kembali isian formulir.", { fields: e.fieldErrors });
      log("error", "api_unhandled_error", { correlationId, error: String(e) });
      return jsonError(500, "internal_error", "Terjadi kesalahan sistem. Hubungi dukungan dengan kode referensi.", { correlationId });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ValidationError({ _: "Content-Type harus application/json." });
  try {
    return await req.json();
  } catch {
    throw new ValidationError({ _: "Body JSON tidak valid." });
  }
}
