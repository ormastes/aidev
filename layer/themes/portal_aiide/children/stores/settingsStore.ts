import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showMinimap: boolean;
  showLineNumbers: boolean;
  showContextPanel: boolean;
  enableTelemetry: boolean;
  enableCollaboration: boolean;
  defaultProvider: string;
  maxTokens: number;
  temperature: number;
}

interface SettingsState {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  autoSave: true,
  autoSaveInterval: 30000,
  showMinimap: true,
  showLineNumbers: true,
  showContextPanel: false,
  enableTelemetry: false,
  enableCollaboration: false,
  defaultProvider: 'claude',
  maxTokens: 4096,
  temperature: 0.7,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'aiide-settings',
    }
  )
);
