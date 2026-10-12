"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, SearchX, X } from "lucide-react";
import { AUDIENCE_LABEL, ENV_LABEL, INTEGRATION_LABEL, STATUS_LABEL } from "../labels";
import { Badge, StatusBadge } from "../ui";

export interface AdminAppRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  audience: string;
  integrationMode: string;
  status: string;
  environment: string;
  initiativeRef: string | null;
  targetPeriod: string | null;
  businessOwner: string;
  applicationOwner: string;
  isDemo: boolean;
}

type Filters = { q: string; category: string; status: string; audience: string };
const EMPTY: Filters = { q: "", category: "", status: "", audience: "" };

function readUrl(): Filters {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get("q") ?? "", category: p.get("kategori") ?? "", status: p.get("status") ?? "", audience: p.get("audiens") ?? "" };
}

/** Mirrors filters into the query string (replaceState: no history spam, shareable links). */
function writeUrl(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("kategori", f.category);
  if (f.status) p.set("status", f.status);
  if (f.audience) p.set("audiens", f.audience);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

const select =
  "min-h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink shadow-card focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15";

export function AdminAppTable({ rows }: { rows: AdminAppRow[] }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const inputRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    setF(next);
    writeUrl(next);
  };

  useEffect(() => {
    // Restore from the URL after hydration so server and client render the same initial markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL.
    setF(readUrl());
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const categories = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.categoryId, r.categoryName);
    return [...m.entries()];
  }, [rows]);

  const q = f.q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!f.category || r.categoryId === f.category) &&
      (!f.status || r.status === f.status) &&
      (!f.audience || r.audience === f.audience) &&
      (!q ||
        [r.name, r.slug, r.description, r.categoryName, r.initiativeRef ?? "", r.businessOwner, r.applicationOwner].some((v) =>
          v.toLowerCase().includes(q),
        )),
  );
  const active = f.q || f.category || f.status || f.audience;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label htmlFor="cari-admin" className="sr-only">
            Cari aplikasi
          </label>
          <input
            ref={inputRef}
            id="cari-admin"
            type="search"
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            onKeyDown={(e) => e.key === "Escape" && set({ q: "" })}
            placeholder="Cari nama, slug, kode IT-xx, atau pemilik…"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-10 text-sm text-ink shadow-card outline-none placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 [&::-webkit-search-cancel-button]:hidden"
            data-testid="admin-search"
          />
          {f.q ? (
            <button
              type="button"
              onClick={() => {
                set({ q: "" });
                inputRef.current?.focus();
              }}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
              aria-label="Hapus pencarian"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-slate-50 px-2 py-0.5 font-sans text-xs text-muted sm:inline">
              /
            </kbd>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
          <select aria-label="Filter kategori" className={select} value={f.category} onChange={(e) => set({ category: e.target.value })}>
            <option value="">Semua kategori</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select aria-label="Filter status" className={select} value={f.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Semua status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select aria-label="Filter audiens" className={select} value={f.audience} onChange={(e) => set({ audience: e.target.value })}>
            <option value="">Semua audiens</option>
            {Object.entries(AUDIENCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <p aria-live="polite" data-testid="admin-result-count">
          {filtered.length === rows.length ? `${rows.length} aplikasi` : `${filtered.length} dari ${rows.length} aplikasi`}
        </p>
        {active ? (
          <button type="button" onClick={() => set(EMPTY)} className="font-medium text-brand-700 hover:underline">
            Reset filter
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center" data-testid="admin-empty">
          <SearchX className="mx-auto mb-3 h-9 w-9 text-slate-400" aria-hidden="true" />
          <p className="font-display text-base font-semibold text-ink">Tidak ada aplikasi yang cocok</p>
          <p className="mt-1 text-sm text-muted">Ubah kata kunci atau reset filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="min-w-full divide-y divide-line text-sm">
            <caption className="sr-only">Daftar entri katalog aplikasi</caption>
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Aplikasi</th>
                <th scope="col" className="px-4 py-3">Kategori</th>
                <th scope="col" className="px-4 py-3">Audiens</th>
                <th scope="col" className="px-4 py-3">Integrasi</th>
                <th scope="col" className="px-4 py-3">Roadmap</th>
                <th scope="col" className="px-4 py-3">Lingkungan</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line" data-testid="admin-app-rows">
              {filtered.map((app) => (
                <tr key={app.id} className={`transition-colors hover:bg-slate-50 ${app.status === "retired" ? "text-muted" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{app.name}</div>
                    <div className="text-xs text-muted">
                      {app.slug} {app.isDemo ? <Badge tone="warn">DEMO</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{app.categoryName}</td>
                  <td className="px-4 py-3">{AUDIENCE_LABEL[app.audience]}</td>
                  <td className="px-4 py-3">{INTEGRATION_LABEL[app.integrationMode]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {app.initiativeRef ?? "—"}
                    {app.targetPeriod ? <span className="block text-muted">{app.targetPeriod}</span> : null}
                  </td>
                  <td className="px-4 py-3">{ENV_LABEL[app.environment]}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/applications/${app.id}`} className="font-medium text-brand-700 hover:underline">
                      Ubah<span className="sr-only"> {app.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
