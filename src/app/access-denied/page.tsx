import type { Metadata } from "next";
import { ShieldX } from "lucide-react";
import { StatePanel, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Akses Ditolak" };

export default function AccessDenied() {
  return (
    <StatePanel
      icon={<ShieldX className="h-6 w-6" />}
      title="Akses ditolak"
      actions={
        <a href="/workspace" className={buttonClass.primary}>
          Kembali ke beranda
        </a>
      }
    >
      Aplikasi atau halaman ini tidak tersedia, atau Anda tidak memiliki hak akses dalam organisasi yang sedang aktif.
      Jika Anda membutuhkan akses, ajukan melalui administrator organisasi Anda atau Helpdesk TI KINRA.
    </StatePanel>
  );
}
