import { LogManager } from '@maplibre/maplibre-react-native';

import { logger } from '../utils/logger';

type Listener = () => void;
const networkErrorListeners = new Set<Listener>();
let installed = false;

/** Cancelled requests are normal while zooming; they are not network problems. */
export function isCancellation(message: string): boolean {
  return /cancel/i.test(message);
}

/** MapLibre errors that mean "a style/tile/glyph resource could not be fetched". */
export function isResourceFailure(message: string): boolean {
  return /loading style failed|not found|OnlineFileSource|failed to (load|connect)|unable to resolve host|network/i.test(
    message,
  );
}

/** Subscribe to MapLibre HTTP failures (tiles, style, glyphs). Returns unsubscribe. */
export function onMapNetworkError(listener: Listener): () => void {
  networkErrorListeners.add(listener);
  return () => networkErrorListeners.delete(listener);
}

/**
 * Routes MapLibre's tile/HTTP warnings (cancelled requests while zooming,
 * network errors) to the app logger instead of console.warn, whose dev toast
 * would cover the bottom sheet. Real network failures are also forwarded to
 * onMapNetworkError listeners (used for the offline banner). Other messages
 * keep MapLibre's default handling. Messages hold tile URLs only.
 */
export function installMapLogFilter(): void {
  if (installed) {
    return;
  }
  installed = true;
  LogManager.onLog(event => {
    if (event.tag === 'Mbgl-HttpRequest' && event.level !== 'error') {
      logger.info('map http', { level: event.level, message: event.message.slice(0, 160) });
      if (!isCancellation(event.message)) {
        networkErrorListeners.forEach(l => l());
      }
      return true;
    }
    // Style/resource load failures (e.g. style 404, offline) are handled by
    // the fallback style + banner; log them without raising a console.error.
    if (event.level === 'error' && isResourceFailure(event.message)) {
      logger.warn('map resource failed', { message: event.message.slice(0, 160) });
      networkErrorListeners.forEach(l => l());
      return true;
    }
    return false;
  });
}
