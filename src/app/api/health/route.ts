import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * Readiness check for the portal and its critical dependency (database).
 * Returns no hostnames, versions or error details. Destination-application health is
 * intentionally NOT reported (no trustworthy health signal yet).
 */
export async function GET() {
  const database = await pingDb();
  const ok = database;
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", checks: { database: database ? "ok" : "fail" }, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
