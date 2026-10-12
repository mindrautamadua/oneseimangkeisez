import { execSync } from "node:child_process";

export default function globalSetup() {
  execSync("pnpm -s tsx scripts/reset.ts && pnpm -s tsx scripts/migrate.ts && pnpm -s tsx scripts/seed.ts", {
    env: { ...process.env, ONEKINRA_TARGET: "test" },
    stdio: "inherit",
  });
}
