import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { listAuthorizedApps } from "@/lib/catalogue/service";
import { buildAssistantSystem } from "@/lib/assistant/prompt";
import { recordAudit } from "@/lib/audit/audit";
import { ValidationError } from "@/lib/catalogue/errors";
import { log } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { jsonError, readJson, withAuth } from "@/lib/request";

export const dynamic = "force-dynamic";

const MAX_TURNS = 20;
const MAX_CHARS = 2000;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(MAX_CHARS * 4) }))
    .min(1)
    .max(MAX_TURNS),
});

let client: Anthropic | null = null;
function anthropic(apiKey: string) {
  client ??= new Anthropic({ apiKey });
  return client;
}

/**
 * Workspace assistant. Streams NDJSON events: {"t":"text","v":"…"} … {"t":"done"} or {"t":"error","v":"…"}.
 * Grounded only in the caller's authorized catalogue; conversation content is not stored or audited.
 */
export const POST = withAuth(async (auth, correlationId, req: Request) => {
  const e = env();
  if (!e.ANTHROPIC_API_KEY) return jsonError(503, "assistant_not_configured", "Asisten belum dikonfigurasi oleh administrator.");
  if (!auth.ctx) return jsonError(403, "no_context", "Akun Anda belum terhubung ke organisasi.");
  if (!rateLimit(`assistant:${auth.principal.sub}:${clientIp(req.headers)}`, 20, 60_000)) {
    return jsonError(429, "rate_limited", "Terlalu banyak pertanyaan. Coba lagi dalam satu menit.");
  }

  const parsed = bodySchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ValidationError({ messages: "Format percakapan tidak valid." });
  const messages = parsed.data.messages;
  const last = messages.at(-1)!;
  if (last.role !== "user" || messages[0]!.role !== "user") throw new ValidationError({ messages: "Percakapan harus diawali dan diakhiri pesan pengguna." });
  if (last.content.length > MAX_CHARS) throw new ValidationError({ messages: `Pertanyaan maksimal ${MAX_CHARS} karakter.` });

  const apps = await listAuthorizedApps(auth.ctx);
  const system = buildAssistantSystem(apps, auth.ctx, auth.principal.name);

  await recordAudit({
    eventType: "assistant.ask",
    outcome: "success",
    actorId: auth.principal.sub,
    organizationId: auth.ctx.org.externalOrgId,
    resourceType: "assistant",
    // Only sizes: question text may contain personal data and is deliberately not logged.
    metadata: { turns: messages.length, questionChars: last.content.length, model: e.ASSISTANT_MODEL },
    correlationId,
  });

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, event: Record<string, string>) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

  const body = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic(e.ANTHROPIC_API_KEY).beta.messages.stream(
          {
            model: e.ASSISTANT_MODEL,
            max_tokens: 8000,
            // Chat Q&A over a small catalogue: low effort keeps answers fast.
            output_config: { effort: "low" },
            // If a safety classifier declines, the API retries on a fallback model in the same call.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
            messages,
          },
          { signal: req.signal },
        );
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send(controller, { t: "text", v: event.delta.text });
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          send(controller, { t: "error", v: "Maaf, asisten tidak dapat menjawab pertanyaan ini. Coba ajukan pertanyaan lain tentang aplikasi Anda." });
        } else if (final.stop_reason === "max_tokens") {
          send(controller, { t: "error", v: "Jawaban terpotong karena terlalu panjang. Coba persempit pertanyaan Anda." });
        } else {
          send(controller, { t: "done" });
        }
      } catch (err) {
        if (req.signal.aborted) return controller.close();
        let message = "Asisten sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.";
        if (err instanceof Anthropic.RateLimitError) message = "Asisten sedang sibuk. Coba lagi dalam beberapa saat.";
        else if (err instanceof Anthropic.AuthenticationError) message = "Asisten belum dikonfigurasi dengan benar. Hubungi administrator.";
        log("error", "assistant_failed", {
          correlationId,
          status: err instanceof Anthropic.APIError ? err.status : undefined,
          error: err instanceof Error ? err.message : String(err),
        });
        send(controller, { t: "error", v: message });
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
});
