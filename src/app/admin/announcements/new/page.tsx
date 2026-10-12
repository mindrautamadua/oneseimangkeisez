import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { adminListTargetOrgs } from "@/lib/announcements/service";
import { ROLES } from "@/lib/authz/types";
import { AppShell, PageBody } from "@/components/app-shell";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Buat Pengumuman" };

export default async function NewAnnouncement() {
  const auth = await requireAdmin("/admin/announcements/new");
  const orgs = await adminListTargetOrgs({ sub: auth.principal.sub, ctx: auth.ctx });
  return (
    <AppShell auth={auth} active="content">
      <PageBody>
        <PageHeader eyebrow="Konten portal" title="Buat pengumuman" description="Pengumuman disimpan sebagai draf. Terbitkan setelah ditinjau." />
        <AnnouncementForm
          mode="create"
          orgs={orgs}
          roles={Object.values(ROLES)}
          initial={{
            title: "",
            summary: "",
            body: "",
            category: "general",
            priority: "normal",
            audience: "internal",
            publisher: "",
            publishAt: "",
            expiresAt: "",
            requiresAck: false,
            targetOrganizationIds: [],
            targetRoleKeys: [],
          }}
        />
      </PageBody>
    </AppShell>
  );
}
