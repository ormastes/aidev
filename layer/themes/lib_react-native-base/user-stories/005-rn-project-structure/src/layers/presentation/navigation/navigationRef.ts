import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  ...args: RouteName extends unknown
    ? undefined extends RootStackParamList[RouteName]
      ? [screen: RouteName] | [screen: RouteName, params: RootStackParamList[RouteName]]
      : [screen: RouteName, params: RootStackParamList[RouteName]]
    : never
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error - TypeScript has issues with spread args
    navigationRef.navigate(...args);
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export function resetRoot(
  state?: Parameters<typeof navigationRef.resetRoot>[0]
) {
  if (navigationRef.isReady()) {
    navigationRef.resetRoot(state);
  }
}