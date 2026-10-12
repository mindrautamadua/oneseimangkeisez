import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { adminListApps } from "@/lib/catalogue/service";
import { AppShell, PageBody } from "@/components/app-shell";
import { AdminAppTable } from "@/components/admin/app-table";
import { PageHeader, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Admin Katalog" };

export default async function AdminApplications() {
  const auth = await requireAdmin("/admin/applications");
  const rows = await adminListApps({ sub: auth.principal.sub, ctx: auth.ctx });
  return (
    <AppShell auth={auth} active="admin">
      <PageBody>
      <PageHeader
        title="Katalog Aplikasi"
        description="Kelola metadata, status publikasi, dan hak akses aplikasi. Semua perubahan tercatat di jejak audit."
        actions={
          <Link href="/admin/applications/new" className={buttonClass.primary}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah aplikasi
          </Link>
        }
      />
      <AdminAppTable
        rows={rows.map(({ app, category }) => ({
          id: app.id,
          slug: app.slug,
          name: app.name,
          description: app.description,
          categoryId: category.id,
          categoryName: category.name,
          audience: app.audience,
          integrationMode: app.integrationMode,
          status: app.status,
          environment: app.environment,
          initiativeRef: app.initiativeRef,
          targetPeriod: app.targetPeriod,
          businessOwner: app.businessOwner,
          applicationOwner: app.applicationOwner,
          isDemo: app.isDemo,
        }))}
      />
      </PageBody>
    </AppShell>
  );
}
