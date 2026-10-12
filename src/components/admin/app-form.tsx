"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AUDIENCE_LABEL, ENV_LABEL, INTEGRATION_LABEL, STATUS_LABEL } from "../labels";
import { buttonClass } from "../ui";

export interface AppFormValues {
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  categoryId: string;
  targetUrl: string;
  audience: string;
  integrationMode: string;
  status: string;
  environment: string;
  applicationOwner: string;
  businessOwner: string;
  supportContact: string;
  displayOrder: number;
  featured: boolean;
  initiativeRef: string;
  targetPeriod: string;
}

interface Props {
  mode: "create" | "edit";
  appId?: string;
  initial: AppFormValues;
  categories: Array<{ id: string; name: string }>;
  iconKeys: readonly string[];
}

const input =
  "mt-1.5 min-h-10 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card transition-shadow focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:ring-rose-500/15";

export function AppForm({ mode, appId, initial, categories, iconKeys }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<AppFormValues>(initial);
  const [saved, setSaved] = useState<AppFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);

  const set = <K extends keyof AppFormValues>(k: K, v: AppFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrors({});
    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/applications" : `/api/admin/applications/${appId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (mode === "create") {
          setSaved(values);
          router.push(`/admin/applications/${data.application.id}?created=1`);
        } else {
          setSaved(values);
          setMessage({ kind: "ok", text: "Perubahan tersimpan dan tercatat di jejak audit." });
          router.refresh();
        }
      } else if (res.status === 422) {
        setErrors(data.error?.fields ?? {});
        setMessage({ kind: "err", text: data.error?.message ?? "Validasi gagal." });
      } else if (res.status === 401) {
        router.push("/session-expired");
      } else {
        setMessage({ kind: "err", text: data.error?.message ?? "Gagal menyimpan." });
      }
    } catch {
      setMessage({ kind: "err", text: "Tidak dapat menghubungi server. Periksa koneksi Anda." });
    } finally {
      setBusy(false);
    }
  }

  async function retire() {
    setBusy(true);
    const res = await fetch(`/api/admin/applications/${appId}/retire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    setBusy(false);
    setConfirmRetire(false);
    if (res.ok) {
      setValues((s) => ({ ...s, status: "retired", featured: false }));
      setSaved((s) => ({ ...s, status: "retired", featured: false }));
      setMessage({ kind: "ok", text: "Aplikasi dipensiunkan. Pengguna tidak dapat lagi membukanya." });
      router.refresh();
    } else {
      setMessage({ kind: "err", text: "Gagal mempensiunkan aplikasi." });
    }
  }

  const a11y = (name: keyof AppFormValues) => ({
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
    <form
      onSubmit={submit}
      noValidate
      className="space-y-6"
      // Tells the PWA updater not to auto-reload while there are unsaved edits.
      data-unsaved={JSON.stringify(values) !== JSON.stringify(saved) ? "true" : undefined}
    >
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
        <legend className="mb-3 font-display text-base font-semibold text-ink">Identitas</legend>
        <Field error={errors.name} name="name" label="Nama aplikasi">
          <input {...a11y("name")} className={input} value={values.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field error={errors.slug} name="slug" label="Slug" hint="Huruf kecil, angka, tanda hubung. Dipakai di URL portal.">
          <input {...a11y("slug")} className={input} value={values.slug} onChange={(e) => set("slug", e.target.value)} />
        </Field>
        <Field error={errors.description} name="description" label="Deskripsi singkat" wide>
          <textarea
            {...a11y("description")}
            className={input}
            rows={2}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field error={errors.categoryId} name="categoryId" label="Kategori">
          <select {...a11y("categoryId")} className={input} value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">— pilih —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field error={errors.iconKey} name="iconKey" label="Ikon">
          <select {...a11y("iconKey")} className={input} value={values.iconKey} onChange={(e) => set("iconKey", e.target.value)}>
            {iconKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-base font-semibold text-ink">Akses & peluncuran</legend>
        <Field
          error={errors.targetUrl}
          name="targetUrl"
          label="URL tujuan"
          hint="Hanya https:// dan host pada daftar host yang disetujui. Divalidasi di server."
          wide
        >
          <input
            {...a11y("targetUrl")}
            className={input}
            inputMode="url"
            value={values.targetUrl}
            onChange={(e) => set("targetUrl", e.target.value)}
            placeholder="https://aplikasi.contoh"
          />
        </Field>
        <Field error={errors.audience} name="audience" label="Audiens">
          <select {...a11y("audience")} className={input} value={values.audience} onChange={(e) => set("audience", e.target.value)}>
            {options(AUDIENCE_LABEL)}
          </select>
        </Field>
        <Field
          error={errors.integrationMode}
          name="integrationMode"
          label="Mode integrasi"
          hint="Pilih SSO hanya bila integrasi sudah dikonfigurasi dan diuji di aplikasi tujuan."
        >
          <select
            {...a11y("integrationMode")}
            className={input}
            value={values.integrationMode}
            onChange={(e) => set("integrationMode", e.target.value)}
          >
            {options(INTEGRATION_LABEL)}
          </select>
        </Field>
        <Field error={errors.status} name="status" label="Status" hint="Hanya Tersedia dan Pilot yang dapat dibuka pengguna.">
          <select {...a11y("status")} className={input} value={values.status} onChange={(e) => set("status", e.target.value)}>
            {options(STATUS_LABEL)}
          </select>
        </Field>
        <Field error={errors.environment} name="environment" label="Lingkungan" hint="Entri hanya tampil di portal dengan lingkungan yang sama.">
          <select {...a11y("environment")} className={input} value={values.environment} onChange={(e) => set("environment", e.target.value)}>
            {options(ENV_LABEL)}
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-base font-semibold text-ink">Kepemilikan & tampilan</legend>
        <Field error={errors.businessOwner} name="businessOwner" label="Pemilik bisnis / layanan">
          <input {...a11y("businessOwner")} className={input} value={values.businessOwner} onChange={(e) => set("businessOwner", e.target.value)} />
        </Field>
        <Field error={errors.applicationOwner} name="applicationOwner" label="Pemilik aplikasi (teknis)">
          <input
            {...a11y("applicationOwner")}
            className={input}
            value={values.applicationOwner}
            onChange={(e) => set("applicationOwner", e.target.value)}
          />
        </Field>
        <Field error={errors.supportContact} name="supportContact" label="Kontak dukungan">
          <input {...a11y("supportContact")} className={input} value={values.supportContact} onChange={(e) => set("supportContact", e.target.value)} />
        </Field>
        <Field error={errors.displayOrder} name="displayOrder" label="Urutan tampil">
          <input
            {...a11y("displayOrder")}
            type="number"
            min={0}
            max={10000}
            className={input}
            value={values.displayOrder}
            onChange={(e) => set("displayOrder", Number(e.target.value))}
          />
        </Field>
        <Field error={errors.initiativeRef} name="initiativeRef" label="Referensi roadmap (opsional)" hint="Mis. kode inisiatif RSTI: IT-08.">
          <input {...a11y("initiativeRef")} className={input} value={values.initiativeRef} onChange={(e) => set("initiativeRef", e.target.value)} />
        </Field>
        <Field error={errors.targetPeriod} name="targetPeriod" label="Periode target (opsional)" hint="Mis. 2026–27.">
          <input {...a11y("targetPeriod")} className={input} value={values.targetPeriod} onChange={(e) => set("targetPeriod", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="h-4 w-4"
          />
          Tampilkan di “Akses cepat”
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="submit" disabled={busy} className={buttonClass.primary} data-testid="save-app">
          {busy ? "Menyimpan…" : mode === "create" ? "Simpan aplikasi" : "Simpan perubahan"}
        </button>
        <Link href="/admin/applications" className={buttonClass.secondary}>
          Kembali
        </Link>
        {mode === "edit" && values.status !== "retired" ? (
          confirmRetire ? (
            <span
              role="alertdialog"
              aria-labelledby="retire-q"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 sm:ml-auto"
            >
              <span id="retire-q" className="text-sm text-rose-900">
                Pensiunkan aplikasi ini? Pengguna tidak dapat lagi membukanya.
              </span>
              <button type="button" onClick={retire} disabled={busy} className={buttonClass.danger} data-testid="confirm-retire">
                Ya, pensiunkan
              </button>
              <button type="button" onClick={() => setConfirmRetire(false)} className={buttonClass.secondary}>
                Batal
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRetire(true)}
              className={`${buttonClass.secondary} text-rose-700 sm:ml-auto`}
              data-testid="retire-app"
            >
              Pensiunkan…
            </button>
          )
        ) : null}
      </div>
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
  name: keyof AppFormValues;
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
        <p id={`e-${name}`} className="mt-1 text-xs font-medium text-rose-700" data-testid={`error-${name}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
