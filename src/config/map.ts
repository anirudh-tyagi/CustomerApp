/**
 * Map configuration. Swap MAP_STYLE_URL to change the basemap; nothing else
 * in the app references a tile or style URL.
 *
 * Default: OpenFreeMap "Liberty" (https://openfreemap.org). Free, no API key,
 * no registration, commercial use allowed. Attribution is required and is
 * rendered automatically by MapLibre from the style's source metadata, so
 * keep `attribution` enabled on the map.
 *
 * Do NOT point this at tile.openstreetmap.org (OSMF tile usage policy).
 */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** [west, south, east, north] framing all of India. */
export const INDIA_BOUNDS: [number, number, number, number] = [
  68.0, 6.5, 97.5, 37.5,
];

/** Pixel padding applied when fitting INDIA_BOUNDS. */
export const INDIA_BOUNDS_PADDING = { top: 24, right: 16, bottom: 24, left: 16 };

export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 18;

/** Clustering: points merge within this pixel radius up to CLUSTER_MAX_ZOOM. */
export const CLUSTER_RADIUS = 50;
export const CLUSTER_MAX_ZOOM = 14;

/** Pin / cluster colours (kept here so a restyle is one edit). */
export const MAP_COLORS = {
  pin: '#0F4C81',
  pinStroke: '#FFFFFF',
  selected: '#F59E0B',
  clusterSmall: '#0284C7',
  clusterMedium: '#3B82F6',
  clusterLarge: '#2563EB',
  clusterHuge: '#4F46E5',
  clusterMax: '#4338CA',
  clusterText: '#FFFFFF',
} as const;

/** Font for cluster count labels. Must exist on the style's glyph server. */
export const CLUSTER_LABEL_FONT = ['Noto Sans Bold'];

/**
 * Used only when MAP_STYLE_URL cannot be loaded at all (offline on first run,
 * or a broken style URL): a plain background so the customer pins (local
 * data) still render. Fully local: no sources, no glyphs (the cluster count
 * label layer is not rendered in fallback mode).
 */
export const FALLBACK_STYLE = {
  version: 8 as const,
  name: 'offline-fallback',
  sources: {},
  layers: [{ id: 'background', type: 'background' as const, paint: { 'background-color': '#E8EDF2' } }],
};
