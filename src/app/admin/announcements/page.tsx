import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { adminListAnnouncements } from "@/lib/announcements/service";
import { AppShell, PageBody } from "@/components/app-shell";
import { ContentTabs } from "@/components/admin/content-tabs";
import { PriorityBadge } from "@/components/announcements";
import { ANNOUNCEMENT_STATE_LABEL, AUDIENCE_LABEL, formatWib } from "@/components/labels";
import { Badge, PageHeader, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Admin Konten" };

const STATE_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-sky-50 text-sky-800",
  active: "bg-emerald-50 text-emerald-800",
  expired: "bg-slate-100 text-slate-500",
  withdrawn: "bg-rose-50 text-rose-800",
};

export default async function AdminAnnouncements() {
  const auth = await requireAdmin("/admin/announcements");
  const rows = await adminListAnnouncements({ sub: auth.principal.sub, ctx: auth.ctx });
  return (
    <AppShell auth={auth} active="content">
      <PageBody>
        <PageHeader
          title="Konten portal"
          description="Kelola pengumuman resmi dan berita. Penerbitan, perubahan, dan penarikan tercatat di jejak audit."
          actions={
            <Link href="/admin/announcements/new" className={buttonClass.primary}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Buat pengumuman
            </Link>
          }
        />
        <ContentTabs active="announcements" />
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-muted">Belum ada pengumuman.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Judul</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Audiens</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Tayang</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Konfirmasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ announcement: a, state, targeted, ackCount }) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={a.priority} />
                        {a.isDemo ? <Badge>Demo</Badge> : null}
                      </div>
                      <Link href={`/admin/announcements/${a.id}`} className="font-semibold text-ink hover:text-brand-700">
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_STYLE[state]}`}>{ANNOUNCEMENT_STATE_LABEL[state]}</span>
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {AUDIENCE_LABEL[a.audience]}
                      {targeted ? " · terbatas" : ""}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {a.publishAt ? formatWib(a.publishAt) : "—"}
                      {a.expiresAt ? <span className="block text-xs">s.d. {formatWib(a.expiresAt)}</span> : null}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted">{a.requiresAck ? `${ackCount} pengguna (v${a.version})` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>
    </AppShell>
  );
}
