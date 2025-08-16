import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '@types/navigation';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['aidev://', 'https://aidev.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      Main: {
        screens: {
          Home: 'home',
          Profile: 'profile/:userId?',
          Settings: 'settings',
        },
      },
      Modal: 'modal/:id',
    },
  },
};