import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';

import { DataStatusChip } from '../src/components/DataStatusChip';
import type { CustomerLoadResult } from '../src/types/customer';
import { emptySkipCounts } from '../src/utils/validation';

const empty = (skippedTotal: number): CustomerLoadResult => ({
  customers: [],
  totalRows: skippedTotal,
  skipped: emptySkipCounts(),
  skippedTotal,
  incomplete: { missingName: 0, missingAddress: 0, missingPhone: 0 },
  loadMs: 1,
});

async function chipText(data: CustomerLoadResult): Promise<string> {
  let r!: Renderer;
  await act(async () => {
    r = ReactTestRenderer.create(<DataStatusChip state={{ status: 'ready', data }} onRetry={() => {}} />);
  });
  return r.root.findAllByType(Text).map(t => [t.props.children].flat().join('')).join(' ');
}

test('empty table shows a friendly message', async () => {
  expect(await chipText(empty(0))).toBe('No customers in the database yet');
});
test('all rows invalid explains why nothing is shown', async () => {
  expect(await chipText(empty(12))).toBe('No customers to show · all 12 rows have invalid locations');
});
