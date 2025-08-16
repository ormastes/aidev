import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  layout: 'ide' | 'chat' | 'split';
  sidebarCollapsed: boolean;
  contextPanelVisible: boolean;
  editorSplitRatio: number;
  chatSplitRatio: number;
  
  setLayout: (layout: 'ide' | 'chat' | 'split') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleContextPanel: () => void;
  setContextPanelVisible: (visible: boolean) => void;
  setEditorSplitRatio: (ratio: number) => void;
  setChatSplitRatio: (ratio: number) => void;
  resetLayout: () => void;
}

const DEFAULT_STATE = {
  layout: 'ide' as const,
  sidebarCollapsed: false,
  contextPanelVisible: false,
  editorSplitRatio: 0.6,
  chatSplitRatio: 0.7,
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      
      setLayout: (layout) => set({ layout }),
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      setSidebarCollapsed: (collapsed) => set({ 
        sidebarCollapsed: collapsed 
      }),
      
      toggleContextPanel: () => set((state) => ({ 
        contextPanelVisible: !state.contextPanelVisible 
      })),
      
      setContextPanelVisible: (visible) => set({ 
        contextPanelVisible: visible 
      }),
      
      setEditorSplitRatio: (ratio) => set({ 
        editorSplitRatio: ratio 
      }),
      
      setChatSplitRatio: (ratio) => set({ 
        chatSplitRatio: ratio 
      }),
      
      resetLayout: () => set(DEFAULT_STATE),
    }),
    {
      name: 'aiide-layout',
    }
  )
);
