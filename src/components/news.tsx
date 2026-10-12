import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowUpRight, Building2, Newspaper, Scale, ShieldAlert, TrendingUp, Zap } from "lucide-react";
import type { NewsView } from "@/lib/news/service";
import { NEWS_TOPICS, topicLabel, type NewsTopic } from "@/lib/news/topics";
import { formatWib } from "./labels";

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

/** Generated cover per topic: no image assets, no third-party images. */
export const TOPIC_STYLE: Record<NewsTopic, { icon: Icon; cover: string; chip: string }> = {
  keselamatan: { icon: ShieldAlert, cover: "from-rose-500 to-orange-700", chip: "bg-rose-50 text-rose-800 ring-rose-600/20" },
  regulasi: { icon: Scale, cover: "from-indigo-500 to-violet-800", chip: "bg-indigo-50 text-indigo-800 ring-indigo-600/20" },
  infrastruktur: { icon: Zap, cover: "from-cyan-600 to-blue-800", chip: "bg-cyan-50 text-cyan-800 ring-cyan-600/20" },
  investasi: { icon: TrendingUp, cover: "from-emerald-500 to-green-800", chip: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  kawasan: { icon: Building2, cover: "from-sky-600 to-navy-900", chip: "bg-sky-50 text-sky-800 ring-sky-600/20" },
  umum: { icon: Newspaper, cover: "from-slate-600 to-slate-900", chip: "bg-slate-100 text-slate-700 ring-slate-500/20" },
};

/** "baru saja", "3 jam lalu", "kemarin", … then an absolute date. Calendar days in WIB. */
export function relativeTime(d: Date, now = new Date()): string {
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const days = wibDayDiff(d, now);
  if (days === 0) return `${Math.floor(mins / 60)} jam lalu`;
  if (days === 1) return "kemarin";
  if (days < 7) return `${days} hari lalu`;
  return formatWib(d, "date");
}

function wibDayDiff(d: Date, now: Date): number {
  const day = (x: Date) => Math.floor((x.getTime() + 7 * 3_600_000) / 86_400_000);
  return day(now) - day(d);
}

/** Groups (already sorted) headlines into reading buckets. */
export function groupByDay(items: NewsView[], now = new Date()): Array<{ label: string; items: NewsView[] }> {
  const label = (d: Date) => {
    const n = wibDayDiff(d, now);
    if (n <= 0) return "Hari ini";
    if (n === 1) return "Kemarin";
    if (n < 7) return "Pekan ini";
    if (n < 31) return "Bulan ini";
    return "Lebih lama";
  };
  const groups: Array<{ label: string; items: NewsView[] }> = [];
  for (const it of items) {
    const l = label(it.publishedAt);
    const last = groups.at(-1);
    if (last?.label === l) last.items.push(it);
    else groups.push({ label: l, items: [it] });
  }
  return groups;
}

export function TopicTag({ topic, onDark = false }: { topic: NewsTopic; onDark?: boolean }) {
  const t = TOPIC_STYLE[topic];
  const Icon = t.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${onDark ? "bg-white/15 text-white ring-white/25 backdrop-blur-sm" : t.chip}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {topicLabel(topic)}
    </span>
  );
}

/**
 * Photo for official KINRA news, otherwise the generated topic cover. Decorative.
 * `className` must set the positioning (relative/absolute) and size.
 */
const COVER_VARIANTS = [
  { dir: "bg-gradient-to-br", icon: "-bottom-6 right-6 rotate-[-12deg]", blob: "-left-10 -top-16" },
  { dir: "bg-gradient-to-tr", icon: "-top-6 right-10 rotate-[10deg]", blob: "-bottom-16 -left-6" },
  { dir: "bg-gradient-to-bl", icon: "-bottom-8 left-1/2 rotate-[-4deg]", blob: "-right-10 -top-16" },
  { dir: "bg-gradient-to-tl", icon: "-bottom-4 right-1/3 rotate-[16deg]", blob: "-left-12 top-4" },
] as const;

/** Stable per-item variation so a row of same-topic covers does not look identical. */
function coverVariant(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVER_VARIANTS[h % COVER_VARIANTS.length]!;
}

function NewsCover({ item, className, big = false }: { item: NewsView; className: string; big?: boolean }) {
  const t = TOPIC_STYLE[item.topic];
  const Icon = t.icon;
  const v = coverVariant(item.id);
  return (
    <div className={`overflow-hidden ${v.dir} ${t.cover} ${className}`} aria-hidden="true">
      {/* Generated cover is always drawn first: it shows while loading and if a publisher image fails. */}
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:14px_14px]" />
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- same-origin KINRA copy (needs the session) or a hotlinked publisher image.
        <img
          src={item.imageUrl}
          alt=""
          loading={big ? "eager" : "lazy"}
          decoding="async"
          // Publisher images: do not tell third parties which portal page the reader is on.
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <>
          <div className={`absolute h-40 w-40 rounded-full bg-white/20 blur-2xl ${v.blob}`} />
          <Icon
            className={`absolute text-white opacity-25 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110 motion-reduce:transition-none ${big ? "-bottom-10 right-6 h-56 w-56 rotate-[-12deg]" : `h-28 w-28 ${v.icon}`}`}
          />
        </>
      )}
    </div>
  );
}

function SourceLine({ item, now }: { item: NewsView; now: Date }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.source.kind === "official" ? "bg-brand-500" : "bg-slate-400"}`} aria-hidden="true" />
      <span className="truncate font-medium text-ink/80">{item.source.name}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={item.publishedAt.toISOString()} title={formatWib(item.publishedAt)} className="shrink-0">
        {relativeTime(item.publishedAt, now)}
      </time>
    </span>
  );
}

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * Headline card. Articles open on the publisher's site (new tab): the portal keeps only the
 * headline and a short excerpt, never the full text or images of third-party articles.
 */
export function NewsCard({ item, compact = false, now = new Date() }: { item: NewsView; compact?: boolean; now?: Date }) {
  return (
    <a
      href={item.url}
      {...external}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0"
      data-testid="news-card"
    >
      <div className="relative">
        <NewsCover item={item} className={`relative ${compact ? "h-32" : "aspect-[2/1]"}`} />
        <span className="absolute left-3 top-3">
          <TopicTag topic={item.topic} onDark />
        </span>
        {item.source.kind === "official" ? (
          <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm">
            KINRA
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <SourceLine item={item} now={now} />
        <span className="mt-2 line-clamp-3 font-display font-semibold leading-snug text-ink group-hover:text-brand-700">{item.title}</span>
        {item.summary && !compact ? <span className="mt-1.5 line-clamp-2 text-sm text-muted">{item.summary}</span> : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-brand-700">
          Baca di {item.source.kind === "official" ? "situs KINRA" : "situs sumber"}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          <span className="sr-only">(tab baru)</span>
        </span>
      </div>
    </a>
  );
}

/** Magazine-style lead story with the title over the photo. */
export function NewsFeature({ item, now = new Date() }: { item: NewsView; now?: Date }) {
  return (
    <a
      href={item.url}
      {...external}
      className="group relative flex min-h-[20rem] overflow-hidden rounded-3xl bg-navy-900 shadow-lift sm:min-h-[26rem]"
      data-testid="news-feature"
    >
      <NewsCover item={item} big className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-transparent" aria-hidden="true" />
      <div className="relative mt-auto p-5 text-white sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
            Sorotan {item.source.kind === "official" ? "KINRA" : ""}
          </span>
          <TopicTag topic={item.topic} onDark />
        </div>
        <h2 className="max-w-3xl font-display text-2xl font-semibold leading-tight sm:text-[2rem]">{item.title}</h2>
        {item.summary ? <p className="mt-3 line-clamp-2 max-w-2xl text-sm text-slate-200 sm:text-base">{item.summary}</p> : null}
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
          <span>{item.source.name}</span>
          <time dateTime={item.publishedAt.toISOString()}>{relativeTime(item.publishedAt, now)}</time>
          <span className="inline-flex items-center gap-1 font-semibold text-white">
            Baca selengkapnya
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            <span className="sr-only">(tab baru)</span>
          </span>
        </p>
      </div>
    </a>
  );
}

/** Numbered "latest" rail. */
export function NewsHeadlines({ items, title, now = new Date() }: { items: NewsView[]; title: string; now?: Date }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="kabar-terbaru" className="flex flex-col rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6">
      <h2 id="kabar-terbaru" className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {title}
      </h2>
      <ol className="divide-y divide-line">
        {items.map((it, i) => (
          <li key={it.id}>
            <a href={it.url} {...external} className="group flex gap-4 py-3.5">
              <span className="font-display text-2xl font-semibold tabular-nums leading-none text-slate-300 group-hover:text-brand-500" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 font-semibold leading-snug text-ink group-hover:text-brand-700">{it.title}</span>
                <span className="mt-1 block">
                  <SourceLine item={it} now={now} />
                </span>
                <span className="sr-only">(tab baru)</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TopicFilter({
  active,
  counts,
  href,
}: {
  active: NewsTopic | null;
  counts: Partial<Record<NewsTopic, number>>;
  href: (topic: NewsTopic | null) => string;
}) {
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  // `tone` replaces the neutral colours for priority topics (classes must not compete).
  const chip = (on: boolean, tone?: string) =>
    `inline-flex min-h-10 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors duration-200 ${on ? "border-navy-900 bg-navy-900 text-white" : tone ? `border-transparent ring-1 ring-inset hover:brightness-95 ${tone}` : "border-line bg-white text-ink hover:border-slate-300 hover:bg-slate-50"}`;
  return (
    <nav aria-label="Topik berita" className="relative -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link href={href(null)} aria-current={active === null ? "page" : undefined} className={chip(active === null)}>
        Semua topik <span className="tabular-nums opacity-60">{total}</span>
      </Link>
      <span className="hidden items-center pl-2 text-[11px] font-semibold uppercase tracking-wider text-muted sm:inline-flex">Prioritas</span>
      {/* The four monitoring priorities are always listed, even when empty, so the focus is visible. */}
      {NEWS_TOPICS.filter((t) => t.priority || counts[t.key]).map((t) => {
        const Icon = TOPIC_STYLE[t.key].icon;
        const on = active === t.key;
        return (
          <Link
            key={t.key}
            href={href(t.key)}
            aria-current={on ? "page" : undefined}
            className={chip(on, t.priority ? TOPIC_STYLE[t.key].chip : undefined)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t.label} <span className="tabular-nums opacity-60">{counts[t.key] ?? 0}</span>
            {t.priority ? <span className="sr-only">(topik prioritas)</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function NewsGrid({
  items,
  emptyText,
  wide = false,
  compact = false,
}: {
  items: NewsView[];
  emptyText: string;
  wide?: boolean;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed border-line bg-white px-4 py-6 text-center text-sm text-muted">{emptyText}</p>;
  }
  const now = new Date();
  return (
    <ul className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${wide ? "lg:grid-cols-3" : ""}`} data-testid="news-list">
      {items.map((n) => (
        <li key={n.id}>
          <NewsCard item={n} compact={compact} now={now} />
        </li>
      ))}
    </ul>
  );
}

