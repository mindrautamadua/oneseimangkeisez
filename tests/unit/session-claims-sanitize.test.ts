import { describe, expect, it } from "vitest";
import { openSession, sealSession } from "@/lib/auth/session-core";
import { membershipsFromGeneric, membershipsFromZitadel } from "@/lib/auth/claims";
import { REDACTED, sanitizeMetadata } from "@/lib/audit/sanitize";
import type { Principal } from "@/lib/authz/types";

const secret = "unit-test-secret-unit-test-secret-1234";
const p: Principal = {
  sub: "u1",
  name: "User",
  email: "u@x.example",
  memberships: [{ orgId: "o1", roles: ["employee"] }],
  activeOrgId: null,
  authProvider: "mock",
};

describe("session token", () => {
  it("round-trips and is opaque", async () => {
    const t = await sealSession(p, secret, 600);
    expect(t).not.toContain("employee");
    const r = await openSession(t, secret);
    expect(r.status).toBe("valid");
    if (r.status === "valid") expect(r.principal.memberships).toEqual(p.memberships);
  });
  it("reports expiry distinctly (AT-10)", async () => {
    const t = await sealSession(p, secret, 300, 1_000_000);
    expect((await openSession(t, secret)).status).toBe("expired");
  });
  it("rejects tampering and wrong secret", async () => {
    const t = await sealSession(p, secret, 600);
    expect((await openSession(t.slice(0, -4) + "AAAA", secret)).status).toBe("invalid");
    expect((await openSession(t, "another-secret-another-secret-12345")).status).toBe("invalid");
    expect((await openSession(undefined, secret)).status).toBe("none");
  });
});

describe("claim mapping", () => {
  it("maps ZITADEL project roles to org memberships", () => {
    const m = membershipsFromZitadel({
      "urn:zitadel:iam:org:project:roles": {
        employee: { "1001": "kinra.example" },
        portal_admin: { "1001": "kinra.example" },
        tenant_user: { "2002": "tenant-a.example" },
      },
    });
    expect(m).toEqual([
      { orgId: "1001", roles: ["employee", "portal_admin"] },
      { orgId: "2002", roles: ["tenant_user"] },
    ]);
  });
  it("ignores malformed role keys and org ids", () => {
    const m = membershipsFromZitadel({
      "urn:zitadel:iam:org:project:roles": { "Bad Role": { "1": "x" }, ok: { "../evil": "x" } },
    });
    expect(m).toEqual([]);
  });
  it("maps a generic claim", () => {
    expect(membershipsFromGeneric({ m: [{ org: "o1", roles: ["employee", 5] }, { bad: true }] }, "m")).toEqual([
      { orgId: "o1", roles: ["employee"] },
    ]);
    expect(membershipsFromGeneric({ m: "not json" }, "m")).toEqual([]);
  });
});

describe("audit sanitizer (AT-12)", () => {
  it("redacts sensitive keys and token-like values", () => {
    const out = sanitizeMetadata({
      password: "hunter2",
      access_token: "abc",
      refresh_token: "abc",
      cookie: "s=1",
      nested: { Authorization: "Bearer x", clientSecret: "y", note: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig" },
      slug: "erp",
    }) as Record<string, unknown>;
    expect(out.password).toBe(REDACTED);
    expect(out.access_token).toBe(REDACTED);
    expect(out.refresh_token).toBe(REDACTED);
    expect(out.cookie).toBe(REDACTED);
    expect(out.nested).toEqual({ Authorization: REDACTED, clientSecret: REDACTED, note: REDACTED });
    expect(out.slug).toBe("erp");
  });
});
