"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Send, Undo2 } from "lucide-react";
import { ANNOUNCEMENT_CATEGORY_LABEL, ANNOUNCEMENT_STATE_LABEL, AUDIENCE_LABEL, PRIORITY_LABEL } from "../labels";
import { buttonClass } from "../ui";

export interface AnnouncementFormValues {
  title: string;
  summary: string;
  body: string;
  category: string;
  priority: string;
  audience: string;
  publisher: string;
  /** datetime-local value in WIB, or "" */
  publishAt: string;
  expiresAt: string;
  requiresAck: boolean;
  targetOrganizationIds: string[];
  targetRoleKeys: string[];
}

interface Props {
  mode: "create" | "edit";
  id?: string;
  state?: string;
  initial: AnnouncementFormValues;
  orgs: Array<{ id: string; displayName: string; orgType: "kinra" | "tenant"; status: string }>;
  roles: readonly string[];
}

const input =
  "mt-1.5 min-h-10 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card transition-shadow focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:ring-rose-500/15";

const TENANT_ROLES = new Set(["tenant_admin", "tenant_user"]);

export function AnnouncementForm({ mode, id, state, initial, orgs, roles }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | "withdraw" | null>(null);
  const [preview, setPreview] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const set = <K extends keyof AnnouncementFormValues>(k: K, v: AnnouncementFormValues[K]) => setValues((s) => ({ ...s, [k]: v }));
  const toggle = (k: "targetOrganizationIds" | "targetRoleKeys", v: string) =>
    setValues((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));

  const orgFits = (t: "kinra" | "tenant") => values.audience === "both" || (values.audience === "internal" ? t === "kinra" : t === "tenant");
  const roleFits = (r: string) => values.audience === "both" || (values.audience === "tenant" ? TENANT_ROLES.has(r) : !TENANT_ROLES.has(r));

  function payload() {
    return {
      ...values,
      publishAt: values.publishAt || null,
      expiresAt: values.expiresAt || null,
      // Drop selections that no longer fit after an audience change.
      targetOrganizationIds: values.targetOrganizationIds.filter((o) => orgFits(orgs.find((x) => x.id === o)?.orgType ?? "kinra")),
      targetRoleKeys: values.targetRoleKeys.filter(roleFits),
    };
  }

  async function call(url: string, method: string, body: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) router.push("/session-expired");
    return { res, data };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrors({});
    try {
      const { res, data } = await call(mode === "create" ? "/api/admin/announcements" : `/api/admin/announcements/${id}`, mode === "create" ? "POST" : "PATCH", payload());
      if (res.ok) {
        setSaved(values);
        if (mode === "create") router.push(`/admin/announcements/${data.announcement.id}?created=1`);
        else {
          setMessage({ kind: "ok", text: "Perubahan tersimpan dan tercatat di jejak audit." });
          router.refresh();
        }
      } else if (res.status === 422) {
        setErrors(data.error?.fields ?? {});
        setMessage({ kind: "err", text: data.error?.fields?._ ?? data.error?.message ?? "Validasi gagal." });
      } else if (res.status !== 401) {
        setMessage({ kind: "err", text: data.error?.message ?? "Gagal menyimpan." });
      }
    } catch {
      setMessage({ kind: "err", text: "Tidak dapat menghubungi server. Periksa koneksi Anda." });
    } finally {
      setBusy(false);
    }
  }

  async function act(kind: "publish" | "withdraw") {
    setBusy(true);
    setMessage(null);
    try {
      const { res, data } = await call(`/api/admin/announcements/${id}/${kind}`, "POST", { confirm: true });
      setConfirm(null);
      if (res.ok) {
        setMessage({
          kind: "ok",
          text: kind === "withdraw" ? "Pengumuman ditarik dan tidak lagi tampil bagi pengguna." : "Pengumuman diterbitkan sesuai waktu tayang.",
        });
        router.refresh();
      } else if (res.status !== 401) {
        setMessage({ kind: "err", text: data.error?.fields ? Object.values(data.error.fields).join(" ") : data.error?.message ?? "Tindakan gagal." });
      }
    } catch {
      setMessage({ kind: "err", text: "Tidak dapat menghubungi server. Periksa koneksi Anda." });
    } finally {
      setBusy(false);
    }
  }

  const a11y = (name: keyof AnnouncementFormValues) => ({
    id: `f-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `e-${name}` : undefined,
  });
  const options = (rec: Record<string, string>) =>
    Object.entries(rec).map(([k, v]) => (
      <option key={k} value={k}>
        {v}
      </option>
    ));

  return (
    <form onSubmit={save} noValidate className="space-y-6" data-unsaved={dirty ? "true" : undefined}>
      {message ? (
        <p
          role={message.kind === "err" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${message.kind === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}
          data-testid="form-message"
        >
          {message.text}
        </p>
      ) : null}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-base font-semibold text-ink">Isi pengumuman</legend>
        <Field name="title" label="Judul" error={errors.title} wide>
          <input {...a11y("title")} className={input} value={values.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />
        </Field>
        <Field name="summary" label="Ringkasan" hint="Tampil di beranda. Maksimal 300 karakter." error={errors.summary} wide>
          <textarea {...a11y("summary")} className={input} rows={2} maxLength={300} value={values.summary} onChange={(e) => set("summary", e.target.value)} />
        </Field>
        <Field name="body" label="Isi lengkap" hint="Teks biasa. Baris baru dipertahankan; HTML tidak dirender." error={errors.body} wide>
          <textarea {...a11y("body")} className={input} rows={9} maxLength={10000} value={values.body} onChange={(e) => set("body", e.target.value)} />
        </Field>
        <Field name="category" label="Kategori" error={errors.category}>
          <select {...a11y("category")} className={input} value={values.category} onChange={(e) => set("category", e.target.value)}>
            {options(ANNOUNCEMENT_CATEGORY_LABEL)}
          </select>
        </Field>
        <Field name="priority" label="Prioritas" hint="Kritis dan Penting tampil paling atas di beranda." error={errors.priority}>
          <select {...a11y("priority")} className={input} value={values.priority} onChange={(e) => set("priority", e.target.value)}>
            {options(PRIORITY_LABEL)}
          </select>
        </Field>
        <Field name="publisher" label="Penerbit" hint="Unit penerbit, mis. Sekretariat Perusahaan." error={errors.publisher}>
          <input {...a11y("publisher")} className={input} value={values.publisher} onChange={(e) => set("publisher", e.target.value)} maxLength={120} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input type="checkbox" checked={values.requiresAck} onChange={(e) => set("requiresAck", e.target.checked)} className="h-4 w-4" />
          Wajib konfirmasi baca
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-base font-semibold text-ink">Periode tayang (WIB)</legend>
        <Field name="publishAt" label="Mulai tayang" hint="Kosong = saat diterbitkan. Waktu mendatang = terjadwal." error={errors.publishAt}>
          <input {...a11y("publishAt")} type="datetime-local" className={input} value={values.publishAt} onChange={(e) => set("publishAt", e.target.value)} />
        </Field>
        <Field name="expiresAt" label="Berakhir" hint="Kosong = tayang sampai ditarik." error={errors.expiresAt}>
          <input {...a11y("expiresAt")} type="datetime-local" className={input} value={values.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 font-display text-base font-semibold text-ink">Target audiens</legend>
        <Field name="audience" label="Audiens" error={errors.audience}>
          <select {...a11y("audience")} className={`${input} sm:max-w-xs`} value={values.audience} onChange={(e) => set("audience", e.target.value)}>
            {options(AUDIENCE_LABEL)}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckGroup
            legend="Batasi ke organisasi (opsional)"
            error={errors.targetOrganizationIds}
            items={orgs.filter((o) => orgFits(o.orgType)).map((o) => ({ value: o.id, label: `${o.displayName}${o.status !== "active" ? " (nonaktif)" : ""}` }))}
            selected={values.targetOrganizationIds}
            onToggle={(v) => toggle("targetOrganizationIds", v)}
          />
          <CheckGroup
            legend="Batasi ke peran (opsional)"
            error={errors.targetRoleKeys}
            items={roles.filter(roleFits).map((r) => ({ value: r, label: r }))}
            selected={values.targetRoleKeys}
            onToggle={(v) => toggle("targetRoleKeys", v)}
          />
        </div>
        <p className="text-xs text-muted">
          Tanpa batasan: tampil untuk seluruh audiens. Bila organisasi dan peran sama-sama dipilih, pembaca harus berada di salah
          satu organisasi tersebut <em>dan</em> memegang salah satu peran tersebut. Penyaringan dilakukan di server.
        </p>
      </fieldset>

      {preview ? (
        <section aria-label="Pratinjau" className="rounded-2xl border border-dashed border-brand-500 bg-white p-5" data-testid="preview">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-700">Pratinjau tampilan pembaca</p>
          <p className="text-xs font-semibold text-muted">
            {PRIORITY_LABEL[values.priority]} · {ANNOUNCEMENT_CATEGORY_LABEL[values.category]} · {values.publisher || "—"}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{values.title || "(judul)"}</h2>
          <p className="mt-3 border-l-4 border-line pl-3 font-medium">{values.summary || "(ringkasan)"}</p>
          <div className="mt-3 whitespace-pre-line text-sm leading-6">{values.body || "(isi)"}</div>
          {values.requiresAck ? <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Pembaca diminta mengonfirmasi telah membaca.</p> : null}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {state !== "withdrawn" ? (
          <button type="submit" disabled={busy} className={buttonClass.primary} data-testid="save-announcement">
            {busy ? "Menyimpan…" : mode === "create" ? "Simpan sebagai draf" : "Simpan perubahan"}
          </button>
        ) : null}
        <button type="button" onClick={() => setPreview((p) => !p)} className={buttonClass.secondary} aria-pressed={preview}>
          <Eye className="h-4 w-4" aria-hidden="true" /> {preview ? "Tutup pratinjau" : "Pratinjau"}
        </button>
        <Link href="/admin/announcements" className={buttonClass.ghost}>
          Kembali
        </Link>
        {mode === "edit" ? (
          confirm ? (
            <span role="alertdialog" aria-labelledby="act-q" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 sm:ml-auto">
              <span id="act-q" className="text-sm text-amber-950">
                {confirm === "publish"
                  ? "Terbitkan pengumuman resmi ini kepada audiens yang dipilih?"
                  : "Tarik pengumuman ini? Pengguna tidak akan melihatnya lagi."}
              </span>
              <button type="button" onClick={() => act(confirm)} disabled={busy} className={confirm === "publish" ? buttonClass.primary : buttonClass.danger} data-testid="confirm-action">
                Ya, {confirm === "publish" ? "terbitkan" : "tarik"}
              </button>
              <button type="button" onClick={() => setConfirm(null)} className={buttonClass.secondary}>
                Batal
              </button>
            </span>
          ) : state === "draft" || state === "withdrawn" ? (
            <button
              type="button"
              onClick={() => setConfirm("publish")}
              disabled={dirty || busy}
              title={dirty ? "Simpan perubahan terlebih dahulu" : undefined}
              className={`${buttonClass.primary} sm:ml-auto`}
              data-testid="publish-announcement"
            >
              <Send className="h-4 w-4" aria-hidden="true" /> {state === "withdrawn" ? "Terbitkan ulang…" : "Terbitkan…"}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirm("withdraw")} disabled={busy} className={`${buttonClass.secondary} text-rose-700 sm:ml-auto`} data-testid="withdraw-announcement">
              <Undo2 className="h-4 w-4" aria-hidden="true" /> Tarik…
            </button>
          )
        ) : null}
      </div>
      {mode === "edit" && dirty && (state === "draft" || state === "withdrawn") ? (
        <p className="text-xs text-muted">Simpan perubahan sebelum menerbitkan.</p>
      ) : null}
      {state ? <p className="sr-only">Status saat ini: {ANNOUNCEMENT_STATE_LABEL[state]}</p> : null}
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  error,
  children,
  wide,
}: {
  name: keyof AnnouncementFormValues;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={`f-${name}`} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p id={`e-${name}`} className="mt-1 text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CheckGroup({
  legend,
  items,
  selected,
  onToggle,
  error,
}: {
  legend: string;
  items: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-3">
      <legend className="px-1 text-sm font-medium">{legend}</legend>
      {items.length === 0 ? (
        <p className="px-1 text-xs text-muted">Tidak ada pilihan untuk audiens ini.</p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {items.map((i) => (
            <li key={i.value}>
              <label className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-slate-50">
                <input type="checkbox" className="h-4 w-4" checked={selected.includes(i.value)} onChange={() => onToggle(i.value)} />
                {i.label}
              </label>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-1 px-1 text-xs font-medium text-rose-700">{error}</p> : null}
    </fieldset>
  );
}
