import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireAuditReader } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";
import { AppShell, PageBody } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Jejak Audit" };

const TYPES = [
  "auth.login",
  "auth.logout",
  "context.switch",
  "app.launch",
  "catalogue.create",
  "catalogue.update",
  "catalogue.retire",
  "entitlement.grant",
  "entitlement.revoke",
  "admin.access",
  "authz.denied",
  "assistant.ask",
  "announcement.create",
  "announcement.update",
  "announcement.publish",
  "announcement.withdraw",
  "announcement.ack",
  "news.sync",
  "news.visibility",
];

const OUTCOME_STYLE: Record<string, string> = {
  success: "text-emerald-800 bg-emerald-50",
  failure: "text-amber-900 bg-amber-50",
  denied: "text-rose-800 bg-rose-50",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const auth = await requireAuditReader("/admin/audit");
  const type = (await searchParams).type;
  const filter = type && TYPES.includes(type) ? type : null;
  const rows = await getDb()
    .select()
    .from(auditEvents)
    .where(filter ? eq(auditEvents.eventType, filter) : undefined)
    .orderBy(desc(auditEvents.occurredAt))
    .limit(200);
  return (
    <AppShell auth={auth} active="audit">
      <PageBody>
      <PageHeader title="Jejak audit" description="200 peristiwa terbaru. Catatan bersifat append-only dan tidak memuat kata sandi, token, atau cookie." />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label htmlFor="type" className="text-sm font-medium">
          Jenis peristiwa
          <select id="type" name="type" defaultValue={filter ?? ""} className="ml-2 rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
            <option value="">Semua</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium">
          Terapkan
        </button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="min-w-full divide-y divide-line text-sm" data-testid="audit-table">
          <caption className="sr-only">Peristiwa audit</caption>
          <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-3 py-3">Waktu (WIB)</th>
              <th scope="col" className="px-3 py-3">Peristiwa</th>
              <th scope="col" className="px-3 py-3">Hasil</th>
              <th scope="col" className="px-3 py-3">Aktor</th>
              <th scope="col" className="px-3 py-3">Organisasi</th>
              <th scope="col" className="px-3 py-3">Sumber daya</th>
              <th scope="col" className="px-3 py-3">Metadata</th>
              <th scope="col" className="px-3 py-3">Korelasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line align-top">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted">Belum ada peristiwa.</td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.occurredAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "medium" })}
                </td>
                <td className="px-3 py-2"><code className="text-xs">{r.eventType}</code></td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${OUTCOME_STYLE[r.outcome]}`}>{r.outcome}</span>
                </td>
                <td className="px-3 py-2 text-xs">{r.actorId ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.organizationId ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.resourceType ? `${r.resourceType}:${r.resourceId ?? ""}` : "—"}</td>
                <td className="max-w-xs px-3 py-2"><code className="break-all text-xs text-muted">{JSON.stringify(r.metadata)}</code></td>
                <td className="px-3 py-2"><code className="text-[10px] text-muted">{r.correlationId.slice(0, 8)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </PageBody>
    </AppShell>
  );
}
