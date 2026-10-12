export const STATUS_LABEL: Record<string, string> = {
  available: "Tersedia",
  pilot: "Pilot",
  planned: "Direncanakan",
  maintenance: "Pemeliharaan",
  retired: "Dipensiunkan",
};

export const STATUS_STYLE: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  pilot: "bg-sky-50 text-sky-800 ring-sky-200",
  planned: "bg-slate-100 text-slate-700 ring-slate-200",
  maintenance: "bg-amber-50 text-amber-900 ring-amber-200",
  retired: "bg-rose-50 text-rose-800 ring-rose-200",
};

/** Honest description of the sign-in experience (FR-03, AT-06). */
export const INTEGRATION_LABEL: Record<string, string> = {
  oidc_sso: "SSO (OIDC)",
  saml_sso: "SSO (SAML)",
  authenticated_link: "Login di aplikasi",
  external_link: "Tautan eksternal",
};

export const INTEGRATION_HELP: Record<string, string> = {
  oidc_sso:
    "Aplikasi dikonfigurasi untuk masuk tunggal melalui identity provider KINRA. Anda mungkin tetap diminta masuk bila sesi identity provider berakhir.",
  saml_sso:
    "Aplikasi dikonfigurasi untuk masuk tunggal melalui SAML. Anda mungkin tetap diminta masuk bila sesi identity provider berakhir.",
  authenticated_link: "Aplikasi ini belum terintegrasi SSO. Anda akan diminta masuk dengan akun aplikasi tersebut.",
  external_link: "Tautan ke layanan eksternal di luar portal. Aplikasi ini belum terintegrasi SSO.",
};

export const AUDIENCE_LABEL: Record<string, string> = {
  internal: "Internal KINRA",
  tenant: "Tenant",
  both: "Internal & Tenant",
};

export const ENV_LABEL: Record<string, string> = {
  production: "Produksi",
  staging: "Staging",
  development: "Pengembangan",
};

export const ANNOUNCEMENT_CATEGORY_LABEL: Record<string, string> = {
  management: "Manajemen & Direksi",
  policy: "Kebijakan & Prosedur",
  maintenance: "Pemeliharaan Sistem",
  outage: "Gangguan Layanan",
  estate: "Operasional Kawasan & Utilitas",
  action: "Perlu Tindakan",
  general: "Umum",
};

export const PRIORITY_LABEL: Record<string, string> = {
  critical: "Kritis",
  high: "Penting",
  normal: "Informasi",
};

export const ANNOUNCEMENT_STATE_LABEL: Record<string, string> = {
  draft: "Draf",
  scheduled: "Terjadwal",
  active: "Tayang",
  expired: "Kedaluwarsa",
  withdrawn: "Ditarik",
};

export const NEWS_KIND_LABEL: Record<string, string> = {
  official: "Berita KINRA",
  industry: "Media & pemerintah",
};

/** All portal times are shown in WIB (DECISIONS B-9). */
export function formatWib(d: Date, style: "date" | "datetime" = "datetime"): string {
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    ...(style === "datetime" ? { timeStyle: "short" } : {}),
  });
}

/** "09.12" in WIB. Shared by the server render and the live clock. */
export function formatWibTime(d: Date): string {
  return d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
}
