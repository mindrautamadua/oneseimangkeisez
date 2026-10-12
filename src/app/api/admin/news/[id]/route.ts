import { NextResponse } from "next/server";
import { setNewsHidden } from "@/lib/news/service";
import { ValidationError } from "@/lib/catalogue/errors";
import { readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Editorial visibility of one collected headline: { "hidden": boolean }. */
export const PATCH = withAuth(async (auth, correlationId, req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await readJson(req)) as { hidden?: unknown };
  if (typeof body?.hidden !== "boolean") throw new ValidationError({ hidden: "Nilai hidden harus boolean." });
  const row = await setNewsHidden({ sub: auth.principal.sub, ctx: auth.ctx, correlationId }, id, body.hidden);
  return NextResponse.json({ item: { id: row.id, hidden: row.hidden } });
});
