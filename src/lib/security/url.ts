/**
 * Validation for catalogue target URLs (FR-05, FR-06, AT-11).
 * Pure module (no env access) so it can be unit tested and reused by the admin API.
 */
export interface UrlPolicy {
  /** Host patterns: "app.example.com" (exact) or "*.example.com" (subdomains only). */
  allowedHosts: string[];
  allowHttp: boolean;
}

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: string };

export function parseAllowedHosts(raw: string): string[] {
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function hostAllowed(host: string, patterns: string[]): boolean {
  const h = host.toLowerCase();
  return patterns.some((p) => {
    if (p.startsWith("*.")) {
      const suffix = p.slice(1); // ".example.com"
      return h.endsWith(suffix) && h.length > suffix.length;
    }
    return h === p;
  });
}

export function validateTargetUrl(input: string, policy: UrlPolicy): UrlCheck {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "URL tujuan wajib diisi." };
  if (raw.length > 2048) return { ok: false, reason: "URL tujuan terlalu panjang." };
  // Reject control characters and whitespace that browsers may silently strip.
  if (/[\u0000-\u001F\u007F\s\\]/.test(raw)) {
    return { ok: false, reason: "URL mengandung karakter yang tidak diizinkan." };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Format URL tidak valid. Gunakan URL lengkap, mis. https://aplikasi.contoh." };
  }
  const scheme = url.protocol;
  if (scheme !== "https:" && !(scheme === "http:" && policy.allowHttp)) {
    return {
      ok: false,
      reason: policy.allowHttp
        ? "Skema URL harus https:// atau http://."
        : "Skema URL harus https://. Skema lain (javascript:, data:, http:, dll.) ditolak.",
    };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URL tidak boleh memuat kredensial (user:password@)." };
  }
  if (!url.hostname) return { ok: false, reason: "URL harus memiliki host." };
  if (policy.allowedHosts.length === 0) {
    return { ok: false, reason: "Daftar host yang diizinkan (APP_URL_ALLOWED_HOSTS) kosong." };
  }
  if (!hostAllowed(url.hostname, policy.allowedHosts)) {
    return {
      ok: false,
      reason: `Host "${url.hostname}" tidak termasuk daftar host yang disetujui administrator.`,
    };
  }
  return { ok: true, url: url.toString() };
}

/**
 * Sanitizes a post-login return path to prevent open redirects.
 * Only same-origin absolute paths are accepted.
 */
export function safeReturnPath(input: string | null | undefined, fallback = "/workspace"): string {
  if (!input) return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(input)) return fallback;
  try {
    const u = new URL(input, "http://portal.local");
    if (u.origin !== "http://portal.local") return fallback;
    if (u.pathname.startsWith("/api/")) return fallback;
    return u.pathname + u.search;
  } catch {
    return fallback;
  }
}
