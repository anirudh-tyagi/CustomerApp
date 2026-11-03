/**
 * Jest manual mock: MapLibre is a native view library and cannot run in Node.
 * Components render plain Views so screen logic can be tested.
 */
import React from 'react';
import { View } from 'react-native';

type Props = { children?: React.ReactNode; testID?: string };

const passthrough = (name: string) => {
  const C = ({ children, testID }: Props) => (
    <View testID={testID ?? name}>{children}</View>
  );
  C.displayName = name;
  return C;
};

export const Map = passthrough('Map');
export const Camera = passthrough('Camera');
export const GeoJSONSource = passthrough('GeoJSONSource');
export const Layer = passthrough('Layer');
export const Images = passthrough('Images');
export const LogManager = { onLog: jest.fn(), setLogLevel: jest.fn() };
