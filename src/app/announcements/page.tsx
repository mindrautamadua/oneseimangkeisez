import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/current";
import { listVisibleAnnouncements } from "@/lib/announcements/service";
import { AppShell, PageBody } from "@/components/app-shell";
import { AnnouncementList } from "@/components/announcements";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Pengumuman" };

export default async function AnnouncementsPage() {
  const auth = await requireAuth("/announcements");
  const items = await listVisibleAnnouncements({ sub: auth.principal.sub, name: auth.principal.name, ctx: auth.ctx }, 50);
  const pending = items.filter((a) => a.requiresAck && !a.ackedAt);
  return (
    <AppShell auth={auth} active="announcements">
      <PageBody>
        <PageHeader
          title="Pengumuman"
          description={
            auth.ctx
              ? `Pengumuman resmi yang berlaku untuk ${auth.ctx.org.displayName}. Diurutkan dari yang paling mendesak.`
              : "Akun Anda belum terhubung ke organisasi, sehingga belum ada pengumuman untuk ditampilkan."
          }
        />
        {pending.length > 0 ? (
          <section aria-labelledby="perlu-konfirmasi" className="mb-8">
            <h2 id="perlu-konfirmasi" className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-800">
              Menunggu konfirmasi Anda ({pending.length})
            </h2>
            <AnnouncementList items={pending} emptyText="" />
          </section>
        ) : null}
        <section aria-labelledby="semua-pengumuman">
          <h2 id="semua-pengumuman" className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Semua pengumuman aktif ({items.length})
          </h2>
          <AnnouncementList items={items} emptyText="Tidak ada pengumuman aktif untuk Anda saat ini." />
        </section>
      </PageBody>
    </AppShell>
  );
}
