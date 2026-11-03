import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerTintColor: '#0F4C81',
        headerTitleStyle: { color: '#111827' },
        contentStyle: { backgroundColor: '#F4F6F8' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Customer Map' }} />
      <Stack.Screen
        name="CustomerMap"
        component={MapScreen}
        options={{ title: 'Customers', headerBackTitle: 'Home' }}
      />
    </Stack.Navigator>
  );
}
