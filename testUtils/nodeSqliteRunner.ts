import { DatabaseSync } from 'node:sqlite';

import type { QueryRunner } from '../src/database/customerRepository';

/**
 * Test-only QueryRunner over Node's built-in SQLite, so the repository runs
 * against real .db files. Types map like op-sqlite: REAL->number,
 * TEXT->string, NULL->null.
 */
export function openNodeSqlite(path: string): { runner: QueryRunner; close: () => void } {
  const db = new DatabaseSync(path, { readOnly: true });
  return {
    runner: {
      async query(sql: string) {
        return db.prepare(sql).all() as Array<Record<string, unknown>>;
      },
    },
    close: () => db.close(),
  };
}
