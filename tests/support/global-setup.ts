import { execSync } from "node:child_process";

/** Prepares the isolated test database: reset, migrate, seed demo data. */
export default function setup() {
  const env = { ...process.env, ONEKINRA_TARGET: "test" };
  execSync("pnpm -s tsx scripts/reset.ts && pnpm -s tsx scripts/migrate.ts && pnpm -s tsx scripts/seed.ts", {
    env,
    stdio: "inherit",
  });
}
