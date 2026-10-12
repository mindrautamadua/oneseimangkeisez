import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { requireAuth } from "@/lib/auth/current";
import { listNews, newsTopicCounts, type NewsView } from "@/lib/news/service";
import { NEWS_SOURCES, type NewsKind } from "@/lib/news/sources";
import { isNewsTopic, topicLabel, type NewsTopic } from "@/lib/news/topics";
import { AppShell } from "@/components/app-shell";
import { NewsCard, NewsFeature, NewsGrid, NewsHeadlines, TopicFilter, groupByDay } from "@/components/news";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Berita" };

const PAGE_SIZE = 12;
const KINDS: Array<{ key: NewsKind | "all"; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "official", label: "Berita KINRA" },
  { key: "industry", label: "Media & pemerintah" },
];

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const auth = await requireAuth("/news");
  const kind = sp.jenis === "official" || sp.jenis === "industry" ? sp.jenis : undefined;
  const topic: NewsTopic | null = isNewsTopic(sp.topik) ? sp.topik : null;
  const page = Math.max(1, Math.min(1000, Number.parseInt(sp.hal ?? "1", 10) || 1));
  // The lead story and the "latest" rail only appear on the unfiltered first page.
  const front = page === 1 && !topic;
  const [main, counts, lead, latest] = await Promise.all([
    listNews({ kind, topic: topic ?? undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    newsTopicCounts(kind),
    front && kind !== "industry" ? listNews({ kind: "official", limit: 5 }) : null,
    front && kind !== "official" ? listNews({ kind: "industry", limit: 5 }) : null,
  ]);
  const feature: NewsView | undefined = lead?.items[0];
  const rail = latest?.items ?? [];
  // KINRA publishes rarely, so its older stories would sink below industry news; keep them visible.
  const kinraMore = kind === undefined ? (lead?.items.slice(1) ?? []) : [];
  const shown = new Set([feature?.id, ...rail.map((r) => r.id), ...kinraMore.map((r) => r.id)]);
  const rest = main.items.filter((i) => !shown.has(i.id));
  const pages = Math.max(1, Math.ceil(main.total / PAGE_SIZE));
  const now = new Date();

  const href = (k: NewsKind | "all" | undefined, t: NewsTopic | null, p = 1) => {
    const q = new URLSearchParams();
    if (k && k !== "all") q.set("jenis", k);
    if (t) q.set("topik", t);
    if (p > 1) q.set("hal", String(p));
    const s = q.toString();
    return s ? `/news?${s}` : "/news";
  };

  return (
    <AppShell auth={auth} active="news">
      <section className="bg-navy-900 text-white" aria-labelledby="judul-berita">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
          <p className="flex items-center gap-2 text-sm font-medium text-sky-300">
            <Newspaper className="h-4 w-4" aria-hidden="true" /> Kabar KINRA & industri
          </p>
          <h1 id="judul-berita" className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {topic ? topicLabel(topic) : "Berita & perkembangan"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            Dikurasi otomatis dari situs resmi KEK Sei Mangkei, media, dan pemerintah. Fokus pemantauan: investasi,
            infrastruktur & utilitas, regulasi KEK, serta risiko & keselamatan kawasan. Artikel lengkap dibuka di situs sumbernya.
          </p>
          <nav aria-label="Jenis berita" className="mt-6 inline-flex rounded-full bg-white/10 p-1 ring-1 ring-inset ring-white/15">
            {KINDS.map((k) => {
              const on = (kind ?? "all") === k.key;
              return (
                <Link
                  key={k.key}
                  href={href(k.key, topic)}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${on ? "bg-white text-navy-900" : "text-slate-200 hover:text-white"}`}
                >
                  {k.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="mx-auto -mt-10 w-full max-w-7xl px-4 pb-12 sm:px-6">
        {feature || rail.length ? (
          <div className={`mb-10 grid grid-cols-1 gap-5 ${feature && rail.length ? "lg:grid-cols-5" : ""}`}>
            {feature ? (
              <div className={rail.length ? "lg:col-span-3" : ""}>
                <NewsFeature item={feature} now={now} />
              </div>
            ) : null}
            {rail.length ? (
              <div className={feature ? "lg:col-span-2" : ""}>
                <NewsHeadlines items={rail} title="Kabar prioritas terbaru" now={now} />
              </div>
            ) : null}
          </div>
        ) : null}

        {kinraMore.length ? (
          <section aria-labelledby="dari-kinra" className="mb-10">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id="dari-kinra" className="text-xs font-semibold uppercase tracking-wider text-muted">
                Lainnya dari KINRA
              </h2>
              <Link href={href("official", null)} className="text-sm font-semibold text-brand-700 hover:text-brand-900">
                Semua berita KINRA
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="kinra-more">
              {kinraMore.map((n) => (
                <li key={n.id}>
                  <NewsCard item={n} compact now={now} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={feature || rail.length ? "" : "rounded-3xl bg-canvas pt-2"}>
          <TopicFilter active={topic} counts={counts} href={(t) => href(kind, t)} />
        </div>

        {rest.length === 0 && !feature && !rail.length ? (
          <div className="mt-8">
            <NewsGrid items={[]} emptyText="Belum ada berita untuk pilihan ini. Berita diperbarui berkala dari sumbernya." />
          </div>
        ) : (
          groupByDay(rest, now).map((g) => (
            <section key={g.label} aria-labelledby={`grup-${g.label}`} className="mt-8">
              <h2 id={`grup-${g.label}`} className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
                {g.label}
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </h2>
              <NewsGrid wide items={g.items} emptyText="" />
            </section>
          ))
        )}

        {pages > 1 ? (
          <nav aria-label="Halaman" className="mt-10 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link href={href(kind, topic, page - 1)} className={buttonClass.secondary}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Sebelumnya
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted">
              Halaman {Math.min(page, pages)} dari {pages}
            </span>
            {page < pages ? (
              <Link href={href(kind, topic, page + 1)} className={buttonClass.secondary}>
                Berikutnya <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}

        <p className="mt-10 text-xs text-muted">
          Sumber: {NEWS_SOURCES.map((s) => s.name).join(" · ")}. Berita dari media dan pemerintah hanya diambil bila menyangkut topik
          prioritas KINRA atau kawasan.
        </p>
      </div>
    </AppShell>
  );
}
