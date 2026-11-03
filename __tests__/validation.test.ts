import {
  cleanId,
  cleanText,
  parseCoordinate,
  validateCoordinates,
  validateRow,
  validateRows,
} from '../src/utils/validation';

describe('parseCoordinate', () => {
  it.each([
    [19.07, { kind: 'ok', value: 19.07 }],
    ['19.07', { kind: 'ok', value: 19.07 }],
    [' -0.5 ', { kind: 'ok', value: -0.5 }],
    [null, { kind: 'missing' }],
    [undefined, { kind: 'missing' }],
    ['   ', { kind: 'missing' }],
    ['abc', { kind: 'invalid' }],
    ['1e3', { kind: 'invalid' }],
    ['0x1A', { kind: 'invalid' }],
    ['12,5', { kind: 'invalid' }],
    [NaN, { kind: 'invalid' }],
    [Infinity, { kind: 'invalid' }],
    [true, { kind: 'invalid' }],
  ])('%p -> %p', (input, expected) => {
    expect(parseCoordinate(input)).toEqual(expected);
  });
});

describe('validateCoordinates', () => {
  it('accepts a point in India (Mumbai)', () => {
    expect(validateCoordinates(19.076, 72.8777)).toEqual({
      ok: true,
      latitude: 19.076,
      longitude: 72.8777,
    });
  });
  it('accepts numeric strings', () => {
    expect(validateCoordinates('28.61', '77.21').ok).toBe(true);
  });
  it.each([
    [null, 77, 'missingCoordinates'],
    [28, null, 'missingCoordinates'],
    ['', '', 'missingCoordinates'],
    ['abc', 'xyz', 'nonNumericCoordinates'],
    [28, 'xyz', 'nonNumericCoordinates'],
    [0, 0, 'zeroCoordinates'],
    ['0', '0.0', 'zeroCoordinates'],
    [72.8777, 19.076, 'swappedCoordinates'],
    [51.5072, -0.1276, 'outsideIndia'],
    [-19, -72, 'outsideIndia'],
    [40, 77, 'outsideIndia'],
  ])('(%p, %p) -> %s', (lat, lng, reason) => {
    expect(validateCoordinates(lat, lng)).toEqual({ ok: false, reason });
  });
});

describe('field cleaning', () => {
  it('cleanText trims and nulls empties', () => {
    expect(cleanText('  A  ')).toBe('A');
    expect(cleanText('')).toBeNull();
    expect(cleanText('   ')).toBeNull();
    expect(cleanText(null)).toBeNull();
    expect(cleanText(9876543210)).toBe('9876543210');
  });
  it('cleanId accepts integer and text keys', () => {
    expect(cleanId(7)).toBe(7);
    expect(cleanId(' C-001 ')).toBe('C-001');
    expect(cleanId(null)).toBeNull();
    expect(cleanId('')).toBeNull();
  });
});

describe('validateRow / validateRows', () => {
  const good = { id: 1, name: 'A', address: 'X', phone: '+91 9', latitude: 19, longitude: 73 };

  it('keeps rows with missing name/phone/address but counts them', () => {
    const r = validateRows([
      good,
      { ...good, id: 2, name: '' },
      { ...good, id: 3, phone: null },
      { ...good, id: 4, address: '  ' },
    ]);
    expect(r.customers).toHaveLength(4);
    expect(r.skippedTotal).toBe(0);
    expect(r.incomplete).toEqual({ missingName: 1, missingAddress: 1, missingPhone: 1 });
    expect(r.customers[1].name).toBeNull();
  });

  it('skips missing ids and duplicate ids', () => {
    const r = validateRows([good, { ...good }, { ...good, id: null }, { ...good, id: '1' }]);
    // integer 1 and text "1" are different keys
    expect(r.customers.map(c => c.id)).toEqual([1, '1']);
    expect(r.skipped.duplicateId).toBe(1);
    expect(r.skipped.missingId).toBe(1);
    expect(r.skippedTotal).toBe(2);
  });

  it('never throws on garbage rows', () => {
    const rows = [{}, { id: {} }, { id: 5, latitude: [], longitude: {} }];
    expect(() => validateRows(rows as Array<Record<string, unknown>>)).not.toThrow();
    expect(validateRow({ id: 5, latitude: [], longitude: {} })).toEqual({
      ok: false,
      reason: 'nonNumericCoordinates',
    });
  });
});
