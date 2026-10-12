import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { requireAuth } from "@/lib/auth/current";
import { getAuthorizedApp } from "@/lib/catalogue/service";
import { AppShell, PageBody } from "@/components/app-shell";
import { AppCover } from "@/components/app-cover";
import { AppIcon } from "@/components/app-icon";
import { AUDIENCE_LABEL, INTEGRATION_HELP, INTEGRATION_LABEL, STATUS_LABEL } from "@/components/labels";
import { Badge, Card, StatusBadge, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Detail Aplikasi" };

const UNAVAILABLE: Record<string, string> = {
  not_launchable: "Aplikasi ini belum dapat dibuka karena statusnya",
  invalid_url: "Alamat aplikasi tidak lolos validasi keamanan saat ini. Hubungi dukungan aplikasi.",
};

export default async function AppDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const auth = await requireAuth(`/apps/${slug}`);
  const app = await getAuthorizedApp(auth.ctx, slug);
  // Unknown and unauthorized apps are indistinguishable: no restricted metadata leaks (AT-04).
  if (!app) notFound();
  const tenant = auth.ctx?.org.orgType === "tenant";
  const reason = sp.unavailable ? UNAVAILABLE[sp.unavailable] : null;

  return (
    <AppShell auth={auth} active="workspace">
      <PageBody>
      <Link href="/workspace" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke beranda
      </Link>
      {reason ? (
        <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" data-testid="unavailable-alert">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            {reason}
            {sp.unavailable === "not_launchable" ? ` “${STATUS_LABEL[app.status]}”.` : ""} Butuh bantuan? {app.supportContact}
          </p>
        </div>
      ) : null}
      <Card className="overflow-hidden">
        <AppCover app={app} variant="hero" />
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className={`relative -mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lift ring-4 ring-white sm:-mt-12 ${tenant ? "text-tenant-700" : "text-brand-700"}`}
          >
            <AppIcon iconKey={app.iconKey} className="h-9 w-9" />
          </span>
          <div className="min-w-0 flex-1 sm:pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{app.name}</h1>
              <StatusBadge status={app.status} />
              {app.isDemo ? <Badge tone="warn">DATA DEMO</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted">{app.category.name}</p>
            <p className="mt-3 text-sm leading-6">{app.description}</p>
          </div>
          <div className="sm:w-48 sm:pt-4">
            {app.launchable ? (
              <a href={`/launch/${app.slug}`} target="_blank" rel="noopener noreferrer" className={`${buttonClass.primary} w-full`}>
                Buka aplikasi <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(tab baru)</span>
              </a>
            ) : (
              <span className="inline-flex w-full justify-center rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
                Belum dapat dibuka
              </span>
            )}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <Item label="Cara masuk">
            <span className="font-medium">{INTEGRATION_LABEL[app.integrationMode]}</span>
            <span className="mt-0.5 block text-muted">{INTEGRATION_HELP[app.integrationMode]}</span>
          </Item>
          <Item label="Ditujukan untuk">{AUDIENCE_LABEL[app.audience]}</Item>
          {app.initiativeRef || app.targetPeriod ? (
            <Item label="Roadmap">
              {app.initiativeRef ?? "—"}
              {app.targetPeriod ? ` · target ${app.targetPeriod}` : ""}
              {app.isDemo ? <span className="mt-0.5 block text-muted">Sumber: draf RSTI PT KINRA 2026–2030 (simulasi end state).</span> : null}
            </Item>
          ) : null}
          <Item label="Pemilik bisnis / layanan">{app.businessOwner}</Item>
          <Item label="Pemilik aplikasi">{app.applicationOwner}</Item>
          <Item label="Dukungan">{app.supportContact}</Item>
          <Item label="Status kesehatan">
            <span className="text-muted">Tidak dipantau — belum ada sumber status yang andal.</span>
          </Item>
        </dl>
        </div>
      </Card>
      </PageBody>
    </AppShell>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words">{children}</dd>
    </div>
  );
}
