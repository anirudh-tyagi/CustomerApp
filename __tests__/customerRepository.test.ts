import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { getAllCustomers, type QueryRunner } from '../src/database/customerRepository';
import { DataError, toDataError } from '../src/database/errors';
import { isInIndia } from '../src/utils/validation';
import { openNodeSqlite } from '../testUtils/nodeSqliteRunner';

const FIXTURES = path.join(__dirname, '..', 'data', 'fixtures');
const BUNDLED = path.join(__dirname, '..', 'data', 'db', 'custom', 'customers.db');

let tmp: string;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'custmap-'));
});
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function loadFile(file: string) {
  const { runner, close } = openNodeSqlite(file);
  try {
    return await getAllCustomers(runner);
  } finally {
    close();
  }
}

function makeDb(name: string, sql: string): string {
  const p = path.join(tmp, name);
  const db = new DatabaseSync(p);
  db.exec(sql);
  db.close();
  return p;
}

const SCHEMA = `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  address TEXT, phone TEXT, latitude REAL, longitude REAL);`;

describe('getAllCustomers on supplied demo DBs', () => {
  it('bundled asset: 500 rows, all valid, all inside India', async () => {
    const r = await loadFile(BUNDLED);
    expect(r.totalRows).toBe(500);
    expect(r.customers).toHaveLength(500);
    expect(r.skippedTotal).toBe(0);
    expect(r.customers.every(c => isInIndia(c.latitude, c.longitude))).toBe(true);
    expect(r.incomplete).toEqual({ missingName: 0, missingAddress: 0, missingPhone: 0 });
  });

  it('bad-rows DB: skips exactly the 7 bad-coordinate rows, keeps incomplete ones', async () => {
    const r = await loadFile(path.join(FIXTURES, 'customers_test_bad_rows.db'));
    expect(r.totalRows).toBe(500);
    expect(r.customers).toHaveLength(493);
    expect(r.skippedTotal).toBe(7);
    expect(r.skipped).toEqual({
      missingId: 0,
      duplicateId: 0,
      missingCoordinates: 2,
      nonNumericCoordinates: 1,
      zeroCoordinates: 2,
      swappedCoordinates: 1,
      outsideIndia: 1,
    });
    expect(r.incomplete).toEqual({ missingName: 1, missingAddress: 1, missingPhone: 1 });
  });

  const stress = path.join(FIXTURES, 'customers_10000.db');
  (fs.existsSync(stress) ? it : it.skip)('10,000-row DB loads (npm run db:stress first)', async () => {
    const r = await loadFile(stress);
    expect(r.customers).toHaveLength(10000);
    expect(r.skippedTotal).toBe(0);
  });
});

describe('getAllCustomers error handling', () => {
  it('empty table -> zero customers, no error', async () => {
    const r = await loadFile(makeDb('empty.db', SCHEMA));
    expect(r.totalRows).toBe(0);
    expect(r.customers).toEqual([]);
  });

  it('missing table -> schemaMismatch', async () => {
    const p = makeDb('notable.db', 'CREATE TABLE other (x INTEGER);');
    await expect(loadFile(p)).rejects.toMatchObject({ kind: 'schemaMismatch' });
  });

  it('missing column -> schemaMismatch naming the column', async () => {
    const p = makeDb(
      'nophone.db',
      'CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, address TEXT, latitude REAL, longitude REAL);',
    );
    await expect(loadFile(p)).rejects.toMatchObject({
      kind: 'schemaMismatch',
      message: expect.stringContaining('phone'),
    });
  });

  it('extra columns and TEXT ids are accepted', async () => {
    const p = makeDb(
      'textid.db',
      `CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT, address TEXT, phone TEXT,
        latitude REAL, longitude REAL, region TEXT);
       INSERT INTO customers VALUES ('C-1','A','X','1',19.07,72.88,'W');`,
    );
    const r = await loadFile(p);
    expect(r.customers).toHaveLength(1);
    expect(r.customers[0].id).toBe('C-1');
  });

  it('corrupt file -> corrupt', async () => {
    const p = path.join(tmp, 'corrupt.db');
    fs.writeFileSync(p, Buffer.alloc(8192, 0x5a));
    let caught: unknown;
    try {
      await loadFile(p);
    } catch (e) {
      caught = toDataError(e);
    }
    expect(caught).toBeInstanceOf(DataError);
    expect((caught as DataError).kind).toBe('corrupt');
  });

  it('truncated real DB -> corrupt', async () => {
    const p = path.join(tmp, 'truncated.db');
    fs.writeFileSync(p, fs.readFileSync(BUNDLED).subarray(0, 20000));
    await expect(loadFile(p)).rejects.toMatchObject({ kind: 'corrupt' });
  });

  it('missing file -> missingFile', () => {
    let caught: unknown;
    try {
      openNodeSqlite(path.join(tmp, 'does-not-exist.db'));
    } catch (e) {
      caught = toDataError(e);
    }
    expect((caught as DataError).kind).toBe('missingFile');
  });

  it('wraps unexpected runner errors as DataError', async () => {
    const runner: QueryRunner = {
      query: async () => {
        throw new Error('disk I/O error');
      },
    };
    await expect(getAllCustomers(runner)).rejects.toMatchObject({
      name: 'DataError',
      kind: 'unreadable',
    });
  });

  it('reports load time', async () => {
    let t = 1000;
    const runner: QueryRunner = {
      query: async sql =>
        sql.startsWith('PRAGMA')
          ? ['id', 'name', 'address', 'phone', 'latitude', 'longitude'].map(name => ({ name }))
          : [],
    };
    const r = await getAllCustomers(runner, () => (t += 25));
    expect(r.loadMs).toBe(25);
  });
});
