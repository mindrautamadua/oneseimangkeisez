import { NextResponse } from "next/server";
import { APP_VERSION, BUILD_ID } from "@/lib/version";

export const dynamic = "force-dynamic";

/** Public, non-sensitive: lets installed PWA clients detect a new deployment. */
export function GET() {
  return NextResponse.json(
    { version: APP_VERSION, buildId: BUILD_ID },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
