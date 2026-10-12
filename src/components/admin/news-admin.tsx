"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { buttonClass } from "../ui";

export function SyncNewsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/news/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const results = data.results as Array<{ ok: boolean; accepted: number }>;
        const failed = results.filter((r) => !r.ok).length;
        const accepted = results.reduce((n, r) => n + r.accepted, 0);
        setMessage({
          kind: failed ? "err" : "ok",
          text: `${accepted} berita diperbarui dari ${results.length - failed} sumber${failed ? `; ${failed} sumber gagal (lihat tabel)` : ""}.`,
        });
        router.refresh();
      } else if (res.status === 401) {
        router.push("/session-expired");
      } else {
        setMessage({ kind: "err", text: data.error?.fields?._ ?? data.error?.message ?? "Sinkronisasi gagal." });
      }
    } catch {
      setMessage({ kind: "err", text: "Tidak dapat menghubungi server. Periksa koneksi Anda." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button type="button" onClick={sync} disabled={busy} className={buttonClass.primary} data-testid="sync-news">
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
        {busy ? "Menyinkronkan…" : "Sinkronkan sekarang"}
      </button>
      {message ? (
        <p role={message.kind === "err" ? "alert" : "status"} className={`text-sm ${message.kind === "ok" ? "text-emerald-800" : "text-rose-800"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

export function HideNewsToggle({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/admin/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !hidden }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`${buttonClass.ghost} min-h-9 px-2.5 ${error ? "text-rose-700" : ""}`}
      aria-label={hidden ? "Tampilkan kembali berita ini" : "Sembunyikan berita ini"}
    >
      {hidden ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
      <span className="hidden sm:inline">{error ? "Gagal, coba lagi" : hidden ? "Tampilkan" : "Sembunyikan"}</span>
    </button>
  );
}
