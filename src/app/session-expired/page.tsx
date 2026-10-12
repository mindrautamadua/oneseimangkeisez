import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { safeReturnPath } from "@/lib/security/url";
import { StatePanel, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Sesi Berakhir" };

export default async function SessionExpired({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeReturnPath((await searchParams).next);
  return (
    <StatePanel
      icon={<Clock className="h-6 w-6" />}
      title="Sesi Anda telah berakhir"
      actions={
        <a href={`/login?next=${encodeURIComponent(next)}`} className={buttonClass.primary} data-testid="relogin">
          Masuk kembali
        </a>
      }
    >
      Demi keamanan, sesi berakhir setelah jangka waktu tertentu. Silakan masuk kembali untuk melanjutkan.
    </StatePanel>
  );
}
