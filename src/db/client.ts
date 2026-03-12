import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
});

let schemaInitPromise: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (!schemaInitPromise) {
    const schemaSql = readFileSync(join(process.cwd(), 'src/db/schema.sql'), 'utf8');
    schemaInitPromise = pool.query(schemaSql).then(() => undefined).catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }

  await schemaInitPromise;
}
