import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { adminGetApp, listCategories, listEntitlements, listOrganizations } from "@/lib/catalogue/service";
import { NotFoundError } from "@/lib/catalogue/errors";
import { ICON_KEYS } from "@/lib/catalogue/validation";
import { thumbnailUpdatedAt } from "@/lib/catalogue/thumbnail";
import { AppShell, PageBody } from "@/components/app-shell";
import { AppForm } from "@/components/admin/app-form";
import { EntitlementManager } from "@/components/admin/entitlements";
import { ThumbnailManager } from "@/components/admin/thumbnail-manager";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Ubah Aplikasi" };

export default async function EditApplication({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin(`/admin/applications/${id}`);
  let app;
  try {
    app = await adminGetApp({ sub: auth.principal.sub, ctx: auth.ctx }, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const [categories, ents, orgs, thumbAt] = await Promise.all([
    listCategories(),
    listEntitlements(id),
    listOrganizations(),
    thumbnailUpdatedAt(id),
  ]);
  const updated = app.updatedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });
  return (
    <AppShell auth={auth} active="admin">
      <PageBody>
      <PageHeader
        title={app.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={app.status} /> {app.isDemo ? <Badge tone="warn">DATA DEMO</Badge> : null}
            <span>
              Terakhir diubah {updated} WIB oleh <code className="text-xs">{app.updatedBy}</code>
            </span>
          </span>
        }
      />
      {sp.created ? (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Aplikasi berhasil dibuat. Tambahkan hak akses di bawah agar aplikasi tampil bagi pengguna.
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="p-5 sm:p-6">
          <AppForm
            mode="edit"
            appId={app.id}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            iconKeys={ICON_KEYS}
            initial={{
              slug: app.slug,
              name: app.name,
              description: app.description,
              iconKey: app.iconKey,
              categoryId: app.categoryId,
              targetUrl: app.targetUrl,
              audience: app.audience,
              integrationMode: app.integrationMode,
              status: app.status,
              environment: app.environment,
              applicationOwner: app.applicationOwner,
              businessOwner: app.businessOwner,
              supportContact: app.supportContact,
              displayOrder: app.displayOrder,
              featured: app.featured,
              initiativeRef: app.initiativeRef ?? "",
              targetPeriod: app.targetPeriod ?? "",
            }}
          />
        </Card>
        <div className="space-y-6">
        <Card className="h-fit p-5 sm:p-6">
          <h2 className="mb-2 font-semibold">Gambar sampul</h2>
          <ThumbnailManager appId={app.id} initialVersion={thumbAt?.getTime() ?? null} />
        </Card>
        <Card className="h-fit p-5 sm:p-6">
          <h2 className="mb-2 font-semibold">Hak akses aplikasi</h2>
          <EntitlementManager
            appId={app.id}
            audience={app.audience}
            initial={ents}
            orgs={orgs.filter((o) => o.status === "active").map((o) => ({ id: o.id, displayName: o.displayName, orgType: o.orgType }))}
          />
        </Card>
        </div>
      </div>
      </PageBody>
    </AppShell>
  );
}
