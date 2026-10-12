import "server-only";
import { headers } from "next/headers";
import { getDb } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";
import { log } from "@/lib/logger";
import { sanitizeMetadata } from "./sanitize";

export type AuditEventType =
  | "auth.login"
  | "auth.logout"
  | "auth.session_expired"
  | "context.switch"
  | "app.launch"
  | "catalogue.create"
  | "catalogue.update"
  | "catalogue.retire"
  | "entitlement.grant"
  | "entitlement.revoke"
  | "admin.access"
  | "authz.denied"
  | "assistant.ask"
  | "announcement.create"
  | "announcement.update"
  | "announcement.publish"
  | "announcement.withdraw"
  | "announcement.ack"
  | "news.sync"
  | "news.visibility";

export interface AuditInput {
  eventType: AuditEventType;
  outcome: "success" | "failure" | "denied";
  actorId?: string | null;
  organizationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

// Rate control for denied events to prevent log flooding (FR-10).
const deniedSeen = new Map<string, number>();
const DENIED_WINDOW_MS = 60_000;

function shouldSuppress(input: AuditInput): boolean {
  if (input.outcome !== "denied") return false;
  const key = `${input.eventType}|${input.actorId}|${input.resourceType}|${input.resourceId}`;
  const now = Date.now();
  const last = deniedSeen.get(key);
  if (last && now - last < DENIED_WINDOW_MS) return true;
  deniedSeen.set(key, now);
  if (deniedSeen.size > 5000) {
    for (const [k, t] of deniedSeen) if (now - t > DENIED_WINDOW_MS) deniedSeen.delete(k);
  }
  return false;
}

export async function currentCorrelationId(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-request-id") ?? crypto.randomUUID();
  } catch {
    return crypto.randomUUID();
  }
}

/** Records an audit event. Never throws: audit failure is logged, not surfaced to users. */
export async function recordAudit(input: AuditInput): Promise<void> {
  if (shouldSuppress(input)) return;
  const correlationId = input.correlationId ?? (await currentCorrelationId());
  const metadata = sanitizeMetadata(input.metadata ?? {}) as Record<string, unknown>;
  try {
    await getDb()
      .insert(auditEvents)
      .values({
        eventType: input.eventType,
        outcome: input.outcome,
        actorId: input.actorId ?? null,
        organizationId: input.organizationId ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        correlationId,
        metadata,
      });
  } catch (e) {
    log("error", "audit_write_failed", { eventType: input.eventType, correlationId, error: String(e) });
  }
  log("info", "audit", { eventType: input.eventType, outcome: input.outcome, correlationId });
}
