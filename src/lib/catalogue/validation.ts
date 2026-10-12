import { z } from "zod";
import { validateTargetUrl, type UrlPolicy } from "@/lib/security/url";

export const APP_STATUSES = ["available", "pilot", "planned", "maintenance", "retired"] as const;
export const AUDIENCES = ["internal", "tenant", "both"] as const;
export const INTEGRATION_MODES = ["oidc_sso", "saml_sso", "authenticated_link", "external_link"] as const;
export const ENVIRONMENTS = ["production", "staging", "development"] as const;
export const ICON_KEYS = [
  "app-window",
  "landmark",
  "users",
  "life-buoy",
  "shield-check",
  "kanban",
  "map",
  "zap",
  "gauge",
  "folder",
  "headset",
  "file-text",
  "message-square-warning",
  "credit-card",
  "activity",
  "stamp",
  "hard-hat",
  "wifi",
  "megaphone",
  "handshake",
  "chart-line",
  "chart-pie",
  "wrench",
  "radio-tower",
  "leaf",
  "cctv",
  "boxes",
  "shopping-cart",
  "receipt",
  "mail",
  "bot",
  "key-round",
  "plug",
  "graduation-cap",
  "clipboard-check",
  "calendar-days",
  "layers",
  "user-check",
  "building-2",
  "monitor-dot",
  "network",
  "briefcase",
  "wallet",
  "file-signature",
  "factory",
  "rocket",
] as const;

const text = (max: number) => z.string().trim().max(max);
const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} wajib diisi.`).max(max, `${label} maksimal ${max} karakter.`);

export const appInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug minimal 2 karakter.")
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung."),
  name: required("Nama aplikasi", 120),
  description: text(500).default(""),
  iconKey: z.enum(ICON_KEYS).default("app-window"),
  categoryId: z.uuid("Kategori tidak valid."),
  targetUrl: required("URL tujuan", 2048),
  audience: z.enum(AUDIENCES),
  integrationMode: z.enum(INTEGRATION_MODES),
  status: z.enum(APP_STATUSES).default("planned"),
  environment: z.enum(ENVIRONMENTS).default("production"),
  applicationOwner: required("Pemilik aplikasi (teknis)", 160),
  businessOwner: required("Pemilik bisnis/layanan", 160),
  supportContact: required("Kontak dukungan", 200),
  displayOrder: z.coerce.number().int().min(0).max(10000).default(100),
  featured: z.coerce.boolean().default(false),
  initiativeRef: z
    .string()
    .trim()
    .max(32, "Referensi inisiatif maksimal 32 karakter.")
    .regex(/^[A-Za-z0-9 ._,/-]*$/, "Referensi inisiatif hanya huruf, angka, dan tanda baca sederhana.")
    .default("")
    .transform((v) => v || null),
  targetPeriod: z
    .string()
    .trim()
    .max(32, "Periode target maksimal 32 karakter.")
    .default("")
    .transform((v) => v || null),
});

export type AppInput = z.infer<typeof appInputSchema>;

export type FieldErrors = Record<string, string>;

export function validateAppInput(
  data: unknown,
  urlPolicy: UrlPolicy,
): { ok: true; value: AppInput } | { ok: false; errors: FieldErrors } {
  const parsed = appInputSchema.safeParse(data);
  const errors: FieldErrors = {};
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] ?? "_");
      errors[key] ??= i.message;
    }
  }
  const rawUrl =
    data && typeof data === "object" && typeof (data as { targetUrl?: unknown }).targetUrl === "string"
      ? (data as { targetUrl: string }).targetUrl
      : "";
  if (!errors.targetUrl && rawUrl) {
    const u = validateTargetUrl(rawUrl, urlPolicy);
    if (!u.ok) errors.targetUrl = u.reason;
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  const u = validateTargetUrl(parsed.data.targetUrl, urlPolicy);
  return { ok: true, value: { ...parsed.data, targetUrl: u.ok ? u.url : parsed.data.targetUrl } };
}

export const entitlementInputSchema = z.object({
  organizationId: z.uuid("Organisasi tidak valid."),
  roleKey: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_.-]{0,63}$/, "Kunci peran tidak valid (huruf kecil, angka, _ . -)."),
});
