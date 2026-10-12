import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Fixed ids from scripts/announcements-demo.ts (demo seed).
const CRITICAL = "00000000-0000-4000-a000-000000000001";
const POLICY_ACK = "00000000-0000-4000-a000-000000000002";
const TENANT_A_ONLY = "00000000-0000-4000-a000-000000000003";
const DRAFT = "00000000-0000-4000-a000-000000000007";

test.describe("announcements & news", () => {
  test("employee sees urgent announcements first and confirms reading explicitly", async ({ page }) => {
    await login(page, "andi.karyawan");
    const urgent = page.getByTestId("urgent-announcements");
    await expect(urgent).toContainText("Pemeliharaan jaringan listrik kawasan Blok B");
    await expect(urgent).toContainText("Pembaruan kebijakan penggunaan perangkat TI");
    await expect(page.getByTestId("pending-acks")).toContainText("1 pengumuman menunggu konfirmasi");
    await expect(page.getByTestId("today-panel")).toContainText("1 pengumuman kritis aktif");
    // Opening the page is not a confirmation.
    await page.goto(`/announcements/${POLICY_ACK}`);
    await expect(page.getByTestId("ack-button")).toBeVisible();
    await page.goto("/workspace");
    await expect(page.getByTestId("pending-acks")).toBeVisible();

    await page.goto(`/announcements/${POLICY_ACK}`);
    await page.getByTestId("ack-button").click();
    await expect(page.getByTestId("ack-done")).toBeVisible();
    await page.goto("/workspace");
    await expect(page.getByTestId("pending-acks")).toHaveCount(0);
  });

  test("announcements of another audience or tenant are not reachable by URL or API", async ({ page }) => {
    await login(page, "citra.tenant-b");
    expect((await page.goto(`/announcements/${TENANT_A_ONLY}`))?.status()).toBe(404);
    expect((await page.goto(`/announcements/${POLICY_ACK}`))?.status()).toBe(404);
    expect((await page.goto(`/announcements/${DRAFT}`))?.status()).toBe(404);
    expect((await page.request.post(`/api/announcements/${POLICY_ACK}/ack`)).status()).toBe(404);
    await page.goto("/announcements");
    await expect(page.getByTestId("announcement-list")).toContainText("Pemeliharaan jaringan listrik");
    await expect(page.locator("body")).not.toContainText("Tenant A");
    await expect(page.locator("body")).not.toContainText("perangkat TI");
  });

  test("ordinary users cannot use content admin pages or APIs", async ({ page }) => {
    for (const user of ["andi.karyawan", "dewi.multi"]) {
      await page.context().clearCookies();
      await login(page, user);
      await page.goto("/admin/announcements");
      await expect(page).toHaveURL(/\/access-denied/);
      expect((await page.request.post("/api/admin/announcements", { data: { title: "x" } })).status()).toBe(403);
      expect((await page.request.post(`/api/admin/announcements/${DRAFT}/publish`, { data: { confirm: true } })).status()).toBe(403);
      expect((await page.request.post("/api/admin/news/sync")).status()).toBe(403);
    }
  });

  test("admin drafts, previews and publishes; tenant audience sees it", async ({ page }) => {
    await login(page, "admin.it");
    await page.goto("/admin/announcements/new");
    await page.fill("#f-title", "Uji E2E pengumuman tenant");
    await page.fill("#f-summary", "Ringkasan uji end-to-end untuk tenant");
    await page.fill("#f-body", "Baris pertama\nBaris kedua <b>bukan HTML</b>");
    await page.selectOption("#f-audience", "tenant");
    await page.fill("#f-publisher", "Tim Uji");
    await page.getByRole("button", { name: "Pratinjau" }).click();
    await expect(page.getByTestId("preview")).toContainText("Uji E2E pengumuman tenant");
    await page.getByTestId("save-announcement").click();
    await page.waitForURL(/\/admin\/announcements\/[0-9a-f-]{36}\?created=1/);
    await expect(page.getByTestId("announcement-state")).toHaveText("Draf");
    await page.getByTestId("publish-announcement").click();
    await page.getByTestId("confirm-action").click();
    await expect(page.getByTestId("announcement-state")).toHaveText("Tayang");

    await page.context().clearCookies();
    await login(page, "budi.tenant-a");
    await page.goto("/announcements");
    await page.getByText("Uji E2E pengumuman tenant").click();
    await expect(page.getByTestId("announcement-body")).toContainText("<b>bukan HTML</b>"); // escaped, not rendered
  });

  test("news page shows an honest empty state and stays within the viewport on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page, "budi.tenant-a");
    await expect(page.getByText("Belum ada berita yang terkumpul")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.goto(`/announcements/${CRITICAL}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.goto("/news");
    await expect(page.getByText("Belum ada berita untuk pilihan ini")).toBeVisible();
    await page.context().clearCookies();
    expect((await page.request.get("/api/news/00000000-0000-4000-a000-000000000001/image")).status()).toBe(401);
  });
});
