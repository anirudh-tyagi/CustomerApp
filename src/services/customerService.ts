import { getAllCustomers } from '../database/customerRepository';
import { openCustomerDb } from '../database/connection';
import { toDataError } from '../database/errors';
import type { CustomerLoadResult } from '../types/customer';
import { logger } from '../utils/logger';

let cached: Promise<CustomerLoadResult> | null = null;

/**
 * Loads customers once and shares the result across screens.
 * Pass { refresh: true } to retry after an error or reload the DB.
 */
export function loadCustomers(
  opts: { refresh?: boolean } = {},
): Promise<CustomerLoadResult> {
  if (!cached || opts.refresh) {
    cached = (async () => {
      const db = await openCustomerDb();
      const result = await getAllCustomers(db);
      logger.info('customers loaded', {
        totalRows: result.totalRows,
        shown: result.customers.length,
        skipped: result.skippedTotal,
        loadMs: result.loadMs,
      });
      return result;
    })().catch((e: unknown) => {
      const err = toDataError(e);
      logger.warn('customer load failed', { kind: err.kind, message: err.message });
      cached = null; // allow retry
      throw err;
    });
  }
  return cached;
}
