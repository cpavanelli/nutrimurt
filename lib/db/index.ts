import { neon, Pool } from "@neondatabase/serverless";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleTransactional } from "drizzle-orm/neon-serverless";
import type {
  PgDatabase,
  PgQueryResultHKT,
  PgTransaction,
} from "drizzle-orm/pg-core";

import * as schema from "./schema";

type Schema = typeof schema;
type Relations = ExtractTablesWithRelations<Schema>;

/**
 * Driver-agnostic view of the database. Production resolves this to Neon's
 * HTTP driver; the integration tests resolve it to node-postgres against a
 * local Postgres container. Route handlers only ever see this type.
 */
export type Database = PgDatabase<PgQueryResultHKT, Schema, Relations>;
export type Transaction = PgTransaction<PgQueryResultHKT, Schema, Relations>;

export interface DatabaseProvider {
  db: Database;
  transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T>;
}

let provider: DatabaseProvider | undefined;

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Neon.");
  }

  return databaseUrl;
}

/**
 * `getDb()` speaks Neon's HTTP protocol, which has no interactive
 * transactions — each statement commits on its own. That is fine for the
 * single-statement writes, but the questionnaire and question editors delete
 * rows and re-insert replacements in sequence, which the .NET original did in
 * one `SaveChangesAsync`. Without a transaction a failure part-way through
 * leaves a questionnaire whose questions were deleted and never replaced.
 *
 * The WebSocket driver does support transactions, so mutations that need one
 * open a short-lived pool rather than paying the handshake on every read.
 */
function createNeonProvider(): DatabaseProvider {
  return {
    db: drizzle(neon(requireDatabaseUrl()), { schema }) as unknown as Database,
    async transaction(run) {
      const pool = new Pool({ connectionString: requireDatabaseUrl() });

      try {
        return await drizzleTransactional(pool, { schema }).transaction(
          run as never,
        );
      } finally {
        await pool.end();
      }
    },
  };
}

/**
 * Swaps the database out from under the route handlers. Tests call this to
 * point at a local Postgres; passing `undefined` restores the Neon default.
 */
export function setDatabaseProvider(next: DatabaseProvider | undefined) {
  provider = next;
}

/**
 * Resolves the provider on first use. Importing route modules therefore
 * remains safe during builds that do not have DATABASE_URL configured.
 */
function getProvider(): DatabaseProvider {
  provider ??= createNeonProvider();
  return provider;
}

export function getDb(): Database {
  return getProvider().db;
}

/** Runs a multi-statement write atomically. See `createNeonProvider`. */
export function withTransaction<T>(
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return getProvider().transaction(run);
}
