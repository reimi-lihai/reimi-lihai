/**
 * Database client.
 *
 *  - DATABASE_URL (or POSTGRES_URL from the Vercel integration) set → PostgreSQL (Supabase) via postgres-js. Migrations run in
 *                         CI with `npm run db:migrate`.
 *  - DATABASE_URL unset → embedded PostgreSQL (PGlite, same SQL engine) stored in
 *                         .data/pglite (or /tmp on Vercel). Migrations + demo seed
 *                         run automatically on first use, so the admin works with
 *                         zero setup.
 */
import path from "path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __reimiDb?: Promise<Db> };

export const MIGRATIONS_DIR = path.join(process.cwd(), "src/server/db/migrations");

/**
 * Connection string: DATABASE_URL, or POSTGRES_URL which the Supabase ⇄ Vercel
 * integration sets automatically (Supavisor transaction pooler, port 6543).
 */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

export function isEmbeddedDb(): boolean {
  return !databaseUrl();
}

async function connect(): Promise<Db> {
  const url = databaseUrl();
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { prepare: false, max: 5 });
    const db = drizzle(sql, { schema });
    const { bootstrapMasterAdmin } = await import("./bootstrap");
    await bootstrapMasterAdmin(db);
    // Staging only: SEED_DEMO_DATA=true fills an EMPTY database with the demo
    // data (incl. demo admins with a public password). Never set in production.
    if (process.env.SEED_DEMO_DATA === "true") {
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
    }
    return db;
  }

  // Safety: never fall back to the demo database (public demo passwords) on the
  // live site. Set ALLOW_DEMO_DB=true only for a throwaway preview deployment.
  if (process.env.VERCEL_ENV === "production" && process.env.ALLOW_DEMO_DB !== "true") {
    throw new Error("Database not configured: set POSTGRES_URL or DATABASE_URL in Vercel (Production) and redeploy.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  const dir = process.env.VERCEL ? "/tmp/reimi-pglite" : path.join(process.cwd(), ".data/pglite");
  (await import("fs")).mkdirSync(path.dirname(dir), { recursive: true });
  const client = new PGlite(dir, { extensions: { btree_gist } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });

  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db as unknown as Db);
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!g.__reimiDb) {
    g.__reimiDb = connect().catch((e) => {
      g.__reimiDb = undefined;
      throw e;
    });
  }
  return g.__reimiDb;
}

export { schema };
