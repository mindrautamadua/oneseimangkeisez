import type { Metadata } from "next";
import { CloudOff } from "lucide-react";
import { StatePanel, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Terjadi Kendala" };

const MESSAGES: Record<string, string> = {
  rate_limited: "Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.",
};

export default async function ErrorPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const code = (await searchParams).code;
  return (
    <StatePanel
      icon={<CloudOff className="h-6 w-6" />}
      title="Layanan sedang mengalami kendala"
      actions={
        <a href="/workspace" className={buttonClass.primary}>
          Kembali ke beranda
        </a>
      }
    >
      {(code && MESSAGES[code]) ?? "Permintaan tidak dapat diproses saat ini."} Jika masalah berlanjut, hubungi Helpdesk TI KINRA.
    </StatePanel>
  );
}
