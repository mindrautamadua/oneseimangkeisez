/**
 * Removes secrets from audit metadata (FR-10, AT-12). Defence in depth: callers should
 * never pass secrets, but anything whose key looks sensitive is redacted, and values that
 * look like bearer tokens / JWTs are redacted regardless of key.
 */
const SENSITIVE_KEY = /pass(word)?|secret|token|cookie|authorization|session|credential|api[-_]?key|code_verifier|^code$|nonce|state/i;
const JWT_LIKE = /^eyJ[\w-]+\.[\w-]+\.[\w-]*$/;
const BEARER = /^bearer\s+/i;

export const REDACTED = "[REDACTED]";

export function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (JWT_LIKE.test(value) || BEARER.test(value)) return REDACTED;
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeMetadata(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
      out[k] = SENSITIVE_KEY.test(k) ? REDACTED : sanitizeMetadata(v, depth + 1);
    }
    return out;
  }
  return String(value);
}
