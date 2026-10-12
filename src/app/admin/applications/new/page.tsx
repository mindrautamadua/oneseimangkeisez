import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { listCategories } from "@/lib/catalogue/service";
import { ICON_KEYS } from "@/lib/catalogue/validation";
import { env } from "@/lib/env";
import { AppShell, PageBody } from "@/components/app-shell";
import { AppForm } from "@/components/admin/app-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Tambah Aplikasi" };

export default async function NewApplication() {
  const auth = await requireAdmin("/admin/applications/new");
  const categories = await listCategories();
  return (
    <AppShell auth={auth} active="admin">
      <PageBody>
      <PageHeader
        title="Tambah aplikasi"
        description="Entri baru berstatus “Direncanakan” secara bawaan. Setelah disimpan, tambahkan hak akses agar dapat dilihat pengguna."
      />
      <Card className="p-5 sm:p-6">
        <AppForm
          mode="create"
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          iconKeys={ICON_KEYS}
          initial={{
            slug: "",
            name: "",
            description: "",
            iconKey: "app-window",
            categoryId: "",
            targetUrl: "https://",
            audience: "internal",
            integrationMode: "authenticated_link",
            status: "planned",
            environment: env().APP_ENV,
            applicationOwner: "",
            businessOwner: "",
            supportContact: "",
            displayOrder: 100,
            featured: false,
            initiativeRef: "",
            targetPeriod: "",
          }}
        />
      </Card>
      </PageBody>
    </AppShell>
  );
}
