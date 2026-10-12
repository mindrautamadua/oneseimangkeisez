import type { Metadata } from "next";
import { requireAuditReader } from "@/lib/auth/guards";
import { accessOverview } from "@/lib/catalogue/service";
import { env } from "@/lib/env";
import { AppShell, PageBody } from "@/components/app-shell";
import { ENV_LABEL } from "@/components/labels";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Ikhtisar Akses" };

export default async function AccessOverviewPage() {
  const auth = await requireAuditReader("/admin/access");
  const rows = await accessOverview();
  const e = env();
  return (
    <AppShell auth={auth} active="access">
      <PageBody>
      <PageHeader
        title="Ikhtisar akses efektif"
        description={`Hanya-baca. Keanggotaan organisasi dan peran pengguna bersumber dari ${e.AUTH_PROVIDER === "mock" ? "adapter MOCK (lokal)" : "identity provider (OIDC)"}; tabel ini menunjukkan hak akses aplikasi yang dikelola portal. Portal berjalan di lingkungan “${ENV_LABEL[e.APP_ENV]}”.`}
      />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="min-w-full divide-y divide-line text-sm">
          <caption className="sr-only">Hak akses aplikasi per organisasi dan peran</caption>
          <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Organisasi</th>
              <th scope="col" className="px-4 py-3">Peran</th>
              <th scope="col" className="px-4 py-3">Aplikasi</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Lingkungan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5">
                  {r.orgName} <span className="text-xs text-muted">({r.orgType === "kinra" ? "KINRA" : "Tenant"}{r.orgStatus !== "active" ? ", ditangguhkan" : ""})</span>
                </td>
                <td className="px-4 py-2.5"><code className="text-xs">{r.roleKey}</code></td>
                <td className="px-4 py-2.5">{r.appName}</td>
                <td className="px-4 py-2.5"><StatusBadge status={r.appStatus} /></td>
                <td className="px-4 py-2.5">{ENV_LABEL[r.appEnvironment]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </PageBody>
    </AppShell>
  );
}
