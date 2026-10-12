import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth/current";
import { getVisibleAnnouncement } from "@/lib/announcements/service";
import { AppShell, PageBody } from "@/components/app-shell";
import { AckButton } from "@/components/ack-button";
import { PriorityBadge } from "@/components/announcements";
import { ANNOUNCEMENT_CATEGORY_LABEL, formatWib } from "@/components/labels";
import { Badge, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Pengumuman" };

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth(`/announcements/${id}`);
  const a = await getVisibleAnnouncement({ sub: auth.principal.sub, name: auth.principal.name, ctx: auth.ctx }, id);
  // Missing, expired, draft and not-targeted announcements are indistinguishable.
  if (!a) notFound();

  return (
    <AppShell auth={auth} active="announcements">
      <PageBody>
        <Link href="/announcements" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua pengumuman
        </Link>
        <Card className="mx-auto max-w-3xl p-5 sm:p-8">
          <article aria-labelledby="judul">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={a.priority} />
              <Badge>{ANNOUNCEMENT_CATEGORY_LABEL[a.category] ?? a.category}</Badge>
              {a.isDemo ? <Badge tone="warn">Contoh demo — bukan pengumuman resmi</Badge> : null}
            </div>
            <h1 id="judul" className="text-2xl font-semibold text-ink sm:text-[1.75rem]">
              {a.title}
            </h1>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
              <div>
                <dt className="inline">Penerbit: </dt>
                <dd className="inline font-medium text-ink">{a.publisher}</dd>
              </div>
              <div>
                <dt className="inline">Tayang: </dt>
                <dd className="inline">
                  <time dateTime={a.publishAt.toISOString()}>{formatWib(a.publishAt)} WIB</time>
                </dd>
              </div>
              {a.expiresAt ? (
                <div>
                  <dt className="inline">Berlaku s.d.: </dt>
                  <dd className="inline">
                    <time dateTime={a.expiresAt.toISOString()}>{formatWib(a.expiresAt)} WIB</time>
                  </dd>
                </div>
              ) : null}
              {a.revised ? (
                <div>
                  <dt className="inline">Diperbarui: </dt>
                  <dd className="inline">{formatWib(a.updatedAt)} WIB</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-5 border-l-4 border-line pl-4 text-base font-medium text-ink">{a.summary}</p>
            {/* Plain text only; React escapes it. Line breaks are preserved. */}
            <div className="mt-5 whitespace-pre-line text-[0.95rem] leading-7 text-ink" data-testid="announcement-body">
              {a.body}
            </div>
            {a.requiresAck ? (
              <div className="mt-8">
                <AckButton announcementId={a.id} ackedAt={a.ackedAt ? a.ackedAt.toISOString() : null} />
              </div>
            ) : null}
          </article>
        </Card>
      </PageBody>
    </AppShell>
  );
}
