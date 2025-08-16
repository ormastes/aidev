/// <reference types="react" />
/// <reference types="react-native" />

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'react-native-config' {
  export interface NativeConfig {
    API_URL?: string;
    ENV?: string;
    VERSION?: string;
    BUILD_NUMBER?: string;
    SENTRY_DSN?: string;
    ANALYTICS_KEY?: string;
    [key: string]: string | undefined;
  }

  export const Config: NativeConfig;
  export default Config;
}

// Extend global namespace for custom utilities
declare global {
  const mockConsole: () => void;
  
  interface Window {
    __DEV__: boolean;
  }
}

// Make sure this is treated as a module
export {};