import type { Metadata } from "next";
import Link from "next/link";
import { Building2, UserX } from "lucide-react";
import { requireAuth } from "@/lib/auth/current";
import { listVisibleAnnouncements } from "@/lib/announcements/service";
import { listAuthorizedApps } from "@/lib/catalogue/service";
import { listNews } from "@/lib/news/service";
import { isPriorityTopic } from "@/lib/news/topics";
import { env } from "@/lib/env";
import { AppShell, PageBody } from "@/components/app-shell";
import { Assistant } from "@/components/assistant";
import { AnnouncementList, UrgentAnnouncements } from "@/components/announcements";
import { Catalogue } from "@/components/catalogue";
import { NewsGrid } from "@/components/news";
import { DemoNote, EstatePattern, HeroStat, TodayPanel } from "@/components/workspace-hero";
import { StatePanel } from "@/components/ui";

export const metadata: Metadata = { title: "Beranda" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()));
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function WorkspacePage() {
  const auth = await requireAuth("/workspace");
  if (!auth.ctx) {
    return (
      <AppShell auth={auth} active="workspace">
        <PageBody>
          <StatePanel icon={<UserX className="h-6 w-6" />} title="Akun belum terhubung ke organisasi">
            Anda berhasil masuk, tetapi akun Anda belum terdaftar pada organisasi KINRA atau tenant yang aktif di
            OneSeiMangkeiSEZ. Hubungi Helpdesk TI KINRA atau administrator organisasi Anda.
          </StatePanel>
        </PageBody>
      </AppShell>
    );
  }
  // Official KINRA news is published far less often than industry media, so it gets its own
  // slots instead of being pushed off the home page by newer industry headlines.
  const [apps, announcements, official, industry] = await Promise.all([
    listAuthorizedApps(auth.ctx),
    listVisibleAnnouncements({ sub: auth.principal.sub, name: auth.principal.name, ctx: auth.ctx }, 20),
    listNews({ kind: "official", limit: 2 }),
    listNews({ kind: "industry", limit: 4 }),
  ]);
  const news = [...official.items, ...industry.items].slice(0, 4);
  const urgent = announcements.filter((a) => a.priority !== "normal");
  const pendingAcks = announcements.filter((a) => a.requiresAck && !a.ackedAt).length;
  const tenant = auth.ctx.org.orgType === "tenant";
  const priorityNews = [...industry.items, ...official.items].find((n) => isPriorityTopic(n.topic)) ?? null;
  const firstName = auth.principal.name.replace(/\(.*?\)/g, "").trim().split(/\s+/)[0];
  const demo = apps.some((a) => a.isDemo);

  return (
    <AppShell auth={auth} active="workspace">
      <section
        className={`relative overflow-hidden ${tenant ? "bg-tenant-900" : "bg-navy-900"} text-white`}
        aria-labelledby="sapaan"
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            tenant
              ? "bg-[radial-gradient(ellipse_at_85%_15%,rgba(45,212,191,0.18),transparent_55%)]"
              : "bg-[radial-gradient(ellipse_at_85%_15%,rgba(56,189,248,0.16),transparent_55%)]"
          }`}
        />
        <EstatePattern />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-14 pt-7 sm:px-6 sm:pb-16 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center">
          <div>
            <p className={`text-sm font-medium ${tenant ? "text-tenant-200" : "text-sky-300"}`}>{greeting()},</p>
            <h1 id="sapaan" className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {firstName}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300 sm:text-base">
              <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{tenant ? "Layanan untuk" : "Aplikasi internal untuk"}</span>
              <strong className="font-semibold text-white" data-testid="context-org">
                {auth.ctx.org.displayName}
              </strong>
            </p>
            <dl className="mt-6 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
              <HeroStat label="Aplikasi" value={apps.length} href="#cari" />
              <HeroStat label="Pengumuman" value={announcements.length} href="/announcements" />
              <HeroStat label="Perlu konfirmasi" value={pendingAcks} href="/announcements" alert={pendingAcks > 0} />
            </dl>
            {demo ? <DemoNote /> : null}
          </div>
          <TodayPanel announcements={announcements} priorityNews={priorityNews} tenant={tenant} />
        </div>
      </section>
      {/* relative: paints above the (positioned) hero where the first card overlaps it */}
      <div className="relative mx-auto -mt-7 w-full max-w-7xl px-4 pb-12 sm:px-6">
        <UrgentAnnouncements items={urgent.slice(0, 3)} total={announcements.length} />
        <Catalogue apps={apps} tenant={tenant} />
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section aria-labelledby="berita" className="lg:col-span-2">
            <SectionHead id="berita" title="Berita & perkembangan" href="/news" linkText="Lihat semua berita" />
            <NewsGrid compact items={news} emptyText="Belum ada berita yang terkumpul dari sumber resmi KINRA dan media industri." />
          </section>
          <section aria-labelledby="pengumuman">
            <SectionHead id="pengumuman" title="Pengumuman" href="/announcements" linkText="Lihat semua" />
            <AnnouncementList
              items={announcements.filter((a) => a.priority === "normal").slice(0, 4)}
              emptyText={urgent.length ? "Tidak ada pengumuman lain selain yang penting di atas." : "Tidak ada pengumuman aktif untuk Anda saat ini."}
            />
          </section>
        </div>
        <Assistant enabled={Boolean(env().ANTHROPIC_API_KEY)} tenant={tenant} />
      </div>
    </AppShell>
  );
}

function SectionHead({ id, title, href, linkText }: { id: string; title: string; href: string; linkText: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
      <h2 id={id} className="text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <Link href={href} className="text-sm font-semibold text-brand-700 hover:text-brand-900">
        {linkText}
      </Link>
    </div>
  );
}
