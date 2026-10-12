import Link from "next/link";
import type { ReactNode } from "react";
import { Building2, FlaskConical, LogOut } from "lucide-react";
import type { AuthState } from "@/lib/auth/current";
import { canReadAudit, isPortalAdmin } from "@/lib/authz/policy";
import { mockAuthActive } from "@/lib/env";
import { APP_VERSION, BUILD_ID } from "@/lib/version";
import { InstallButton } from "./pwa/install-button";
import { KinraLogo, Wordmark } from "./wordmark";

type Ok = Extract<AuthState, { status: "ok" }>;

function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ auth, children, active }: { auth: Ok; children: ReactNode; active?: string }) {
  const ctx = auth.ctx;
  const tenant = ctx?.org.orgType === "tenant";
  const admin = isPortalAdmin(ctx);
  const auditor = canReadAudit(ctx);
  const nav = [
    { href: "/workspace", label: "Beranda", key: "workspace" },
    ...(ctx
      ? [
          { href: "/announcements", label: "Pengumuman", key: "announcements" },
          { href: "/news", label: "Berita", key: "news" },
        ]
      : []),
    ...(admin ? [{ href: "/admin/applications", label: "Katalog", key: "admin" }] : []),
    ...(admin ? [{ href: "/admin/announcements", label: "Konten", key: "content" }] : []),
    ...(auditor ? [{ href: "/admin/access", label: "Akses", key: "access" }] : []),
    ...(auditor ? [{ href: "/admin/audit", label: "Audit", key: "audit" }] : []),
  ];
  const bar = tenant ? "bg-tenant-900" : "bg-navy-900";

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-lift"
      >
        Lewati ke konten utama
      </a>
      {mockAuthActive() ? (
        <div role="note" className="flex items-center justify-center gap-2 bg-navy-950 px-4 py-1.5 text-center text-xs text-amber-300">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Mode mock</strong> — autentikasi tiruan untuk pengembangan lokal, bukan autentikasi produksi.
          </span>
        </div>
      ) : null}
      <header className={`sticky top-0 z-30 ${bar} text-white shadow-sm`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link
            href="/workspace"
            className="flex h-10 shrink-0 items-center rounded-lg bg-white px-2.5 ring-1 ring-inset ring-white/20"
            aria-label="OneSeiMangkeiSEZ — beranda"
          >
            <KinraLogo className="h-7 w-auto" />
          </Link>
          {ctx ? (
            <span
              className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider sm:inline ${tenant ? "bg-tenant-600/40 text-tenant-100" : "bg-white/10 text-sky-200"}`}
              data-testid="workspace-badge"
            >
              {tenant ? "Workspace Tenant" : "Workspace Internal KINRA"}
            </span>
          ) : null}
          {nav.length > 1 ? (
          <nav aria-label="Navigasi utama" className="hidden lg:block">
            <ul className="flex items-center gap-1 text-sm">
              {nav.map((n) => (
                <li key={n.key}>
                  <Link
                    href={n.href}
                    aria-current={active === n.key ? "page" : undefined}
                    className={`rounded-lg px-3 py-2 font-medium transition-colors duration-200 ${active === n.key ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          ) : null}
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <InstallButton />
            <OrgSwitcher auth={auth} />
            <Link
              href="/profile"
              aria-current={active === "profile" ? "page" : undefined}
              className="flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors duration-200 hover:bg-white/10 lg:pr-3"
              title="Profil"
            >
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tenant ? "bg-tenant-200 text-tenant-900" : "bg-sky-200 text-navy-900"}`}
              >
                {initials(auth.principal.name)}
              </span>
              <span className="hidden max-w-[10rem] truncate text-sm font-medium lg:inline" data-testid="user-name">
                {auth.principal.name}
              </span>
              <span className="sr-only lg:hidden">Profil {auth.principal.name}</span>
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Keluar</span>
                <span className="sr-only sm:hidden">Keluar</span>
              </button>
            </form>
          </div>
        </div>
        {nav.length > 1 ? (
          <nav aria-label="Navigasi utama (seluler)" className="border-t border-white/10 lg:hidden">
            <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 text-sm">
              {nav.map((n) => (
                <li key={n.key}>
                  <Link
                    href={n.href}
                    aria-current={active === n.key ? "page" : undefined}
                    className={`block whitespace-nowrap rounded-lg px-3 py-2 font-medium ${active === n.key ? "bg-white/15 text-white" : "text-slate-300"}`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <main id="konten" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            <Wordmark className="text-sm" /> · PT Kawasan Industri Nusantara
          </span>
          <span>
            One Gateway. One Identity. Connected Services. · Bantuan: Helpdesk TI KINRA ·{" "}
            <span data-testid="app-version" title={`Build ${BUILD_ID}`}>
              v{APP_VERSION}
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** Standard page container used by every page inside the shell. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>;
}

function OrgSwitcher({ auth }: { auth: Ok }) {
  const ctx = auth.ctx;
  if (!ctx) return null;
  if (auth.orgs.length <= 1) {
    return (
      <span className="hidden min-w-0 items-center gap-1.5 text-sm text-slate-300 lg:inline-flex" data-testid="active-org" title={ctx.org.displayName}>
        <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="max-w-[14rem] truncate">{ctx.org.displayName}</span>
      </span>
    );
  }
  return (
    <form action="/api/context" method="post" className="flex min-w-0 items-center gap-1">
      <label htmlFor="org-switch" className="sr-only">
        Organisasi aktif
      </label>
      <select
        id="org-switch"
        name="orgId"
        defaultValue={ctx.org.externalOrgId}
        className="h-9 min-w-0 max-w-[9rem] truncate rounded-lg border border-white/20 bg-white/10 px-2 text-sm text-white sm:max-w-[14rem] [&>option]:text-ink"
        data-testid="org-switch"
      >
        {auth.orgs.map((o) => (
          <option key={o.externalOrgId} value={o.externalOrgId}>
            {o.displayName}
          </option>
        ))}
      </select>
      <button type="submit" className="h-9 rounded-lg bg-white/15 px-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/25">
        Ganti
      </button>
    </form>
  );
}
