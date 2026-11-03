import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';

import { CustomerSheet } from '../src/components/CustomerSheet';
import type { Customer } from '../src/types/customer';

const full: Customer = {
  id: 1,
  name: 'Example Test Customer',
  address: 'Main Road, Pune',
  phone: '+91 98765 43210',
  latitude: 18.5,
  longitude: 73.8,
};

function texts(r: Renderer): string[] {
  return r.root.findAllByType(Text).map(t => [t.props.children].flat().join(''));
}
function button(r: Renderer, label: string) {
  return r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}
async function render(c: Customer | null, onClose = jest.fn()) {
  let r!: Renderer;
  await act(async () => {
    r = ReactTestRenderer.create(<CustomerSheet customer={c} onClose={onClose} />);
  });
  return r;
}

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

test('renders nothing when no customer is selected', async () => {
  const r = await render(null);
  expect(r.toJSON()).toBeNull();
});

test('shows name, address and phone with all actions enabled', async () => {
  const r = await render(full);
  expect(texts(r)).toEqual(expect.arrayContaining(['Example Test Customer', 'Main Road, Pune', '+91 98765 43210']));
  expect(button(r, 'Call').props.disabled).toBe(false);
  expect(texts(r).some(t => t.includes('No phone number'))).toBe(false);
});

test('missing fields show "Not available", never null/blank; Call disabled with hint', async () => {
  const r = await render({ ...full, name: null, phone: null, address: null });
  const t = texts(r);
  expect(t.filter(x => x === 'Not available')).toHaveLength(3);
  expect(t.some(x => /null|undefined/.test(x))).toBe(false);
  expect(button(r, 'Call').props.disabled).toBe(true);
  expect(button(r, 'Copy address').props.disabled).toBe(true);
  expect(t).toContain('No phone number · No address to copy');
});

test('copy shows a brief confirmation', async () => {
  jest.useFakeTimers();
  const r = await render(full);
  await act(async () => button(r, 'Copy address').props.onPress());
  expect(texts(r)).toContain('Copied ✓');
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(texts(r)).toContain('Copy address');
  jest.useRealTimers();
});

test('close button calls onClose', async () => {
  const onClose = jest.fn();
  const r = await render(full, onClose);
  await act(async () => button(r, 'Close customer details').props.onPress());
  expect(onClose).toHaveBeenCalled();
});
