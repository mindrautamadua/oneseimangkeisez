"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { buttonClass } from "../ui";

const MAX_BYTES = 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";

/**
 * Uploads take effect immediately (separate from the main form) and are audited server-side.
 * The server re-validates size and detects the real type from the bytes.
 */
export function ThumbnailManager({ appId, initialVersion }: { appId: string; initialVersion: number | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState(initialVersion);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function upload(file: File) {
    setMsg(null);
    if (!ACCEPT.split(",").includes(file.type)) return setMsg({ kind: "err", text: "Format harus PNG, JPEG, atau WebP." });
    if (file.size > MAX_BYTES) return setMsg({ kind: "err", text: "Ukuran gambar maksimal 1 MB." });
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/thumbnail`, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setVersion(Date.parse(data.thumbnail.updatedAt));
        setMsg({ kind: "ok", text: "Gambar sampul tersimpan." });
        router.refresh();
      } else if (res.status === 401) {
        router.push("/session-expired");
      } else {
        setMsg({ kind: "err", text: data.error?.fields?.thumbnail ?? data.error?.message ?? "Gagal mengunggah gambar." });
      }
    } catch {
      setMsg({ kind: "err", text: "Tidak dapat menghubungi server. Periksa koneksi Anda." });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/applications/${appId}/thumbnail`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setVersion(null);
      setMsg({ kind: "ok", text: "Gambar sampul dihapus. Kartu kembali memakai sampul otomatis." });
      router.refresh();
    } else {
      setMsg({ kind: "err", text: "Gagal menghapus gambar." });
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/6] overflow-hidden rounded-xl border border-line bg-slate-50">
        {version ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated API image; next/image optimizer would not forward the session.
          <img
            src={`/api/admin/applications/${appId}/thumbnail?v=${version}`}
            alt="Pratinjau gambar sampul"
            className="h-full w-full object-cover"
            data-testid="thumbnail-preview"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted">
            <ImageIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
            Belum ada gambar — kartu memakai sampul otomatis per kategori.
          </div>
        )}
      </div>
      <p className="text-xs text-muted">PNG, JPEG, atau WebP, maks. 1 MB. Rasio ideal ±16:6 (mis. 1200×450 px).</p>
      {msg ? (
        <p
          role={msg.kind === "err" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}
        >
          {msg.text}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          id="thumbnail-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
          data-testid="thumbnail-input"
        />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={buttonClass.secondary}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {busy ? "Memproses…" : version ? "Ganti gambar" : "Unggah gambar"}
        </button>
        {version ? (
          <button type="button" disabled={busy} onClick={remove} className={`${buttonClass.ghost} text-rose-700`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Hapus
          </button>
        ) : null}
      </div>
    </div>
  );
}
