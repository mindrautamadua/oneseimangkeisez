"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Info, KeyRound, Link2, Search, SearchX, ShieldCheck, X } from "lucide-react";
import type { CatalogueApp } from "@/lib/catalogue/service";
import { AppCover } from "./app-cover";
import { AppIcon } from "./app-icon";
import { INTEGRATION_LABEL } from "./labels";
import { StatusBadge } from "./ui";

type Accent = { iconBg: string; chipOn: string; ring: string; text: string };
const ACCENT: Record<"internal" | "tenant", Accent> = {
  internal: {
    iconBg: "bg-brand-50 text-brand-700 ring-brand-600/10",
    chipOn: "border-navy-900 bg-navy-900 text-white",
    ring: "group-hover:border-brand-500/60",
    text: "text-brand-700",
  },
  tenant: {
    iconBg: "bg-tenant-50 text-tenant-700 ring-tenant-600/10",
    chipOn: "border-tenant-700 bg-tenant-700 text-white",
    ring: "group-hover:border-tenant-600/60",
    text: "text-tenant-700",
  },
};

function IntegrationIcon({ mode }: { mode: string }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  if (mode === "oidc_sso" || mode === "saml_sso")
    return <ShieldCheck className={cls} aria-hidden="true" />;
  if (mode === "external_link") return <Link2 className={cls} aria-hidden="true" />;
  return <KeyRound className={cls} aria-hidden="true" />;
}

export function Catalogue({ apps, tenant }: { apps: CatalogueApp[]; tenant: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const accent = ACCENT[tenant ? "tenant" : "internal"];

  // Keyboard shortcut: "/" or Ctrl/⌘+K focuses search (ignored while typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const categories = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    for (const a of apps) {
      const c = m.get(a.category.slug);
      m.set(a.category.slug, { name: a.category.name, count: (c?.count ?? 0) + 1 });
    }
    return [...m.entries()];
  }, [apps]);

  const q = query.trim().toLowerCase();
  // Search operates only on the authorized catalogue already delivered by the server.
  const filtered = apps.filter(
    (a) =>
      (category === "all" || a.category.slug === category) &&
      (!q ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.name.toLowerCase().includes(q) ||
        (a.initiativeRef ?? "").toLowerCase().includes(q)),
  );
  const featured = !q && category === "all" ? apps.filter((a) => a.featured && a.launchable) : [];
  const grouped = !q && category === "all";

  return (
    <div>
      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <label htmlFor="cari" className="sr-only">
          Cari aplikasi
        </label>
        <input
          ref={inputRef}
          id="cari"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Cari aplikasi atau kode IT-xx…"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-line bg-white pl-12 pr-14 text-base sm:pr-24 text-ink shadow-lift outline-none transition-shadow duration-200 placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 [&::-webkit-search-cancel-button]:hidden"
          data-testid="search"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100 hover:text-ink"
              aria-label="Hapus pencarian"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="hidden rounded-md border border-line bg-slate-50 px-2 py-0.5 font-sans text-xs text-muted sm:inline">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div
        role="group"
        aria-label="Filter kategori"
        className="-mx-4 mt-5 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <Chip active={category === "all"} onClick={() => setCategory("all")} accent={accent}>
          Semua <Count>{apps.length}</Count>
        </Chip>
        {categories.map(([slug, c]) => (
          <Chip
            key={slug}
            active={category === slug}
            onClick={() => setCategory(slug)}
            accent={accent}
          >
            {c.name} <Count>{c.count}</Count>
          </Chip>
        ))}
      </div>

      {featured.length > 0 ? (
        <section aria-labelledby="unggulan" className="mt-8">
          <h2
            id="unggulan"
            className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Akses cepat
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((a) => (
              <li key={a.id}>
                <a
                  href={`/launch/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex h-full flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition-[border-color,box-shadow] duration-200 hover:shadow-lift ${accent.ring}`}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${accent.iconBg}`}
                    >
                      <AppIcon iconKey={a.iconKey} className="h-5 w-5" />
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-slate-400 transition-colors group-hover:text-ink"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                    {a.name}
                  </span>
                  <span className="sr-only">(buka di tab baru)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="semua-aplikasi" className="mt-10">
        <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <h2
            id="semua-aplikasi"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            {q ? "Hasil pencarian" : "Aplikasi Anda"}
          </h2>
          <p className="text-sm text-muted" aria-live="polite" data-testid="result-count">
            {filtered.length} aplikasi
          </p>
        </div>
        {apps.length === 0 ? (
          <Empty title="Belum ada aplikasi untuk Anda">
            Akun Anda belum memiliki hak akses ke aplikasi apa pun di organisasi ini. Hubungi
            administrator organisasi Anda atau Helpdesk TI KINRA untuk mengajukan akses.
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty title={`Tidak ada hasil untuk “${query || "filter ini"}”`} icon>
            <p>Coba kata kunci lain, misalnya nama layanan atau kode inisiatif seperti “IT-08”.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
                >
                  Hapus pencarian
                </button>
              ) : null}
              {category !== "all" ? (
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
                >
                  Tampilkan semua kategori
                </button>
              ) : null}
            </div>
          </Empty>
        ) : grouped ? (
          <div className="space-y-10" data-testid="app-list">
            {categories.map(([slug, c]) => {
              const inCat = filtered.filter((a) => a.category.slug === slug);
              if (inCat.length === 0) return null;
              return (
                <section key={slug} aria-labelledby={`kat-${slug}`}>
                  <h3
                    id={`kat-${slug}`}
                    className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink"
                  >
                    {c.name}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-sans text-xs font-semibold text-muted">
                      {inCat.length}
                    </span>
                  </h3>
                  <Grid apps={inCat} accent={accent} />
                </section>
              );
            })}
          </div>
        ) : (
          <div data-testid="app-list">
            <Grid apps={filtered} accent={accent} />
          </div>
        )}
      </section>
    </div>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 tabular-nums opacity-70">{children}</span>;
}

function Grid({ apps, accent }: { apps: CatalogueApp[]; accent: Accent }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {apps.map((a) => (
        <li key={a.id}>
          <AppCard app={a} accent={accent} />
        </li>
      ))}
    </ul>
  );
}

function Chip({
  active,
  onClick,
  children,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent: Accent;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 shrink-0 snap-start whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${active ? accent.chipOn : "border-line bg-white text-ink hover:border-slate-300 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

function Empty({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
      data-testid="empty-state"
    >
      {icon ? <SearchX className="mx-auto mb-3 h-9 w-9 text-slate-400" aria-hidden="true" /> : null}
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>
    </div>
  );
}

/**
 * Whole card is the launch target (stretched link). The detail link sits above it (z-10)
 * so both remain keyboard reachable without nesting interactive elements.
 */
function AppCard({ app, accent }: { app: CatalogueApp; accent: Accent }) {
  const external = app.integrationMode === "external_link";
  return (
    <article
      className={`group relative flex h-full flex-col rounded-2xl border bg-white shadow-card transition-[border-color,box-shadow,transform] duration-200 ${app.launchable ? `border-line hover:-translate-y-0.5 hover:shadow-lift ${accent.ring}` : "border-dashed border-slate-300 bg-slate-50/60"}`}
      data-testid={`app-card-${app.slug}`}
    >
      <AppCover app={app} variant="card" />
      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-7 flex items-end gap-4">
          <span
            className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lift ring-4 ring-white ${app.launchable ? accent.text : "text-slate-500"}`}
          >
            <AppIcon iconKey={app.iconKey} className="h-7 w-7" />
          </span>
          <div className="ml-auto pb-1">
            {app.launchable ? null : <StatusBadge status={app.status} />}
          </div>
        </div>
        <div className="mt-3">
          <div className="min-w-0">
            <h4 className="font-display text-[0.95rem] font-semibold leading-snug text-ink">
              {app.launchable ? (
                <a
                  href={`/launch/${app.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-500"
                  data-testid={`launch-${app.slug}`}
                >
                  {app.name}
                  <span className="sr-only">
                    {" "}
                    — buka di tab baru{external ? ", situs eksternal" : ""}
                  </span>
                </a>
              ) : (
                app.name
              )}
            </h4>
            <p className="mt-0.5 truncate text-xs text-muted">{app.category.name}</p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-muted">{app.description}</p>

        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
          <span
            className="inline-flex items-center gap-1"
            title={INTEGRATION_LABEL[app.integrationMode]}
          >
            <IntegrationIcon mode={app.integrationMode} />
            {INTEGRATION_LABEL[app.integrationMode]}
          </span>
          {app.launchable && app.status !== "available" ? (
            <StatusBadge status={app.status} />
          ) : null}
          {app.initiativeRef ? (
            <span
              className="truncate rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700"
              title="Referensi roadmap dan periode target"
            >
              {app.initiativeRef}
              {app.targetPeriod ? ` · ${app.targetPeriod}` : ""}
            </span>
          ) : null}
          <Link
            href={`/apps/${app.slug}`}
            className="relative z-10 -my-1 ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-slate-100 hover:text-ink"
            aria-label={`Detail ${app.name}`}
            title="Detail aplikasi"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {!app.launchable ? (
          <p className={`mt-2 text-xs font-medium ${accent.text}`}>
            Belum dapat dibuka — lihat detail untuk info roadmap.
          </p>
        ) : null}
      </div>
    </article>
  );
}
