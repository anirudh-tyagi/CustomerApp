import { moveAssetsDatabase, open, type DB } from '@op-engineering/op-sqlite';

import { DB_FILENAME } from '../config/data';
import { DataError, toDataError } from './errors';
import type { QueryRunner } from './customerRepository';

let current: DB | null = null;

export function closeCustomerDb(): void {
  if (current) {
    try {
      current.close();
    } catch {
      // Already closed or never opened; nothing to do.
    }
    current = null;
  }
}

/**
 * Copies the bundled DB into app storage and opens it read-only.
 *
 * The copy runs with overwrite=true on every open: the data is read-only
 * in the app, so the bundled file is always the source of truth, and a
 * replacement DB shipped in a new build takes effect without a version flag.
 * (When sync/writes are added, switch to a versioned one-time copy.)
 *
 * Android: asset "custom/customers.db" -> app databases folder.
 * iOS:     bundle resource "customers.db" -> Library folder. (UNVERIFIED)
 */
export async function openCustomerDb(): Promise<QueryRunner> {
  closeCustomerDb();

  let copied = false;
  try {
    copied = await moveAssetsDatabase({ filename: DB_FILENAME, overwrite: true });
  } catch (e) {
    throw new DataError('missingFile', 'Copying bundled DB failed', { cause: e });
  }
  if (!copied) {
    throw new DataError('missingFile', 'Bundled DB asset not found or not copied');
  }

  try {
    // failOnCreate: never silently create an empty DB if the copy is missing.
    current = open({ name: DB_FILENAME, readOnly: true, failOnCreate: true });
  } catch (e) {
    throw toDataError(e);
  }

  const db = current;
  return {
    async query(sql: string) {
      const res = await db.execute(sql);
      return res.rows as Array<Record<string, unknown>>;
    },
  };
}
