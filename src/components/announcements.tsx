import Link from "next/link";
import { ArrowRight, CircleCheck, Info, Megaphone, OctagonAlert, TriangleAlert } from "lucide-react";
import type { AnnouncementView } from "@/lib/announcements/service";
import { ANNOUNCEMENT_CATEGORY_LABEL, PRIORITY_LABEL, formatWib } from "./labels";
import { Badge, Card } from "./ui";

const PRIORITY_TONE = {
  critical: { pill: "bg-rose-50 text-rose-800 ring-rose-600/25", bar: "border-l-rose-600", icon: OctagonAlert, iconTone: "text-rose-700" },
  high: { pill: "bg-amber-50 text-amber-900 ring-amber-600/30", bar: "border-l-amber-500", icon: TriangleAlert, iconTone: "text-amber-700" },
  normal: { pill: "bg-slate-100 text-slate-700 ring-slate-500/20", bar: "border-l-slate-300", icon: Info, iconTone: "text-slate-500" },
} as const;

/** Priority pill: icon + text so colour is never the only signal. */
export function PriorityBadge({ priority }: { priority: AnnouncementView["priority"] }) {
  const t = PRIORITY_TONE[priority];
  const Icon = t.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${t.pill}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function AckState({ a }: { a: Pick<AnnouncementView, "requiresAck" | "ackedAt"> }) {
  if (!a.requiresAck) return null;
  return a.ackedAt ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
      <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> Sudah dikonfirmasi
    </span>
  ) : (
    <Badge tone="warn">Perlu konfirmasi baca</Badge>
  );
}

function Meta({ a }: { a: AnnouncementView }) {
  return (
    <p className="text-xs text-muted">
      {a.publisher} · <time dateTime={a.publishAt.toISOString()}>{formatWib(a.publishAt, "date")}</time>
      {a.expiresAt ? <> · berlaku s.d. {formatWib(a.expiresAt)}</> : null}
    </p>
  );
}

/**
 * Critical and high announcements, shown first on the workspace so they are never buried
 * under other content. Normal ones stay in the information panel below the catalogue.
 */
export function UrgentAnnouncements({ items, total }: { items: AnnouncementView[]; total: number }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="pengumuman-penting" className="mb-6" data-testid="urgent-announcements">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 id="pengumuman-penting" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Megaphone className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Pengumuman penting
          </h2>
          <Link href="/announcements" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
            Semua pengumuman{total > items.length ? ` (${total})` : ""}
          </Link>
        </div>
        <ul className="divide-y divide-line">
          {items.map((a) => (
            <li key={a.id} className={`border-l-4 ${PRIORITY_TONE[a.priority].bar}`}>
              <Link
                href={`/announcements/${a.id}`}
                className="group flex flex-col gap-1.5 px-4 py-3.5 transition-colors duration-200 hover:bg-slate-50 sm:px-5"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={a.priority} />
                  <span className="text-xs font-medium text-muted">{ANNOUNCEMENT_CATEGORY_LABEL[a.category] ?? a.category}</span>
                  {a.isDemo ? <Badge>Contoh demo</Badge> : null}
                  <AckState a={a} />
                </span>
                <span className="font-semibold text-ink group-hover:text-brand-700">{a.title}</span>
                <span className="line-clamp-2 text-sm text-muted">{a.summary}</span>
                <Meta a={a} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

/** Compact list for the information panel and the announcements page. */
export function AnnouncementList({ items, emptyText }: { items: AnnouncementView[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed border-line bg-white px-4 py-6 text-center text-sm text-muted">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3" data-testid="announcement-list">
      {items.map((a) => (
        <li key={a.id}>
          <Link
            href={`/announcements/${a.id}`}
            className={`group block rounded-xl border border-line border-l-4 ${PRIORITY_TONE[a.priority].bar} bg-white px-4 py-3 shadow-card transition-shadow duration-200 hover:shadow-lift`}
          >
            <span className="mb-1 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={a.priority} />
              <span className="text-xs font-medium text-muted">{ANNOUNCEMENT_CATEGORY_LABEL[a.category] ?? a.category}</span>
              {a.isDemo ? <Badge>Contoh demo</Badge> : null}
              <AckState a={a} />
            </span>
            <span className="block font-semibold text-ink group-hover:text-brand-700">{a.title}</span>
            <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{a.summary}</span>
            <span className="mt-1.5 flex items-center justify-between gap-2">
              <Meta a={a} />
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-600" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
