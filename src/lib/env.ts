import "server-only";
import { z } from "zod";

const boolString = z
  .enum(["true", "false", ""])
  .optional()
  .transform((v) => v === "true");

const schema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORTAL_BASE_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET minimal 32 karakter"),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().min(300).max(86400).default(28800),
  AUTH_PROVIDER: z.enum(["oidc", "kinra_iam", "mock"]).default("oidc"),
  MOCK_AUTH_ENABLED: boolString,
  OIDC_ISSUER: z.string().optional().default(""),
  OIDC_CLIENT_ID: z.string().optional().default(""),
  OIDC_CLIENT_SECRET: z.string().optional().default(""),
  OIDC_SCOPES: z.string().default("openid profile email"),
  OIDC_CLAIM_MAPPING: z.enum(["zitadel", "generic"]).default("zitadel"),
  OIDC_MEMBERSHIPS_CLAIM: z.string().default("onekinra_memberships"),
  /** KINRA IAM (AUTH_PROVIDER=kinra_iam): email/NIK + password validated by the IAM SSO API. */
  KINRA_IAM_URL: z.url().default("https://iam-ti-pt-kinra.vercel.app"),
  KINRA_IAM_JWKS_URL: z.url().default("https://wradhnmcjmneokbbixxi.supabase.co/auth/v1/.well-known/jwks.json"),
  KINRA_IAM_ISSUER: z.string().default("https://wradhnmcjmneokbbixxi.supabase.co/auth/v1"),
  KINRA_IAM_APP_CODE: z.string().min(1).default("ONESEIMANGKEISEZ"),
  /** Application credentials registered in KINRA IAM (sent as x-client-id / x-client-secret). */
  KINRA_IAM_CLIENT_ID: z.string().optional().default(""),
  KINRA_IAM_CLIENT_SECRET: z.string().optional().default(""),
  /** organizations.external_org_id that every IAM user is placed in. */
  KINRA_IAM_ORG_ID: z.string().min(1).default("demo-org-kinra"),
  /** JSON map from IAM application role to portal roles; "*" is the fallback. */
  KINRA_IAM_ROLE_MAP: z
    .string()
    .default('{"User":["employee"],"Admin":["employee","portal_admin"],"*":["employee"]}')
    .transform((v, ctx) => {
      try {
        return z.record(z.string(), z.array(z.string())).parse(JSON.parse(v));
      } catch {
        ctx.addIssue({ code: "custom", message: "KINRA_IAM_ROLE_MAP harus JSON { role: string[] }" });
        return z.NEVER;
      }
    }),
  APP_URL_ALLOWED_HOSTS: z.string().default(""),
  APP_URL_ALLOW_HTTP: boolString,
  /** Enables the workspace AI assistant. Empty = assistant shown as "not configured". */
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ASSISTANT_MODEL: z.string().default("claude-opus-5-5"),
  /** Bearer token for the scheduler endpoint that refreshes news feeds. Empty = endpoint disabled. */
  NEWS_SYNC_TOKEN: z.union([z.literal(""), z.string().min(32, "NEWS_SYNC_TOKEN minimal 32 karakter")]).default(""),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Lazily parsed, validated environment. Throws a descriptive error on misconfiguration. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Konfigurasi environment tidak valid: ${issues}`);
  }
  const e = parsed.data;
  if (e.AUTH_PROVIDER === "mock" && e.APP_ENV === "production") {
    throw new Error("AUTH_PROVIDER=mock dilarang ketika APP_ENV=production.");
  }
  if (e.AUTH_PROVIDER === "oidc" && (!e.OIDC_ISSUER || !e.OIDC_CLIENT_ID)) {
    throw new Error("AUTH_PROVIDER=oidc membutuhkan OIDC_ISSUER dan OIDC_CLIENT_ID.");
  }
  cached = e;
  return e;
}

/** True only when the clearly-labelled local mock identity adapter is allowed. */
export function mockAuthActive(): boolean {
  const e = env();
  return e.AUTH_PROVIDER === "mock" && e.MOCK_AUTH_ENABLED && e.APP_ENV !== "production";
}

/** Test helper: forget cached env so tests can change process.env. */
export function resetEnvCache() {
  cached = null;
}
