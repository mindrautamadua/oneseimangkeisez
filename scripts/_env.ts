import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

/** Scripts target TEST_DATABASE_URL when ONEKINRA_TARGET=test. */
export function scriptDatabaseUrl(): string {
  const url =
    process.env.ONEKINRA_TARGET === "test" ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL / TEST_DATABASE_URL belum diatur.");
  return url;
}

/** Supabase transaction pooler (port 6543) does not support prepared statements. */
export function scriptSqlOptions(url: string) {
  return { max: 1, onnotice: () => {}, prepare: !/:6543\//.test(url) };
}
