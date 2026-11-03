import type { Customer } from '../types/customer';

export type CustomerFeatureProps = { idx: number };

/**
 * Customers -> GeoJSON points. Properties hold only the array index, so no
 * customer details are copied into the native map layer.
 */
export function customersToFeatureCollection(
  customers: readonly Customer[],
): GeoJSON.FeatureCollection<GeoJSON.Point, CustomerFeatureProps> {
  return {
    type: 'FeatureCollection',
    features: customers.map((c, idx) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
      properties: { idx },
    })),
  };
}

export function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}
