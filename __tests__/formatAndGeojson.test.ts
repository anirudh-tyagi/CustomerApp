import { displayValue, formatCoordinates, NOT_AVAILABLE } from '../src/utils/format';
import { customersToFeatureCollection } from '../src/utils/geojson';

test.each([[null], [undefined], [''], ['   '], ['null'], ['NULL']])(
  'displayValue(%p) is "Not available"',
  v => expect(displayValue(v)).toBe(NOT_AVAILABLE),
);
test('displayValue keeps real text', () => expect(displayValue(' Pune ')).toBe('Pune'));
test('formatCoordinates', () => expect(formatCoordinates(19.1, 72.83)).toBe('19.10000, 72.83000'));

test('GeoJSON uses [lng, lat] order and carries only the index', () => {
  const fc = customersToFeatureCollection([
    { id: 9, name: 'N', address: 'A', phone: 'P', latitude: 19.1, longitude: 72.8 },
  ]);
  expect(fc.features[0].geometry.coordinates).toEqual([72.8, 19.1]);
  expect(fc.features[0].properties).toEqual({ idx: 0 });
});
