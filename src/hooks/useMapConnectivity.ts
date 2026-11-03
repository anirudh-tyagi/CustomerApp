import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { onMapNetworkError } from '../services/mapLogging';
import { logger } from '../utils/logger';

export type MapConnectivity = 'ok' | 'offline' | 'styleUnavailable';

/** Re-check interval while degraded (banner shown). */
export const PROBE_INTERVAL_MS = 5000;
/**
 * Heartbeat while healthy. Needed because MapLibre pauses its own requests
 * when Android reports no network, so going offline produces no tile errors
 * to react to. One HEAD request (headers only) per interval.
 */
export const HEALTHY_PROBE_INTERVAL_MS = 15000;
const PROBE_TIMEOUT_MS = 6000;

/**
 * One request to the style URL: 'ok' (2xx), 'styleUnavailable' (server
 * answered with an error) or 'offline' (no answer / timeout).
 */
export async function probeStyle(
  url: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<MapConnectivity> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { method: 'HEAD', signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    return res.ok ? 'ok' : 'styleUnavailable';
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tracks whether map tiles can load. Becomes non-ok when MapLibre reports a
 * network/style failure (confirmed by a probe), then re-probes every 5 s and
 * returns to 'ok' when the style server answers again. Customer pins come
 * from the local DB and are unaffected.
 */
export function useMapConnectivity(styleUrl: string): {
  status: MapConnectivity;
  /** Call when the map reports a load failure. */
  reportFailure: () => void;
} {
  const [status, setStatus] = useState<MapConnectivity>('ok');
  const inFlight = useRef(false);
  const alive = useRef(true);

  const check = useCallback(async (afterMapFailure = false) => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    let result = await probeStyle(styleUrl);
    inFlight.current = false;
    // The map itself just failed: don't flip straight back to 'ok' even if the
    // server answers; the next scheduled probe decides (avoids a reload loop).
    if (afterMapFailure && result === 'ok') {
      result = 'styleUnavailable';
    }
    if (alive.current) {
      setStatus(prev => {
        if (prev !== result) {
          logger.info('map connectivity', { status: result });
        }
        return result;
      });
    }
  }, [styleUrl]);

  useEffect(() => {
    alive.current = true;
    // One probe when the map opens, so a cold start offline is noticed at once
    // (MapLibre just waits for the network; it never reports a failure).
    check();
    const unsubscribe = onMapNetworkError(() => {
      check();
    });
    return () => {
      alive.current = false;
      unsubscribe();
    };
  }, [check]);

  // Probe on an interval: fast while degraded (so the banner clears soon after
  // the network returns), slow heartbeat while healthy (to notice going
  // offline). Paused while the app is in the background.
  // AppState can be null/'unknown' early on: only treat explicit background
  // (or iOS 'inactive') as paused.
  const isActive = (s: string | null | undefined) => s !== 'background' && s !== 'inactive';
  const [appActive, setAppActive] = useState(isActive(AppState.currentState));
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      const active = isActive(next);
      setAppActive(active);
      if (active) {
        check();
      }
    });
    return () => sub.remove();
  }, [check]);

  useEffect(() => {
    if (!appActive) {
      return;
    }
    const id = setInterval(() => check(), status === 'ok' ? HEALTHY_PROBE_INTERVAL_MS : PROBE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, check, appActive]);

  const reportFailure = useCallback(() => {
    check(true);
  }, [check]);

  return { status, reportFailure };
}
