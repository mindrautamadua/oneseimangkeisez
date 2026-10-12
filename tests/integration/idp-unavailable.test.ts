import { describe, expect, it } from "vitest";
import { resetEnvCache } from "@/lib/env";

describe("AT-14 identity provider unavailable", () => {
  it("raises a controlled IdpUnavailableError instead of bypassing authentication", async () => {
    process.env.AUTH_PROVIDER = "oidc";
    process.env.OIDC_ISSUER = "http://127.0.0.1:9/unreachable";
    process.env.OIDC_CLIENT_ID = "onekinra-test";
    resetEnvCache();
    const { beginLogin, IdpUnavailableError } = await import("@/lib/auth/oidc");
    await expect(beginLogin("/workspace")).rejects.toBeInstanceOf(IdpUnavailableError);
    process.env.AUTH_PROVIDER = "mock";
    resetEnvCache();
  });

  it("refuses the mock adapter in production", async () => {
    const { env, resetEnvCache: reset } = await import("@/lib/env");
    process.env.APP_ENV = "production";
    reset();
    expect(() => env()).toThrow(/mock dilarang/);
    process.env.APP_ENV = "development";
    reset();
  });
});
