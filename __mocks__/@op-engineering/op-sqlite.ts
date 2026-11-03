/**
 * Jest manual mock: op-sqlite is a JSI native module. Repository logic is
 * tested against real .db files via node:sqlite (see __tests__/helpers).
 */
export const moveAssetsDatabase = jest.fn(async () => true);
export const open = jest.fn(() => ({
  execute: jest.fn(async () => ({ rows: [], rowsAffected: 0 })),
  close: jest.fn(),
}));
export type DB = ReturnType<typeof open>;
