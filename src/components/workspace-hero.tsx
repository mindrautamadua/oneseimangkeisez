import Link from "next/link";
import { ArrowUpRight, BellRing, CircleCheck, Info, OctagonAlert } from "lucide-react";
import type { AnnouncementView } from "@/lib/announcements/service";
import type { NewsView } from "@/lib/news/service";
import { topicLabel } from "@/lib/news/topics";
import { TOPIC_STYLE } from "./news";
import { formatWibTime } from "./labels";
import { WibClock } from "./wib-clock";

/**
 * Decorative industrial-estate site plan (plots, roads, rail spur, retention pond), drawn as
 * thin lines and faded towards the text so it never competes with content.
 */
export function EstatePattern() {
  const plots: Array<[number, number, number, number]> = [];
  for (const [bx, by, cols, rows] of [
    [250, 30, 3, 2],
    [430, 30, 3, 2],
    [250, 200, 3, 2],
    [430, 200, 2, 3],
    [90, 200, 2, 2],
  ] as const) {
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) plots.push([bx + c * 52, by + r * 70, 44, 60]);
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 420"
      preserveAspectRatio="xMaxYMid meet"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-full opacity-[0.12] [mask-image:linear-gradient(to_left,black_40%,transparent_90%)]"
      fill="none"
      stroke="white"
    >
      {/* main estate roads */}
      <path d="M0 175 H640 M230 0 V420 M410 0 V420" strokeWidth="10" strokeLinecap="round" opacity="0.7" />
      <path d="M0 175 H640 M230 0 V420 M410 0 V420" strokeWidth="1" strokeDasharray="10 8" opacity="0.9" />
      {/* curved access road */}
      <path d="M0 360 C140 360 180 300 230 260" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
      {/* rail spur */}
      <path d="M0 395 C200 395 360 380 640 330" strokeWidth="1.5" />
      <path d="M0 395 C200 395 360 380 640 330" strokeWidth="6" strokeDasharray="1 7" />
      {/* plots */}
      {plots.map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="3" strokeWidth="1.2" />
      ))}
      {/* retention pond / IPAL */}
      <ellipse cx="120" cy="80" rx="62" ry="38" strokeWidth="1.2" />
      <ellipse cx="120" cy="80" rx="44" ry="24" strokeWidth="0.8" strokeDasharray="3 4" />
    </svg>
  );
}

export function HeroStat({
  label,
  value,
  href,
  alert = false,
  testId,
}: {
  label: string;
  value: number;
  href?: string;
  alert?: boolean;
  testId?: string;
}) {
  const box = `block rounded-xl px-3 py-2.5 ring-1 ring-inset transition-colors duration-200 sm:px-4 ${
    alert ? "bg-amber-300 text-navy-900 ring-amber-200 hover:bg-amber-200" : "bg-white/[0.07] ring-white/10 hover:bg-white/[0.12]"
  }`;
  const inner = (
    <>
      <span className={`block truncate text-xs ${alert ? "font-semibold text-navy-900/80" : "text-slate-300"}`}>{label}</span>
      <span className="block font-display text-xl font-semibold tabular-nums">{value}</span>
    </>
  );
  return (
    <div data-testid={testId}>
      <dt className="sr-only">{label}</dt>
      <dd>
        {href ? (
          <Link href={href} className={box}>
            {inner}
          </Link>
        ) : (
          <span className={box}>{inner}</span>
        )}
      </dd>
    </div>
  );
}

/** "Hari ini": what needs attention right now, from data the page already loaded. */
export function TodayPanel({
  announcements,
  priorityNews,
  tenant,
}: {
  announcements: AnnouncementView[];
  priorityNews: NewsView | null;
  tenant: boolean;
}) {
  const now = new Date();
  const date = now.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long" });
  const critical = announcements.filter((a) => a.priority === "critical");
  const pending = announcements.filter((a) => a.requiresAck && !a.ackedAt).length;
  const row = "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-white/[0.08]";
  return (
    <aside
      aria-labelledby="hari-ini"
      className="relative rounded-2xl bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm sm:p-5"
      data-testid="today-panel"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 id="hari-ini" className={`text-xs font-semibold uppercase tracking-wider ${tenant ? "text-tenant-200" : "text-sky-300"}`}>
          Hari ini
        </h2>
        <p className="text-sm text-slate-300">
          <span className="capitalize">{date}</span> · <WibClock initial={formatWibTime(now)} /> WIB
        </p>
      </div>
      <ul className="space-y-1">
        <li>
          {critical.length ? (
            <Link href={critical.length === 1 ? `/announcements/${critical[0]!.id}` : "/announcements"} className={row}>
              <OctagonAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {critical.length} pengumuman kritis aktif
                </span>
                <span className="line-clamp-1 text-xs text-slate-300">{critical[0]!.title}</span>
              </span>
            </Link>
          ) : (
            <p className={`${row} hover:bg-transparent`}>
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
              <span className="text-sm text-slate-200">Tidak ada pengumuman kritis</span>
            </p>
          )}
        </li>
        {pending ? (
          <li>
            <Link href="/announcements" className={row} data-testid="pending-acks">
              <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
              <span className="text-sm font-semibold text-amber-100">{pending} pengumuman menunggu konfirmasi baca Anda</span>
            </Link>
          </li>
        ) : null}
        {priorityNews ? (
          <li>
            <a href={priorityNews.url} target="_blank" rel="noopener noreferrer" className={`group ${row}`}>
              {(() => {
                const Icon = TOPIC_STYLE[priorityNews.topic].icon;
                return <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" aria-hidden="true" />;
              })()}
              <span className="min-w-0">
                <span className="block text-xs text-slate-300">Kabar prioritas · {topicLabel(priorityNews.topic)}</span>
                <span className="line-clamp-2 text-sm font-semibold group-hover:underline">{priorityNews.title}</span>
                <span className="sr-only">(tab baru)</span>
              </span>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </a>
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

/** Demo-only explanation, collapsed so the hero is not dominated by text. */
export function DemoNote() {
  return (
    <details className="group mt-5 max-w-2xl text-xs text-slate-300 sm:text-sm" data-testid="simulation-note">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1 font-semibold text-amber-200 ring-1 ring-inset ring-amber-300/30 hover:bg-amber-300/25 [&::-webkit-details-marker]:hidden">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        Katalog demo · simulasi end state 2030
      </summary>
      <p className="mt-2 leading-5">
        Katalog demo disusun dari draf RSTI PT KINRA 2026–2030. Sebagian besar aplikasi belum tersedia hari ini. Label seperti “IT-08 ·
        2026–27” menunjukkan inisiatif dan periode target roadmap.
      </p>
    </details>
  );
}
