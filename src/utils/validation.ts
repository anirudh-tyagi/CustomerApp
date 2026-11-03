import { INDIA_COORD_BOUNDS } from '../config/data';
import type {
  Customer,
  CustomerId,
  IncompleteCounts,
  SkipCounts,
  SkipReason,
} from '../types/customer';

type ParsedNumber =
  | { kind: 'missing' }
  | { kind: 'invalid' }
  | { kind: 'ok'; value: number };

// Plain decimal only: rejects "1e3", "0x1A", "12,5", "abc".
const DECIMAL_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

export function parseCoordinate(value: unknown): ParsedNumber {
  if (value === null || value === undefined) {
    return { kind: 'missing' };
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { kind: 'ok', value }
      : { kind: 'invalid' };
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (s === '') {
      return { kind: 'missing' };
    }
    return DECIMAL_RE.test(s)
      ? { kind: 'ok', value: Number(s) }
      : { kind: 'invalid' };
  }
  return { kind: 'invalid' };
}

/** Trimmed non-empty text, or null. Numbers (e.g. phone stored as INTEGER) become strings. */
export function cleanText(value: unknown): string | null {
  if (typeof value === 'string') {
    const s = value.trim();
    return s === '' ? null : s;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function cleanId(value: unknown): CustomerId | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    return s === '' ? null : s;
  }
  return null;
}

export function isInIndia(lat: number, lng: number): boolean {
  const b = INDIA_COORD_BOUNDS;
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

export type CoordinateCheck =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: SkipReason };

/**
 * Validates a (latitude, longitude) pair. Never "fixes" data: swapped pairs
 * are detected and reported, not silently swapped back.
 */
export function validateCoordinates(
  rawLat: unknown,
  rawLng: unknown,
): CoordinateCheck {
  const lat = parseCoordinate(rawLat);
  const lng = parseCoordinate(rawLng);
  if (lat.kind === 'invalid' || lng.kind === 'invalid') {
    return { ok: false, reason: 'nonNumericCoordinates' };
  }
  if (lat.kind === 'missing' || lng.kind === 'missing') {
    return { ok: false, reason: 'missingCoordinates' };
  }
  if (lat.value === 0 && lng.value === 0) {
    return { ok: false, reason: 'zeroCoordinates' };
  }
  if (isInIndia(lat.value, lng.value)) {
    return { ok: true, latitude: lat.value, longitude: lng.value };
  }
  if (isInIndia(lng.value, lat.value)) {
    return { ok: false, reason: 'swappedCoordinates' };
  }
  return { ok: false, reason: 'outsideIndia' };
}

export type RowCheck =
  | { ok: true; customer: Customer }
  | { ok: false; reason: SkipReason };

export function validateRow(row: Record<string, unknown>): RowCheck {
  const id = cleanId(row.id);
  if (id === null) {
    return { ok: false, reason: 'missingId' };
  }
  const coords = validateCoordinates(row.latitude, row.longitude);
  if (!coords.ok) {
    return coords;
  }
  return {
    ok: true,
    customer: {
      id,
      name: cleanText(row.name),
      address: cleanText(row.address),
      phone: cleanText(row.phone),
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
  };
}

export function emptySkipCounts(): SkipCounts {
  return {
    missingId: 0,
    duplicateId: 0,
    missingCoordinates: 0,
    nonNumericCoordinates: 0,
    zeroCoordinates: 0,
    swappedCoordinates: 0,
    outsideIndia: 0,
  };
}

export interface ValidatedRows {
  customers: Customer[];
  skipped: SkipCounts;
  skippedTotal: number;
  incomplete: IncompleteCounts;
}

export function validateRows(
  rows: ReadonlyArray<Record<string, unknown>>,
): ValidatedRows {
  const customers: Customer[] = [];
  const skipped = emptySkipCounts();
  const incomplete: IncompleteCounts = {
    missingName: 0,
    missingAddress: 0,
    missingPhone: 0,
  };
  const seen = new Set<string>();
  let skippedTotal = 0;

  for (const row of rows) {
    const check = validateRow(row);
    if (!check.ok) {
      skipped[check.reason] += 1;
      skippedTotal += 1;
      continue;
    }
    const c = check.customer;
    // Key by type + value so integer 1 and text "1" are distinct ids.
    const key = `${typeof c.id}:${c.id}`;
    if (seen.has(key)) {
      skipped.duplicateId += 1;
      skippedTotal += 1;
      continue;
    }
    seen.add(key);
    if (c.name === null) {
      incomplete.missingName += 1;
    }
    if (c.address === null) {
      incomplete.missingAddress += 1;
    }
    if (c.phone === null) {
      incomplete.missingPhone += 1;
    }
    customers.push(c);
  }
  return { customers, skipped, skippedTotal, incomplete };
}
