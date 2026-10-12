import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { adminNewsOverview } from "@/lib/news/service";
import { findSource } from "@/lib/news/sources";
import { env } from "@/lib/env";
import { AppShell, PageBody } from "@/components/app-shell";
import { ContentTabs } from "@/components/admin/content-tabs";
import { HideNewsToggle, SyncNewsButton } from "@/components/admin/news-admin";
import { NEWS_KIND_LABEL, formatWib } from "@/components/labels";
import { Badge, Card, PageHeader, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Admin Berita" };

export default async function AdminNews({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const auth = await requireAdmin("/admin/news");
  const page = Math.max(1, Math.min(1000, Number.parseInt((await searchParams).hal ?? "1", 10) || 1));
  const data = await adminNewsOverview({ sub: auth.principal.sub, ctx: auth.ctx }, page);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const scheduled = Boolean(env().NEWS_SYNC_TOKEN);

  return (
    <AppShell auth={auth} active="content">
      <PageBody>
        <PageHeader
          title="Konten portal"
          description="Berita dikumpulkan dari feed RSS publik yang ditetapkan di kode. Portal hanya menyimpan judul, cuplikan, dan tautan ke artikel asli."
          actions={<SyncNewsButton />}
        />
        <ContentTabs active="news" />

        <section aria-labelledby="sumber" className="mb-8">
          <h2 id="sumber" className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Sumber berita
          </h2>
          <p className="mb-3 text-sm text-muted">
            {scheduled
              ? "Pembaruan otomatis aktif melalui endpoint penjadwal (/api/internal/news-sync)."
              : "Pembaruan otomatis belum dikonfigurasi (NEWS_SYNC_TOKEN kosong). Berita hanya diperbarui saat tombol Sinkronkan ditekan."}
          </p>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Sumber</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Jenis</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Tampil</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Sinkronisasi terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.sources.map((s) => (
                  <tr key={s.key}>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink">{s.name}</span>
                      <span className="block break-all text-xs text-muted">{s.feedUrl}</span>
                      {s.filtered ? <span className="text-xs text-muted">Hanya topik prioritas KINRA</span> : null}
                    </td>
                    <td className="px-3 py-3 text-muted">{NEWS_KIND_LABEL[s.kind]}</td>
                    <td className="px-3 py-3 tabular-nums text-muted">{s.visible}</td>
                    <td className="px-3 py-3 text-muted">
                      {!s.state?.lastAttemptAt ? (
                        "Belum pernah"
                      ) : s.state.lastError ? (
                        <span className="text-rose-800">
                          Gagal {formatWib(s.state.lastAttemptAt)}: {s.state.lastError}
                          {s.state.lastSuccessAt ? <span className="block text-xs text-muted">Berhasil terakhir {formatWib(s.state.lastSuccessAt)}</span> : null}
                        </span>
                      ) : (
                        <span>
                          Berhasil {formatWib(s.state.lastSuccessAt ?? s.state.lastAttemptAt)}
                          <span className="block text-xs">
                            {s.state.lastAccepted} dari {s.state.lastFetched} entri relevan
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="daftar-berita">
          <h2 id="daftar-berita" className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Berita terkumpul ({data.total})
          </h2>
          {data.items.length === 0 ? (
            <Card className="px-4 py-8 text-center text-sm text-muted">Belum ada berita. Tekan “Sinkronkan sekarang”.</Card>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white shadow-card">
              {data.items.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.hidden ? "bg-slate-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{findSource(n.sourceKey)?.name ?? n.sourceKey}</span>
                      <span>· {formatWib(n.publishedAt, "date")}</span>
                      {n.hidden ? <Badge tone="warn">Disembunyikan</Badge> : null}
                    </div>
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className={`font-medium hover:text-brand-700 ${n.hidden ? "text-muted line-through" : "text-ink"}`}>
                      {n.title}
                    </a>
                  </div>
                  <HideNewsToggle id={n.id} hidden={n.hidden} />
                </li>
              ))}
            </ul>
          )}
          {pages > 1 ? (
            <nav aria-label="Halaman" className="mt-4 flex items-center justify-between">
              {page > 1 ? <Link className={buttonClass.secondary} href={`/admin/news?hal=${page - 1}`}>Sebelumnya</Link> : <span />}
              <span className="text-sm text-muted">Halaman {Math.min(page, pages)} dari {pages}</span>
              {page < pages ? <Link className={buttonClass.secondary} href={`/admin/news?hal=${page + 1}`}>Berikutnya</Link> : <span />}
            </nav>
          ) : null}
        </section>
      </PageBody>
    </AppShell>
  );
}
