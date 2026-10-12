import { SearchX } from "lucide-react";
import { StatePanel, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <StatePanel
      icon={<SearchX className="h-6 w-6" />}
      title="Halaman tidak ditemukan"
      actions={
        <a href="/workspace" className={buttonClass.primary}>
          Kembali ke beranda
        </a>
      }
    >
      Halaman tidak tersedia atau Anda tidak memiliki akses ke halaman ini.
    </StatePanel>
  );
}
