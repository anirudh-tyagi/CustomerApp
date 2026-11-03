/** Primary key as stored in the DB (INTEGER or TEXT). */
export type CustomerId = number | string;

/** A customer row that passed validation and can be placed on the map. */
export interface Customer {
  id: CustomerId;
  /** null when the DB value is empty; UI shows "Not available". */
  name: string | null;
  address: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
}

/** Why a row was left off the map. Only these reasons cause a skip. */
export type SkipReason =
  | 'missingId'
  | 'duplicateId'
  | 'missingCoordinates'
  | 'nonNumericCoordinates'
  | 'zeroCoordinates'
  | 'swappedCoordinates'
  | 'outsideIndia';

export type SkipCounts = Record<SkipReason, number>;

/** Rows that are shown but have incomplete details. */
export interface IncompleteCounts {
  missingName: number;
  missingAddress: number;
  missingPhone: number;
}

export interface CustomerLoadResult {
  customers: Customer[];
  /** Rows read from the table. */
  totalRows: number;
  skipped: SkipCounts;
  skippedTotal: number;
  incomplete: IncompleteCounts;
  /** Time spent querying + validating, in ms. */
  loadMs: number;
}
