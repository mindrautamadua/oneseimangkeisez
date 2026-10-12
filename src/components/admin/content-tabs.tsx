import Link from "next/link";

/** Sub-navigation for content administration. */
export function ContentTabs({ active }: { active: "announcements" | "news" }) {
  const tabs = [
    { key: "announcements", href: "/admin/announcements", label: "Pengumuman" },
    { key: "news", href: "/admin/news", label: "Berita" },
  ] as const;
  return (
    <nav aria-label="Pengelolaan konten" className="mb-6 flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${active === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-muted hover:text-ink"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Date to a WIB `datetime-local` input value (WIB has no DST). */
export function toWibInput(d: Date | null): string {
  return d ? new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 16) : "";
}
