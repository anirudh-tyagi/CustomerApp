/**
 * Customer data configuration.
 *
 * The DB is bundled from data/db/custom/<DB_FILENAME>. To use your own data,
 * replace that file (same name, same schema) and rebuild. No code change needed.
 */
export const DB_FILENAME = 'customers.db';
export const CUSTOMERS_TABLE = 'customers';

/** Columns the app reads. Extra columns in the DB are ignored. */
export const REQUIRED_COLUMNS = [
  'id',
  'name',
  'address',
  'phone',
  'latitude',
  'longitude',
] as const;

/**
 * Rough India bounding box used to reject bad coordinates.
 * Coordinate order everywhere in the DB is (latitude, longitude).
 */
export const INDIA_COORD_BOUNDS = {
  minLat: 6.0,
  maxLat: 37.5,
  minLng: 68.0,
  maxLng: 98.0,
} as const;
