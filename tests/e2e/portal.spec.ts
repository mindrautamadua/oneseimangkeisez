import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { sealSession } from "../../src/lib/auth/session-core";
import { appSlugs, login } from "./helpers";

config({ path: ".env.local", quiet: true });

test.describe("access & workspaces", () => {
  test("unauthenticated users are sent to login", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login\?next=%2Fworkspace/);
    await expect(page.getByText("MOCK — hanya pengembangan lokal.")).toBeVisible();
  });

  test("AT-01 internal user sees the internal workspace and only authorized apps", async ({ page }) => {
    await login(page, "andi.karyawan");
    await expect(page.getByTestId("workspace-badge")).toHaveText("Workspace Internal KINRA");
    const slugs = await appSlugs(page);
    expect(slugs).toContain("dms-workflow");
    expect(slugs).not.toContain("dashboard-direksi");
    expect(slugs).not.toContain("tenant-portal");
    expect(slugs).not.toContain("billing-utilitas-legacy");
    await expect(page.getByTestId("simulation-note")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Dokumen & Kolaborasi/ })).toBeVisible();
  });

  test("AT-02 tenant user sees tenant services only", async ({ page }) => {
    await login(page, "budi.tenant-a");
    await expect(page.getByTestId("workspace-badge")).toHaveText("Workspace Tenant");
    const slugs = await appSlugs(page);
    expect(slugs).toContain("tenant-portal");
    expect(slugs).not.toContain("sap-fi");
    expect(slugs).not.toContain("kontrak-dokumen-tenant");
    // Admin navigation is not offered to tenants.
    await expect(page.getByRole("link", { name: "Admin Katalog" })).toHaveCount(0);
  });

  test("AT-03 cross-tenant access is denied server-side", async ({ page }) => {
    await login(page, "citra.tenant-b");
    const sw = await page.request.post("/api/context", { data: { orgId: "demo-org-tenant-a" } });
    expect(sw.status()).toBe(403);
    const me = await (await page.request.get("/api/me/applications")).json();
    expect(me.context.orgId).toBe("demo-org-tenant-b");
    expect(me.applications.map((a: { slug: string }) => a.slug)).not.toContain("konektivitas-tenant");
    expect(JSON.stringify(me)).not.toContain("kinra.example/"); // no target URLs exposed

    const detail = await page.goto("/apps/konektivitas-tenant");
    expect(detail?.status()).toBe(404);
  });

  test("AT-04 guessed launch URL for an unentitled app is denied without metadata", async ({ page }) => {
    await login(page, "andi.karyawan");
    const res = await page.request.get("/launch/dashboard-direksi", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toContain("/access-denied");
    const unknown = await page.request.get("/launch/tidak-ada", { maxRedirects: 0 });
    expect(unknown.headers().location).toBe(res.headers().location);
    await page.goto("/launch/dashboard-direksi");
    await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Dashboard Direksi");
  });

  test("AT-05/AT-06 launch redirects only to the approved URL and labels SSO honestly", async ({ page }) => {
    await login(page, "rudi.operasi");
    const sso = await page.request.get("/launch/ieoc", { maxRedirects: 0 });
    expect(sso.status()).toBe(302);
    expect(sso.headers().location).toBe("https://ieoc.kinra.example/");

    const link = await page.request.get("/launch/video-analytics", { maxRedirects: 0 });
    expect(link.headers().location).toBe("https://video-analytics.kinra.example/");
    await page.goto("/apps/video-analytics");
    await expect(page.getByText("belum terintegrasi SSO")).toBeVisible();
    await expect(page.getByText("SSO (OIDC)")).toHaveCount(0);
    await expect(page.getByText("IT-22 · target 2030")).toBeVisible();

    const launchLink = page.locator('a[href="/launch/video-analytics"]');
    await expect(launchLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(launchLink).toHaveAttribute("target", "_blank");
  });

  test("AT-07 retired and planned apps cannot be launched", async ({ page }) => {
    await login(page, "lina.keuangan");
    await page.getByTestId("search").fill("Legacy");
    await expect(page.getByTestId("empty-state")).toBeVisible();
    const retired = await page.request.get("/launch/billing-utilitas-legacy", { maxRedirects: 0 });
    expect(retired.headers().location).toContain("/access-denied");
    await page.context().clearCookies();
    await login(page, "sari.eksekutif");
    const planned = await page.request.get("/launch/digital-twin", { maxRedirects: 0 });
    expect(planned.headers().location).toContain("/apps/digital-twin?unavailable=not_launchable");
  });

  test("multi-organization user can switch context explicitly", async ({ page }) => {
    await login(page, "dewi.multi");
    await expect(page.getByTestId("context-org")).toHaveText("PT Contoh Tenant A (Demo)");
    expect(await appSlugs(page)).toContain("kontrak-dokumen-tenant");
    await page.getByTestId("org-switch").selectOption("demo-org-tenant-b");
    await page.getByRole("button", { name: "Ganti" }).click();
    await expect(page.getByTestId("context-org")).toHaveText("PT Contoh Tenant B (Demo)");
    const slugs = await appSlugs(page);
    expect(slugs).toContain("tagihan-pembayaran");
    expect(slugs).not.toContain("konektivitas-tenant");
    expect(slugs).not.toContain("kontrak-dokumen-tenant");
  });

  test("user without an eligible organization gets a clear empty state", async ({ page }) => {
    await login(page, "eko.tanpa-akses");
    await expect(page.getByText("Akun belum terhubung ke organisasi")).toBeVisible();
  });
});

test.describe("administration", () => {
  test("AT-09 ordinary users cannot call admin APIs or open admin pages", async ({ page, request }) => {
    const anon = await request.get("/api/admin/applications");
    expect(anon.status()).toBe(401);

    for (const user of ["andi.karyawan", "budi.tenant-a", "rina.auditor"]) {
      await page.context().clearCookies();
      await login(page, user);
      expect((await page.request.get("/api/admin/applications")).status()).toBe(403);
      expect((await page.request.post("/api/admin/applications", { data: { name: "x" } })).status()).toBe(403);
      expect(
        (await page.request.post("/api/admin/applications/00000000-0000-0000-0000-000000000000/retire", { data: { confirm: true } })).status(),
      ).toBe(403);
      await page.goto("/admin/applications");
      await expect(page).toHaveURL(/\/access-denied/);
    }
  });

  test("auditor can read the audit trail but tenant cannot", async ({ page }) => {
    await login(page, "rina.auditor");
    await page.goto("/admin/audit");
    await expect(page.getByTestId("audit-table")).toBeVisible();
    await page.context().clearCookies();
    await login(page, "budi.tenant-a");
    await page.goto("/admin/audit");
    await expect(page).toHaveURL(/\/access-denied/);
  });

  test("AT-08 / AT-11 admin edits metadata with validation and audit", async ({ page }) => {
    await login(page, "admin.it");
    await page.goto("/admin/applications");
    await page.getByRole("link", { name: /Ubah IT Service Desk/ }).click();

    await page.locator("#f-targetUrl").fill("javascript:alert(1)");
    await page.getByTestId("save-app").click();
    await expect(page.getByTestId("error-targetUrl")).toContainText("https://");

    await page.locator("#f-targetUrl").fill("https://evil.example/");
    await page.getByTestId("save-app").click();
    await expect(page.getByTestId("error-targetUrl")).toContainText("tidak termasuk daftar host");

    await page.locator("#f-targetUrl").fill("https://it-service-desk.kinra.example/");
    await page.locator("#f-description").fill("Deskripsi diperbarui oleh uji E2E.");
    await page.getByTestId("save-app").click();
    await expect(page.getByTestId("form-message")).toContainText("Perubahan tersimpan");

    await page.goto("/admin/audit?type=catalogue.update");
    await expect(page.getByTestId("audit-table")).toContainText("mock|admin.it");
    await expect(page.getByTestId("audit-table")).toContainText("description");
  });

  test("admin can create and retire an application with confirmation", async ({ page }) => {
    await login(page, "admin.it");
    await page.goto("/admin/applications/new");
    await page.locator("#f-name").fill("Aplikasi E2E");
    await page.locator("#f-slug").fill("aplikasi-e2e");
    await page.locator("#f-categoryId").selectOption({ label: "Layanan TI & Keamanan" });
    await page.locator("#f-targetUrl").fill("https://e2e.kinra.example/");
    await page.locator("#f-status").selectOption("available");
    await page.locator("#f-businessOwner").fill("Unit E2E");
    await page.locator("#f-applicationOwner").fill("Tim E2E");
    await page.locator("#f-supportContact").fill("e2e@kinra.example");
    await page.getByTestId("save-app").click();
    await expect(page.getByText("Aplikasi berhasil dibuat")).toBeVisible();

    await page.getByTestId("retire-app").click();
    await page.getByTestId("confirm-retire").click();
    await expect(page.getByTestId("form-message")).toContainText("dipensiunkan");

    // Retire endpoint refuses calls without explicit confirmation.
    const id = page.url().split("/admin/applications/")[1]!.split("?")[0];
    const noConfirm = await page.request.post(`/api/admin/applications/${id}/retire`, { data: {} });
    expect(noConfirm.status()).toBe(400);
  });
});

test.describe("session & security", () => {
  test("AT-10 expired session redirects to a recovery page without data", async ({ page, context }) => {
    const token = await sealSession(
      {
        sub: "mock|andi.karyawan",
        name: "Andi",
        email: null,
        memberships: [{ orgId: "demo-org-kinra", roles: ["employee"] }],
        activeOrgId: null,
        authProvider: "mock",
      },
      process.env.SESSION_SECRET!,
      60,
      Math.floor(Date.now() / 1000) - 3600,
    );
    await context.addCookies([{ name: "onekinra_session", value: token, url: "http://localhost:3200" }]);
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/session-expired/);
    await expect(page.getByRole("heading", { name: "Sesi Anda telah berakhir" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("ERP Keuangan");
    const api = await page.request.get("/api/me/applications");
    expect(api.status()).toBe(401);
    expect((await api.json()).error.code).toBe("session_expired");
  });

  test("forged session cookie is rejected", async ({ page, context }) => {
    await context.addCookies([{ name: "onekinra_session", value: "eyJhbGciOiJkaXIifQ..AAAA.BBBB.CCCC", url: "http://localhost:3200" }]);
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login/);
  });

  test("cross-site POST is rejected (CSRF) and security headers are present", async ({ page }) => {
    await login(page, "admin.it");
    const res = await page.request.post("/api/admin/applications", {
      data: {},
      headers: { Origin: "https://evil.example" },
    });
    expect(res.status()).toBe(403);
    const r = await page.request.get("/workspace");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
  });

  test("CSP does not break the client app in production build", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await login(page, "andi.karyawan");
    await page.getByTestId("search").fill("service desk");
    await expect(page.getByTestId("result-count")).toHaveText("1 aplikasi");
    expect(errors.filter((e) => /Content Security Policy|CSP/i.test(e))).toEqual([]);
  });

  test("logout clears the session", async ({ page }) => {
    await login(page, "andi.karyawan");
    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/login\?logged_out=1/);
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("AT-13 search and launch work without horizontal overflow", async ({ page }) => {
    await login(page, "budi.tenant-a");
    await page.getByTestId("search").fill("keluhan");
    await expect(page.getByTestId("app-card-tenant-portal")).toBeVisible();
    await expect(page.getByTestId("launch-tenant-portal")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    const res = await page.request.get("/launch/tenant-portal", { maxRedirects: 0 });
    expect(res.headers().location).toBe("https://tenant-portal.kinra.example/");
  });
});
