import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { PROBE_INTERVAL_MS, probeStyle, useMapConnectivity, type MapConnectivity } from '../src/hooks/useMapConnectivity';
import { isCancellation } from '../src/services/mapLogging';

const ok = { ok: true } as Response;
const notFound = { ok: false, status: 404 } as Response;

describe('probeStyle', () => {
  it('classifies responses', async () => {
    expect(await probeStyle('u', jest.fn().mockResolvedValue(ok))).toBe('ok');
    expect(await probeStyle('u', jest.fn().mockResolvedValue(notFound))).toBe('styleUnavailable');
    expect(await probeStyle('u', jest.fn().mockRejectedValue(new TypeError('Network request failed')))).toBe('offline');
  });
  it('treats a hung request as offline after the timeout', async () => {
    const hang = jest.fn((_u: string, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted')))),
    ) as unknown as typeof fetch;
    expect(await probeStyle('u', hang, 20)).toBe('offline');
  });
});

test('isCancellation recognises both MapLibre wordings', () => {
  expect(isCancellation('Request failed due to a permanent error: Canceled')).toBe(true);
  expect(isCancellation('Request failed due to a permanent error: stream was reset: CANCEL')).toBe(true);
  expect(isCancellation('Request failed due to a temporary error: Unable to resolve host')).toBe(false);
});

describe('useMapConnectivity', () => {
  let status: MapConnectivity = 'ok';
  let report: () => void = () => {};
  function Probe(): null {
    const c = useMapConnectivity('https://example.invalid/style.json');
    status = c.status;
    report = c.reportFailure;
    return null;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('goes offline on a map failure and recovers when the server answers again', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(ok);
    await act(async () => {
      ReactTestRenderer.create(<Probe />);
    });
    expect(status).toBe('ok'); // probe on open: online

    fetchSpy.mockRejectedValue(new TypeError('Network request failed'));
    await act(async () => report());
    expect(status).toBe('offline');

    fetchSpy.mockResolvedValue(ok);
    await act(async () => {
      jest.advanceTimersByTime(PROBE_INTERVAL_MS);
    });
    expect(status).toBe('ok');
  });

  it('a map failure is not cleared by the immediate probe (no reload loop)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(ok);
    await act(async () => {
      ReactTestRenderer.create(<Probe />);
    });
    await act(async () => report());
    expect(status).toBe('styleUnavailable');
    await act(async () => {
      jest.advanceTimersByTime(PROBE_INTERVAL_MS);
    });
    expect(status).toBe('ok');
  });
});

test('isResourceFailure matches style/tile load errors only', () => {
  const { isResourceFailure } = require('../src/services/mapLogging');
  expect(isResourceFailure('{OnlineFileSourc}[General]: The resource `https://x/styles/y` not found')).toBe(true);
  expect(isResourceFailure('{x}[Setup]: loading style failed: HTTP status code 404')).toBe(true);
  expect(isResourceFailure('Unable to resolve host "tiles.openfreemap.org"')).toBe(true);
  expect(isResourceFailure('Failed to compile shader')).toBe(false);
});

describe('useMapConnectivity heartbeat', () => {
  let status: MapConnectivity = 'ok';
  function Probe(): null {
    status = useMapConnectivity('https://example.invalid/style.json').status;
    return null;
  }
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('notices going offline without any map error, and recovers', async () => {
    const { HEALTHY_PROBE_INTERVAL_MS } = require('../src/hooks/useMapConnectivity');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(ok);
    await act(async () => {
      ReactTestRenderer.create(<Probe />);
    });
    fetchSpy.mockRejectedValue(new TypeError('Network request failed'));
    await act(async () => {
      jest.advanceTimersByTime(HEALTHY_PROBE_INTERVAL_MS);
    });
    expect(status).toBe('offline');
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'HEAD' });
    fetchSpy.mockResolvedValue(ok);
    await act(async () => {
      jest.advanceTimersByTime(PROBE_INTERVAL_MS);
    });
    expect(status).toBe('ok');
  });
});

test('probes once as soon as the map opens (cold start offline)', async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
  let st: MapConnectivity = 'ok';
  function P(): null {
    st = useMapConnectivity('https://example.invalid/style.json').status;
    return null;
  }
  await act(async () => {
    ReactTestRenderer.create(<P />);
  });
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(st).toBe('offline');
  jest.restoreAllMocks();
});
