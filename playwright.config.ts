import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const PORT = 3200;
const BASE = `http://localhost:${PORT}`;

/**
 * E2E runs against a production build (`next build && next start`) on port 3200, backed by
 * the isolated TEST database and the local mock identity adapter.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: BASE, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    url: `${BASE}/api/live`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      PORTAL_BASE_URL: BASE,
      APP_ENV: "development",
      AUTH_PROVIDER: "mock",
      MOCK_AUTH_ENABLED: "true",
      APP_URL_ALLOWED_HOSTS: "*.kinra.example",
      APP_URL_ALLOW_HTTP: "false",
      SESSION_SECRET: process.env.SESSION_SECRET ?? "",
    },
  },
});
