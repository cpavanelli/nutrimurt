import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

import { setDatabaseProvider, type Database } from "@/lib/db";
import * as schema from "@/lib/db/schema";

import { signInAs } from "./session";

// Route handlers reach Clerk through `requireUserId()`. Point that at the
// test session instead of a real Clerk instance.
vi.mock("@clerk/nextjs/server", async () => {
  const { currentSessionUserId } = await import("./session");
  return {
    auth: async () => ({ userId: currentSessionUserId() }),
  };
});

const connectionString =
  process.env.TEST_DATABASE_URL ??
  "postgresql://nutrimurt:nutrimurt@localhost:55432/nutrimurt_test";

let pool: Pool;

beforeAll(async () => {
  pool = new Pool({ connectionString });

  try {
    await pool.query("select 1");
  } catch (error) {
    throw new Error(
      `Could not reach the test database at ${connectionString}.\n` +
        "Start a disposable Postgres 16 database or set TEST_DATABASE_URL.\n" +
        `Original error: ${(error as Error).message}`,
    );
  }

  const db = drizzle(pool, { schema });

  // The same migrations that run against Neon, so the tests exercise the real
  // constraints — including the FK cascades the delete routes rely on.
  await migrate(db, { migrationsFolder: "drizzle" });

  setDatabaseProvider({
    db: db as unknown as Database,
    transaction: (run) => db.transaction(run as never),
  });
});

beforeEach(async () => {
  signInAs(null);

  // Reset every table the migrations created, so guardrail counts and identity
  // sequences start clean for each test.
  const { rows } = await pool.query<{ tables: string | null }>(
    `select string_agg(format('%I.%I', schemaname, tablename), ', ') as tables
       from pg_tables
      where schemaname = 'public'`,
  );

  if (rows[0]?.tables) {
    await pool.query(`truncate table ${rows[0].tables} restart identity cascade`);
  }
});

afterAll(async () => {
  setDatabaseProvider(undefined);
  await pool?.end();
});
