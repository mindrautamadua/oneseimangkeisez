import { expect, type Page } from "@playwright/test";

export async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.selectOption("#username", username);
  await page.getByRole("button", { name: /Masuk \(mock\)/ }).click();
  await page.waitForURL("**/workspace");
  await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
}

export async function appSlugs(page: Page): Promise<string[]> {
  const cards = page.locator('[data-testid^="app-card-"]');
  return (await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.replace("app-card-", "")))).sort();
}
