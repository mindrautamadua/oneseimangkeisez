import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("PWA", () => {
  test("manifest, icons, version endpoint and service worker script are served correctly", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBe(true);
    const m = await manifest.json();
    expect(m).toMatchObject({ short_name: "OneSeiMangkeiSEZ", display: "standalone", start_url: "/workspace" });
    for (const icon of m.icons as Array<{ src: string }>) {
      expect((await request.get(icon.src)).ok()).toBe(true);
    }

    const v = await request.get("/api/version");
    expect(v.headers()["cache-control"]).toContain("no-store");
    const { buildId, version } = await v.json();
    expect(buildId).toMatch(/\w+/);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);

    const sw = await request.get("/sw.js");
    expect(sw.headers()["content-type"]).toContain("javascript");
    expect(sw.headers()["cache-control"]).toContain("no-cache");
    const body = await sw.text();
    expect(body).toContain(JSON.stringify(buildId)); // script changes per build -> browser update
    expect(body).not.toMatch(/\/api\/.*caches\.put/); // never caches API responses
  });

  test("service worker controls the app and serves the offline page without a network", async ({ page, context }) => {
    await login(page, "andi.karyawan");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    await context.setOffline(true);
    await page.goto("/workspace").catch(() => {});
    await expect(page.getByRole("heading", { name: "Anda sedang offline" })).toBeVisible();
    // No authenticated content is available offline.
    await expect(page.locator("body")).not.toContainText("DMS, Workflow");
    await context.setOffline(false);
  });
});

test.describe("PWA auto-update", () => {
  // Route interception of /api/version is only reliable without a service worker in between;
  // this exercises the page-side update logic (the SW path is covered by the test above).
  test.use({ serviceWorkers: "block" });

  test("detects a new deployment, counts down, reloads once and does not loop", async ({ page }) => {
    await page.route("**/api/version", (route) =>
      route.fulfill({ json: { version: "9.9.9", buildId: "simulated-new-build" }, headers: { "Cache-Control": "no-store" } }),
    );
    await login(page, "andi.karyawan");
    const toast = page.getByTestId("update-toast");
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("update-message")).toContainText("Memperbarui otomatis dalam");

    const reloaded = page.waitForEvent("framenavigated");
    await page.getByTestId("update-now").click();
    await reloaded;
    await page.waitForLoadState("networkidle");
    // Same simulated build is still reported, but it was already attempted: no reload loop.
    await page.waitForTimeout(4500);
    await expect(toast).toHaveCount(0);
  });

  test("never auto-reloads while an admin form has unsaved changes", async ({ page }) => {
    await login(page, "admin.it");
    await page.goto("/admin/applications/new");
    await page.locator("#f-name").fill("Perubahan belum disimpan");
    await page.route("**/api/version", (route) =>
      route.fulfill({ json: { version: "9.9.9", buildId: "simulated-build-2" }, headers: { "Cache-Control": "no-store" } }),
    );
    // Trigger a check (the app also checks when it becomes visible again).
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByTestId("update-message")).toContainText("belum disimpan", { timeout: 10_000 });
    await page.waitForTimeout(3000);
    await expect(page.locator("#f-name")).toHaveValue("Perubahan belum disimpan");
  });
});
