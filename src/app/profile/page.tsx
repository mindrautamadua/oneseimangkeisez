import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/current";
import { AppShell, PageBody } from "@/components/app-shell";
import { Card, PageHeader } from "@/components/ui";
import { InstallButton, InstallStatus } from "@/components/pwa/install-button";
import { APP_VERSION, BUILD_ID } from "@/lib/version";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const auth = await requireAuth("/profile");
  const p = auth.principal;
  const expires = new Date(auth.expiresAt * 1000).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });
  return (
    <AppShell auth={auth} active="profile">
      <PageBody>
      <PageHeader
        eyebrow="Akun"
        title="Profil"
        description="Data berikut berasal dari identity provider dan bersifat hanya-baca. Perubahan keanggotaan organisasi atau peran dilakukan melalui proses tata kelola akses."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Akun</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Nama tampilan">{p.name}</Row>
            <Row label="Email">{p.email ?? "—"}</Row>
            <Row label="ID pengguna">
              <code className="break-all text-xs">{p.sub}</code>
            </Row>
            <Row label="Metode autentikasi">{p.authProvider === "mock" ? "Mock (pengembangan lokal)" : p.authProvider === "kinra_iam" ? "KINRA IAM" : "OpenID Connect"}</Row>
            <Row label="Sesi berakhir">{expires} WIB</Row>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Organisasi & peran</h2>
          {auth.orgs.length === 0 ? (
            <p className="text-sm text-muted">Belum ada organisasi aktif yang terhubung dengan akun Anda.</p>
          ) : (
            <ul className="space-y-3">
              {auth.orgs.map((o) => {
                const m = p.memberships.find((x) => x.orgId === o.externalOrgId);
                const active = auth.ctx?.org.externalOrgId === o.externalOrgId;
                return (
                  <li key={o.id} className={`rounded-xl border p-4 ${active ? "border-brand-500/40 bg-brand-50" : "border-line"}`}>
                    <p className="text-sm font-semibold">
                      {o.displayName} {active ? <span className="ml-1 text-xs font-medium text-brand-700">(aktif)</span> : null}
                    </p>
                    <p className="text-xs text-muted">{o.orgType === "kinra" ? "Internal KINRA" : "Tenant"}</p>
                    <p className="mt-2 flex flex-wrap gap-1">
                      {(m?.roles ?? []).map((r) => (
                        <span key={r} className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-line">
                          {r}
                        </span>
                      ))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      <Card className="mt-4 p-5">
        <h2 className="mb-2 text-lg font-semibold">Aplikasi OneSeiMangkeiSEZ</h2>
        <p className="text-sm text-muted">
          Pasang OneSeiMangkeiSEZ agar dapat dibuka seperti aplikasi dari layar utama atau menu Start. Aplikasi terpasang
          memeriksa versi baru secara otomatis dan memperbarui dirinya sendiri.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <InstallButton variant="panel" />
          <InstallStatus />
        </div>
        <p className="mt-4 text-xs text-muted">
          Versi {APP_VERSION} · build <code>{BUILD_ID}</code>
        </p>
      </Card>
      </PageBody>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="col-span-2 break-words">{children}</dd>
    </div>
  );
}
