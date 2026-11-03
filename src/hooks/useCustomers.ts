import { useCallback, useEffect, useState } from 'react';

import { DataError, toDataError } from '../database/errors';
import { loadCustomers } from '../services/customerService';
import type { CustomerLoadResult } from '../types/customer';

export type CustomersState =
  | { status: 'loading' }
  | { status: 'ready'; data: CustomerLoadResult }
  | { status: 'error'; error: DataError };

export function useCustomers(): CustomersState & { retry: () => void } {
  const [state, setState] = useState<CustomersState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    loadCustomers({ refresh: attempt > 0 })
      .then(data => alive && setState({ status: 'ready', data }))
      .catch((e: unknown) => alive && setState({ status: 'error', error: toDataError(e) }));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  return { ...state, retry };
}
