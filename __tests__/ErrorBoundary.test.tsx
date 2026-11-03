import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';

import { ErrorBoundary } from '../src/components/ErrorBoundary';

let shouldThrow = true;
function Bomb(): React.JSX.Element {
  if (shouldThrow) {
    throw new Error('forced render error');
  }
  return <Text>Recovered content</Text>;
}

function texts(r: Renderer): string[] {
  return r.root.findAllByType(Text).map(t => [t.props.children].flat().join(''));
}

beforeEach(() => {
  // React logs caught render errors via console.error; keep test output clean.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('a render error shows the friendly screen, and Try again recovers', async () => {
  shouldThrow = true;
  let r!: Renderer;
  await act(async () => {
    r = ReactTestRenderer.create(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
  });
  expect(texts(r)).toContain('Something went wrong');
  expect(texts(r)).not.toContain('Recovered content');

  shouldThrow = false;
  const retry = r.root.findAll(n => n.props.accessibilityLabel === 'Try again' && typeof n.props.onPress === 'function')[0];
  await act(async () => retry.props.onPress());
  expect(texts(r)).toContain('Recovered content');
  expect(texts(r)).not.toContain('Something went wrong');
});

test('the boundary logs only the error type, not the message', async () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  shouldThrow = true;
  await act(async () => {
    ReactTestRenderer.create(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
  });
  const logged = JSON.stringify(logSpy.mock.calls);
  expect(logged).toContain('render error caught by boundary');
  expect(logged).not.toContain('forced render error');
});
