import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { scriptDatabaseUrl, scriptSqlOptions } from "./_env";

async function main() {
  const sql = postgres(scriptDatabaseUrl(), scriptSqlOptions(scriptDatabaseUrl()));
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrasi selesai.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
