/* global jest */
// Official react-native-safe-area-context Jest mock (provides insets/frame).
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Official clipboard Jest mock.
jest.mock('@react-native-clipboard/clipboard', () =>
  require('@react-native-clipboard/clipboard/jest/clipboard-mock'),
);
