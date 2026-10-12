import { z } from "zod";
import { AUDIENCES } from "@/lib/catalogue/validation";

export const ANNOUNCEMENT_PRIORITIES = ["critical", "high", "normal"] as const;
export const ANNOUNCEMENT_CATEGORIES = [
  "management",
  "policy",
  "maintenance",
  "outage",
  "estate",
  "action",
  "general",
] as const;

const required = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} wajib diisi.` : `${label} minimal ${min} karakter.`)
    .max(max, `${label} maksimal ${max} karakter.`);

const WIB_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

/**
 * Parses an admin-entered date. `datetime-local` values carry no zone and are interpreted as
 * WIB (UTC+7, no DST), matching how the portal displays times. ISO strings with a zone are kept.
 * Returns undefined for invalid input and null for empty input.
 */
export function parseWibDateTime(v: unknown): Date | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  const iso = WIB_LOCAL.test(s) ? `${s.length === 16 ? `${s}:00` : s}+07:00` : s;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(iso)) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const dateField = (label: string) =>
  z.unknown().transform((v, c) => {
    const d = parseWibDateTime(v);
    if (d === undefined) {
      c.addIssue({ code: "custom", message: `${label} tidak valid.` });
      return z.NEVER;
    }
    return d;
  });

const ROLE_KEY = /^[a-z][a-z0-9_.-]{0,63}$/;

export const announcementInputSchema = z
  .object({
    title: required("Judul", 5, 160),
    summary: required("Ringkasan", 10, 300),
    body: required("Isi pengumuman", 1, 10000),
    category: z.enum(ANNOUNCEMENT_CATEGORIES, "Kategori tidak valid."),
    priority: z.enum(ANNOUNCEMENT_PRIORITIES, "Prioritas tidak valid."),
    audience: z.enum(AUDIENCES, "Audiens tidak valid."),
    publisher: required("Penerbit", 2, 120),
    publishAt: dateField("Waktu tayang"),
    expiresAt: dateField("Waktu berakhir"),
    requiresAck: z.boolean().default(false),
    targetOrganizationIds: z.array(z.uuid("Organisasi tidak valid.")).max(50, "Maksimal 50 organisasi.").default([]),
    targetRoleKeys: z
      .array(z.string().trim().regex(ROLE_KEY, "Kunci peran tidak valid."))
      .max(20, "Maksimal 20 peran.")
      .default([]),
  })
  .superRefine((v, c) => {
    if (v.publishAt && v.expiresAt && v.expiresAt <= v.publishAt) {
      c.addIssue({ code: "custom", path: ["expiresAt"], message: "Waktu berakhir harus setelah waktu tayang." });
    }
  });

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;

export function validateAnnouncementInput(
  data: unknown,
): { ok: true; value: AnnouncementInput } | { ok: false; errors: Record<string, string> } {
  const parsed = announcementInputSchema.safeParse(data);
  if (parsed.success) {
    return {
      ok: true,
      value: {
        ...parsed.data,
        targetOrganizationIds: [...new Set(parsed.data.targetOrganizationIds)],
        targetRoleKeys: [...new Set(parsed.data.targetRoleKeys)],
      },
    };
  }
  const errors: Record<string, string> = {};
  for (const i of parsed.error.issues) errors[String(i.path[0] ?? "_")] ??= i.message;
  // Object-level refinements are skipped when a field fails; report the window error anyway.
  const raw = (data ?? {}) as { publishAt?: unknown; expiresAt?: unknown };
  const from = parseWibDateTime(raw.publishAt);
  const to = parseWibDateTime(raw.expiresAt);
  if (!errors.expiresAt && from && to && to <= from) errors.expiresAt = "Waktu berakhir harus setelah waktu tayang.";
  return { ok: false, errors };
}

/** Target rows from the two admin lists: org × role when both are given, otherwise one list alone. */
export function expandTargets(orgIds: string[], roleKeys: string[]): Array<{ organizationId: string | null; roleKey: string | null }> {
  if (orgIds.length && roleKeys.length) return orgIds.flatMap((o) => roleKeys.map((r) => ({ organizationId: o, roleKey: r })));
  if (orgIds.length) return orgIds.map((o) => ({ organizationId: o, roleKey: null }));
  return roleKeys.map((r) => ({ organizationId: null, roleKey: r }));
}
