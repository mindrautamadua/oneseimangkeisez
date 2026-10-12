import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __onekinraDb?: { db: Db; sql: postgres.Sql } };

function create() {
  const url = env().DATABASE_URL;
  // Supabase transaction pooler (port 6543) does not support prepared statements.
  const transactionPooler = /:6543\//.test(url);
  // Serverless (Vercel) runs many short-lived instances: keep each pool small so the
  // Supabase pooler's client limit is not exhausted.
  const max = process.env.VERCEL ? 3 : 10;
  const sql = postgres(url, { max, idle_timeout: 30, connect_timeout: 10, prepare: !transactionPooler });
  return { db: drizzle(sql, { schema }), sql };
}

/** Singleton database handle (survives Next.js dev hot reloads). */
export function getDb(): Db {
  globalForDb.__onekinraDb ??= create();
  return globalForDb.__onekinraDb.db;
}

export async function pingDb(): Promise<boolean> {
  try {
    globalForDb.__onekinraDb ??= create();
    await globalForDb.__onekinraDb.sql`select 1`;
    return true;
  } catch {
    return false;
  }
}
