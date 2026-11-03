import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** All stack routes. Add a route here when adding a new Home tile. */
export type RootStackParamList = {
  Home: undefined;
  CustomerMap: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/** Routes that take no params (tiles can only target these). */
export type ParamlessRoute = {
  [K in keyof RootStackParamList]: RootStackParamList[K] extends undefined ? K : never;
}[keyof RootStackParamList];
