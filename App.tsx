/**
 * Customer Map
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ErrorBoundary>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
