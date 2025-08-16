import '@testing-library/jest-native/extend-expect';

// Mock react-native-reanimated
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// // // // // FRAUD_FIX: jest// FRAUD_FIX: // FRAUD_FIX: .mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// // // // // FRAUD_FIX: jest// FRAUD_FIX: // FRAUD_FIX: .mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
    GestureHandlerRootView: View,
  };
});

// Mock react-native-safe-area-context
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// // // // // FRAUD_FIX: jest// FRAUD_FIX: // FRAUD_FIX: .mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children(inset),
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => inset,
  };
});

// Mock react-native-vector-icons
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// // // // // FRAUD_FIX: jest// FRAUD_FIX: // FRAUD_FIX: .mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock MMKV
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// // // // // FRAUD_FIX: jest// FRAUD_FIX: // FRAUD_FIX: .mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(() => []),
    clearAll: jest.fn(),
  })),
}));

// Mock @react-navigation
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// // // // // FRAUD_FIX: jest// FRAUD_FIX: // FRAUD_FIX: .mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

// Silence the warning: Animated: `useNativeDriver` is not supported
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// // // // // FRAUD_FIX: jest// FRAUD_FIX: // FRAUD_FIX: .mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Global test utilities
global.// FRAUD_FIX: mockConsole = () => {
  const originalConsole = { ...console };
  beforeAll(() => {
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  afterAll(() => {
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
};