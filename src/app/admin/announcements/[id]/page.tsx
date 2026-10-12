import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { adminGetAnnouncement, adminListTargetOrgs } from "@/lib/announcements/service";
import { NotFoundError } from "@/lib/catalogue/errors";
import { ROLES } from "@/lib/authz/types";
import { AppShell, PageBody } from "@/components/app-shell";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { toWibInput } from "@/components/admin/content-tabs";
import { ANNOUNCEMENT_STATE_LABEL, formatWib } from "@/components/labels";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Ubah Pengumuman" };

export default async function EditAnnouncement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const created = (await searchParams).created === "1";
  const auth = await requireAdmin(`/admin/announcements/${id}`);
  const actor = { sub: auth.principal.sub, ctx: auth.ctx };
  const data = await adminGetAnnouncement(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const orgs = await adminListTargetOrgs(actor);
  const a = data.announcement;
  const currentAcks = data.acks.filter((k) => k.version === a.version);

  return (
    <AppShell auth={auth} active="content">
      <PageBody>
        <Link href="/admin/announcements" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Daftar pengumuman
        </Link>
        <PageHeader
          eyebrow="Konten portal"
          title={a.title}
          description={
            <>
              Status: <strong data-testid="announcement-state">{ANNOUNCEMENT_STATE_LABEL[data.state]}</strong> · versi {a.version} · diperbarui{" "}
              {formatWib(a.updatedAt)} WIB
              {a.withdrawnAt ? <> · ditarik {formatWib(a.withdrawnAt)} WIB</> : null}
            </>
          }
        />
        {created ? (
          <p role="status" className="mb-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Draf tersimpan. Tinjau dengan Pratinjau, lalu terbitkan.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <AnnouncementForm
              key={`${a.status}-${a.version}-${a.updatedAt.getTime()}`}
              mode="edit"
              id={a.id}
              state={data.state}
              orgs={orgs}
              roles={Object.values(ROLES)}
              initial={{
                title: a.title,
                summary: a.summary,
                body: a.body,
                category: a.category,
                priority: a.priority,
                audience: a.audience,
                publisher: a.publisher,
                publishAt: toWibInput(a.publishAt),
                expiresAt: toWibInput(a.expiresAt),
                requiresAck: a.requiresAck,
                targetOrganizationIds: data.targetOrganizationIds,
                targetRoleKeys: data.targetRoleKeys,
              }}
            />
          </div>
          <aside aria-labelledby="konfirmasi">
            <Card className="p-4">
              <h2 id="konfirmasi" className="text-sm font-semibold text-ink">
                Konfirmasi baca
              </h2>
              {!a.requiresAck ? (
                <p className="mt-2 text-sm text-muted">Pengumuman ini tidak mewajibkan konfirmasi.</p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-muted">
                    {currentAcks.length} pengguna telah mengonfirmasi versi {a.version}. Perubahan isi setelah terbit membuat versi baru
                    dan meminta konfirmasi ulang.
                  </p>
                  {data.acks.length ? (
                    <ul className="mt-3 max-h-96 divide-y divide-line overflow-y-auto text-sm">
                      {data.acks.map((k) => (
                        <li key={`${k.subject}-${k.version}`} className="py-2">
                          <span className="block font-medium text-ink">{k.subjectName}</span>
                          <span className="block text-xs text-muted">
                            {k.orgName} · v{k.version} · {formatWib(k.ackedAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </Card>
          </aside>
        </div>
      </PageBody>
    </AppShell>
  );
}
