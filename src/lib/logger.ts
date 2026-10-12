import { sanitizeMetadata } from "@/lib/audit/sanitize";

type Level = "debug" | "info" | "warn" | "error";

/** Structured JSON logs to stdout/stderr. Metadata is sanitized; never pass secrets. */
export function log(level: Level, message: string, meta: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "onekinra-portal",
    message,
    ...(sanitizeMetadata(meta) as Record<string, unknown>),
  });
  if (level === "error" || level === "warn") console.error(line);
  else if (level !== "debug" || process.env.LOG_DEBUG === "true") console.log(line);
}
