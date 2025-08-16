/**
 * AIIDE Main Application Component
 */

import React, { useEffect, useState } from 'react';
import { ConfigProvider, Layout, theme, Spin, message } from 'antd';
import { ChatSpace } from './components/ChatSpace/ChatSpace';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { CodeEditor } from './components/CodeEditor/CodeEditor';
import { Toolbar } from './components/Layout/Toolbar';
import { StatusBar } from './components/Layout/StatusBar';
import { ContextPanel } from './components/ContextPanel/ContextPanel';
import { useChatStore } from './stores/chatStore';
import { useFileStore } from './stores/fileStore';
import { useLayoutStore } from './stores/layoutStore';
import { useSettingsStore } from './stores/settingsStore';
import { DEFAULT_PROVIDERS } from '../pipe';
import Splitter from '@devbookhq/splitter';
import { FileNode } from './types';
import './AIIDEApp.css';

const { Content, Sider } = Layout;

export interface AIIDEAppProps {
  providers?: typeof DEFAULT_PROVIDERS;
  initialLayout?: 'ide' | 'chat' | 'split';
  theme?: 'light' | 'dark';
  onFileOpen?: (file: FileNode) => void;
  onReady?: () => void;
}

export const AIIDEApp: React.FC<AIIDEAppProps> = ({
  providers = DEFAULT_PROVIDERS,
  initialLayout = 'ide',
  theme: initialTheme = 'dark',
  onFileOpen,
  onReady
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [appTheme, setAppTheme] = useState(initialTheme);
  
  const { setProviders, createSession } = useChatStore();
  const { loadFileTree, openFile, activeFile } = useFileStore();
  const { layout, setLayout, sidebarCollapsed, toggleSidebar } = useLayoutStore();
  const { settings, updateSettings } = useSettingsStore();

  // Initialize app
  useEffect(() => {
    const initialize = async () => {
      try {
        // Set providers
        setProviders(providers);
        
        // Load file tree
        await loadFileTree();
        
        // Create initial chat session if none exists
        const sessions = useChatStore.getState().sessions;
        if (sessions.length === 0) {
          createSession();
        }
        
        // Set initial layout
        setLayout(initialLayout);
        
        // Update theme
        updateSettings({ theme: appTheme });
        
        setIsLoading(false);
        onReady?.();
      } catch (error) {
        console.error('Failed to initialize AIIDE:', error);
        message.error('Failed to initialize application');
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Handle file selection from explorer
  const handleFileSelect = async (file: FileNode) => {
    if (file.type === 'file') {
      await openFile(file.path);
      onFileOpen?.(file);
    }
  };

  // Handle file double-click
  const handleFileOpen = async (file: FileNode) => {
    if (file.type === 'file') {
      await openFile(file.path);
      onFileOpen?.(file);
    }
  };

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setAppTheme(newTheme);
    updateSettings({ theme: newTheme });
  };

  // Handle layout change
  const handleLayoutChange = (newLayout: 'ide' | 'chat' | 'split') => {
    setLayout(newLayout);
  };

  if (isLoading) {
    return (
      <div className="aiide-loading">
        <Spin size="large" tip="Initializing AIIDE..." />
      </div>
    );
  }

  const antTheme = {
    algorithm: appTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 4,
      fontSize: 14
    }
  };

  return (
    <ConfigProvider theme={antTheme}>
      <Layout className={`aiide-app ${appTheme}`}>
        <Toolbar
          onThemeChange={handleThemeChange}
          onLayoutChange={handleLayoutChange}
          currentTheme={appTheme}
          currentLayout={layout}
        />
        
        <Layout className="aiide-main">
          {layout !== 'chat' && (
            <Sider
              width={260}
              className="aiide-sidebar"
              collapsible
              collapsed={sidebarCollapsed}
              onCollapse={toggleSidebar}
              trigger={null}
            >
              <FileExplorer
                onFileSelect={handleFileSelect}
                onFileOpen={handleFileOpen}
                className="aiide-file-explorer"
              />
            </Sider>
          )}
          
          <Content className="aiide-content">
            {layout === 'ide' ? (
              <Splitter
                direction="horizontal"
                minWidths={[400, 400]}
                initialSizes={[60, 40]}
                className="aiide-split-pane"
              >
                <div className="aiide-editor-container">
                  <CodeEditor />
                </div>
                <div className="aiide-chat-container">
                  <ChatSpace />
                </div>
              </Splitter>
            ) : layout === 'chat' ? (
              <div className="aiide-chat-full">
                <ChatSpace />
              </div>
            ) : (
              <Splitter
                direction="vertical"
                minHeights={[200, 200]}
                initialSizes={[70, 30]}
                className="aiide-split-pane"
              >
                <div className="aiide-editor-container">
                  <CodeEditor />
                </div>
                <div className="aiide-chat-container">
                  <ChatSpace />
                </div>
              </Splitter>
            )}
          </Content>
          
          {settings.showContextPanel && (
            <Sider
              width={300}
              className="aiide-context-panel"
              theme="light"
            >
              <ContextPanel />
            </Sider>
          )}
        </Layout>
        
        <StatusBar
          activeFile={activeFile}
          theme={appTheme}
          layout={layout}
        />
      </Layout>
    </ConfigProvider>
  );
};