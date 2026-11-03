export const NOT_AVAILABLE = 'Not available';

/** Text for display: never "null", "undefined" or blank. */
export function displayValue(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return NOT_AVAILABLE;
  }
  const s = value.trim();
  return s === '' || s.toLowerCase() === 'null' ? NOT_AVAILABLE : s;
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
