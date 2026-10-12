"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { buttonClass } from "./ui";

/** Explicit read confirmation. Opening the page alone never counts as having read it. */
export function AckButton({ announcementId, ackedAt }: { announcementId: string; ackedAt: string | null }) {
  const router = useRouter();
  const [done, setDone] = useState<string | null>(ackedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" data-testid="ack-done">
        <CircleCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
        Anda telah mengonfirmasi pengumuman ini pada{" "}
        {new Date(done).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })} WIB.
      </p>
    );
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/announcements/${announcementId}/ack`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(data.ackedAt);
        router.refresh();
      } else if (res.status === 401) {
        router.push("/session-expired");
      } else {
        setError(data.error?.message ?? "Konfirmasi gagal dicatat. Coba lagi.");
      }
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-950">
        Pengumuman ini meminta Anda mengonfirmasi bahwa isinya telah dibaca dan dipahami. Konfirmasi dicatat atas nama akun
        Anda beserta waktunya.
      </p>
      <button type="button" onClick={confirm} disabled={busy} className={`${buttonClass.primary} mt-3`} data-testid="ack-button">
        <CircleCheck className="h-4 w-4" aria-hidden="true" />
        {busy ? "Mencatat…" : "Saya sudah membaca dan memahami"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
