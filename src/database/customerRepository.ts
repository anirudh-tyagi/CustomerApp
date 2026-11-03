import { CUSTOMERS_TABLE, REQUIRED_COLUMNS } from '../config/data';
import type { CustomerLoadResult } from '../types/customer';
import { validateRows } from '../utils/validation';
import { DataError, toDataError } from './errors';

/**
 * Minimal query interface so the repository does not depend on a specific
 * SQLite library (op-sqlite in the app, node:sqlite in tests).
 */
export interface QueryRunner {
  query(sql: string): Promise<Array<Record<string, unknown>>>;
}

/** Returns the names of required columns missing from the customers table. */
export async function checkSchema(db: QueryRunner): Promise<string[]> {
  const info = await db.query(`PRAGMA table_info(${CUSTOMERS_TABLE})`);
  if (info.length === 0) {
    throw new DataError(
      'schemaMismatch',
      `Table "${CUSTOMERS_TABLE}" not found`,
    );
  }
  const present = new Set(
    info.map(c => String(c.name ?? '').toLowerCase()),
  );
  return REQUIRED_COLUMNS.filter(c => !present.has(c));
}

/**
 * Loads every customer, validates it, and reports what was skipped.
 * Throws DataError (never a raw native error).
 */
export async function getAllCustomers(
  db: QueryRunner,
  now: () => number = Date.now,
): Promise<CustomerLoadResult> {
  const started = now();
  try {
    const missing = await checkSchema(db);
    if (missing.length > 0) {
      throw new DataError(
        'schemaMismatch',
        `Table "${CUSTOMERS_TABLE}" is missing column(s): ${missing.join(', ')}`,
      );
    }
    const rows = await db.query(
      `SELECT ${REQUIRED_COLUMNS.join(', ')} FROM ${CUSTOMERS_TABLE}`,
    );
    const validated = validateRows(rows);
    return {
      ...validated,
      totalRows: rows.length,
      loadMs: now() - started,
    };
  } catch (e) {
    throw toDataError(e);
  }
}
