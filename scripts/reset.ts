import postgres from "postgres";
import { scriptDatabaseUrl } from "./_env";

/** Drops all portal tables. LOCAL/TEST ONLY: refuses to run when APP_ENV=production. */
async function main() {
  if (process.env.APP_ENV === "production") throw new Error("db:reset dilarang di production.");
  const url = scriptDatabaseUrl();
  if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error("db:reset hanya untuk database lokal.");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe(`DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;`);
  await sql.end();
  console.log("Database lokal dikosongkan.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
