"use client";

import { CloudOff } from "lucide-react";
import { StatePanel, buttonClass } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatePanel
      icon={<CloudOff className="h-6 w-6" />}
      title="Terjadi kesalahan sistem"
      actions={
        <>
          <button type="button" onClick={reset} className={buttonClass.primary}>
            Coba lagi
          </button>
          <a href="/workspace" className={buttonClass.secondary}>
            Ke beranda
          </a>
        </>
      }
    >
      Halaman tidak dapat dimuat. Bila berlanjut, hubungi Helpdesk TI KINRA
      {error.digest ? (
        <>
          {" "}
          dengan kode referensi <code className="text-xs">{error.digest}</code>
        </>
      ) : null}
      .
    </StatePanel>
  );
}
