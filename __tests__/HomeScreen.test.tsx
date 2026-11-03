import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { HomeScreen } from '../src/screens/HomeScreen';
import { DataError } from '../src/database/errors';
import { loadCustomers } from '../src/services/customerService';
import type { CustomerLoadResult } from '../src/types/customer';
import { emptySkipCounts } from '../src/utils/validation';

jest.mock('../src/services/customerService', () => ({ loadCustomers: jest.fn() }));
const mockLoad = loadCustomers as jest.MockedFunction<typeof loadCustomers>;

function result(n: number): CustomerLoadResult {
  return {
    customers: Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: 'X',
      address: null,
      phone: null,
      latitude: 19,
      longitude: 73,
    })),
    totalRows: n,
    skipped: emptySkipCounts(),
    skippedTotal: 0,
    incomplete: { missingName: 0, missingAddress: 0, missingPhone: 0 },
    loadMs: 1,
  };
}

const navigate = jest.fn();
type Props = React.ComponentProps<typeof HomeScreen>;
const props = { navigation: { navigate }, route: { key: 'Home', name: 'Home' } } as unknown as Props;

function texts(r: Renderer): string[] {
  return r.root.findAllByType(Text).map(t => [t.props.children].flat().join(''));
}

async function render(): Promise<Renderer> {
  let r!: Renderer;
  await act(async () => {
    r = ReactTestRenderer.create(<HomeScreen {...props} />);
  });
  return r;
}

beforeEach(() => {
  mockLoad.mockReset();
  navigate.mockReset();
});

test('shows the Customer Map tile with the loaded count', async () => {
  mockLoad.mockResolvedValue(result(1234));
  const r = await render();
  expect(texts(r)).toEqual(expect.arrayContaining(['Customer Map', '1,234 customers']));
});

test('tapping the tile navigates to the map', async () => {
  mockLoad.mockResolvedValue(result(1));
  const r = await render();
  const tile = r.root.findByProps({ accessibilityLabel: 'Customer Map' });
  await act(async () => tile.props.onPress());
  expect(navigate).toHaveBeenCalledWith('CustomerMap');
});

test('DB error shows "Data unavailable" and Retry reloads', async () => {
  mockLoad
    .mockRejectedValueOnce(new DataError('corrupt', 'file is not a database'))
    .mockResolvedValueOnce(result(500));
  const r = await render();
  expect(texts(r)).toContain('Data unavailable');

  const retry = r.root.findByProps({ accessibilityLabel: 'Retry loading customer data' });
  await act(async () => retry.props.onPress());

  expect(mockLoad).toHaveBeenLastCalledWith({ refresh: true });
  expect(texts(r)).toContain('500 customers');
  expect(texts(r)).not.toContain('Data unavailable');
});
