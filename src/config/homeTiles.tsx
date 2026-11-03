import React from 'react';

import { CustomerCountStatus } from '../components/CustomerCountStatus';
import { MapPinIcon } from '../components/icons/MapPinIcon';
import type { ParamlessRoute } from '../navigation/types';

export interface HomeTileConfig {
  key: string;
  title: string;
  route: ParamlessRoute;
  accentColor: string;
  icon: React.ReactNode;
  /** Component rendered under the title (count, status...). Optional. */
  Status?: React.ComponentType;
  accessibilityHint?: string;
}

/**
 * Home screen tiles, in display order. To add a feature: add its route to
 * RootStackParamList, register the screen in RootNavigator, add an entry here.
 */
export const HOME_TILES: HomeTileConfig[] = [
  {
    key: 'customer-map',
    title: 'Customer Map',
    route: 'CustomerMap',
    accentColor: '#0F4C81',
    icon: <MapPinIcon size={28} />,
    Status: CustomerCountStatus,
    accessibilityHint: 'Opens a map of all customers',
  },
];
