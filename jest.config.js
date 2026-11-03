module.exports = {
  preset: 'react-native',
  // Transform ESM packages that ship untranspiled code.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|standard-navigation)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
