import { describe, expect, it } from "vitest";
import { hostAllowed, safeReturnPath, validateTargetUrl } from "@/lib/security/url";

const policy = { allowedHosts: ["*.kinra.example", "portal.partner.example"], allowHttp: false };

describe("validateTargetUrl (AT-11)", () => {
  it("accepts https on an allowlisted host", () => {
    expect(validateTargetUrl("https://erp.kinra.example/home", policy)).toEqual({ ok: true, url: "https://erp.kinra.example/home" });
    expect(validateTargetUrl("https://portal.partner.example", policy).ok).toBe(true);
  });
  it.each([
    ["javascript:alert(1)"],
    ["JaVaScRiPt:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["vbscript:msgbox"],
    ["file:///etc/passwd"],
    ["http://erp.kinra.example"],
    ["//erp.kinra.example"],
    ["https://evil.example"],
    ["https://kinra.example.evil.com"],
    ["https://evilkinra.example"],
    ["https://user:pass@erp.kinra.example"],
    ["https://erp.kinra.example/\nx"],
    [" "],
    ["not a url"],
  ])("rejects %s", (u) => {
    expect(validateTargetUrl(u, policy).ok).toBe(false);
  });
  it("allows http only when explicitly enabled", () => {
    expect(validateTargetUrl("http://erp.kinra.example", { ...policy, allowHttp: true }).ok).toBe(true);
  });
  it("rejects everything when the allowlist is empty", () => {
    expect(validateTargetUrl("https://erp.kinra.example", { allowedHosts: [], allowHttp: false }).ok).toBe(false);
  });
  it("wildcard does not match the apex domain", () => {
    expect(hostAllowed("kinra.example", ["*.kinra.example"])).toBe(false);
    expect(hostAllowed("a.b.kinra.example", ["*.kinra.example"])).toBe(true);
  });
});

describe("safeReturnPath (open redirect prevention)", () => {
  it.each([
    ["/workspace", "/workspace"],
    ["/apps/erp?x=1", "/apps/erp?x=1"],
    ["https://evil.example", "/workspace"],
    ["//evil.example", "/workspace"],
    ["/\\evil.example", "/workspace"],
    ["/api/admin/applications", "/workspace"],
    [null, "/workspace"],
  ])("%s -> %s", (input, expected) => {
    expect(safeReturnPath(input)).toBe(expected);
  });
});
