/**
 * Terminal Component - Integrated terminal for running commands
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { Button, Space, Select, Tooltip } from 'antd';
import {
  CloseOutlined,
  ClearOutlined,
  SearchOutlined,
  PlusOutlined,
  SettingOutlined
} from '@ant-design/icons';
import 'xterm/css/xterm.css';
import './Terminal.css';

interface TerminalTab {
  id: string;
  title: string;
  terminal: XTerm;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  socket?: WebSocket;
}

interface TerminalProps {
  onClose?: () => void;
  initialCommand?: string;
  workingDirectory?: string;
  theme?: 'light' | 'dark';
}

export const Terminal: React.FC<TerminalProps> = ({
  onClose,
  initialCommand,
  workingDirectory = process.cwd(),
  theme = 'dark'
}) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Terminal theme configurations
  const terminalThemes = {
    dark: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      selection: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    light: {
      background: '#ffffff',
      foreground: '#333333',
      cursor: '#333333',
      selection: '#add6ff',
      black: '#000000',
      red: '#cd3131',
      green: '#00bc00',
      yellow: '#949800',
      blue: '#0451a5',
      magenta: '#bc05bc',
      cyan: '#0598bc',
      white: '#555555',
      brightBlack: '#666666',
      brightRed: '#cd3131',
      brightGreen: '#14ce14',
      brightYellow: '#b5ba00',
      brightBlue: '#0451a5',
      brightMagenta: '#bc05bc',
      brightCyan: '#0598bc',
      brightWhite: '#a5a5a5'
    }
  };

  // Create new terminal tab
  const createTerminalTab = () => {
    const tabId = `terminal-${Date.now()}`;
    const terminal = new XTerm({
      fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize: 14,
      theme: terminalThemes[theme],
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      tabStopWidth: 4,
      bellStyle: 'sound',
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      allowTransparency: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);

    const newTab: TerminalTab = {
      id: tabId,
      title: `Terminal ${tabs.length + 1}`,
      terminal,
      fitAddon,
      searchAddon
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);

    return newTab;
  };

  // Initialize WebSocket connection for terminal
  const initializeTerminalConnection = (tab: TerminalTab) => {
    const ws = new WebSocket(`ws://localhost:3457/terminal`);
    
    ws.onopen = () => {
      // Send initial configuration
      ws.send(JSON.stringify({
        type: 'init',
        cols: tab.terminal.cols,
        rows: tab.terminal.rows,
        cwd: workingDirectory
      }));

      // Send initial command if provided
      if (initialCommand) {
        ws.send(JSON.stringify({
          type: 'input',
          data: initialCommand + '\r'
        }));
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'output') {
        tab.terminal.write(message.data);
      }
    };

    ws.onerror = (error) => {
      console.error('Terminal WebSocket error:', error);
      tab.terminal.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
    };

    ws.onclose = () => {
      tab.terminal.write('\r\n\x1b[33mConnection closed\x1b[0m\r\n');
    };

    // Handle terminal input
    tab.terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data
        }));
      }
    });

    // Handle terminal resize
    tab.terminal.onResize((size) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: size.cols,
          rows: size.rows
        }));
      }
    });

    tab.socket = ws;
  };

  // Mount terminal to DOM
  useEffect(() => {
    if (tabs.length === 0) {
      const newTab = createTerminalTab();
      
      // Wait for next tick to ensure DOM is ready
      setTimeout(() => {
        if (terminalContainerRef.current && newTab) {
          newTab.terminal.open(terminalContainerRef.current);
          newTab.fitAddon.fit();
          initializeTerminalConnection(newTab);
        }
      }, 0);
    }

    // Handle window resize
    const handleResize = () => {
      tabs.forEach(tab => {
        if (tab.fitAddon) {
          tab.fitAddon.fit();
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Cleanup terminals
      tabs.forEach(tab => {
        if (tab.socket) {
          tab.socket.close();
        }
        tab.terminal.dispose();
      });
    };
  }, []);

  // Switch active tab
  const switchTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && terminalContainerRef.current) {
      // Clear container
      terminalContainerRef.current.innerHTML = '';
      
      // Mount selected terminal
      tab.terminal.open(terminalContainerRef.current);
      tab.fitAddon.fit();
      setActiveTabId(tabId);
    }
  };

  // Close terminal tab
  const closeTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      if (tab.socket) {
        tab.socket.close();
      }
      tab.terminal.dispose();
      
      const newTabs = tabs.filter(t => t.id !== tabId);
      setTabs(newTabs);
      
      if (activeTabId === tabId && newTabs.length > 0) {
        switchTab(newTabs[0].id);
      } else if (newTabs.length === 0 && onClose) {
        onClose();
      }
    }
  };

  // Clear terminal
  const clearTerminal = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      activeTab.terminal.clear();
    }
  };

  // Toggle search
  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (!searchVisible) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab && value) {
      activeTab.searchAddon.findNext(value, {
        regex: false,
        wholeWord: false,
        caseSensitive: false
      });
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-tabs">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`terminal-tab ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              <span className="terminal-tab-title">{tab.title}</span>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              />
            </div>
          ))}
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={() => {
              const newTab = createTerminalTab();
              setTimeout(() => {
                if (terminalContainerRef.current) {
                  terminalContainerRef.current.innerHTML = '';
                  newTab.terminal.open(terminalContainerRef.current);
                  newTab.fitAddon.fit();
                  initializeTerminalConnection(newTab);
                }
              }, 0);
            }}
          />
        </div>
        
        <Space className="terminal-actions">
          <Tooltip title="Search">
            <Button
              type="text"
              icon={<SearchOutlined />}
              onClick={toggleSearch}
            />
          </Tooltip>
          <Tooltip title="Clear">
            <Button
              type="text"
              icon={<ClearOutlined />}
              onClick={clearTerminal}
            />
          </Tooltip>
          <Tooltip title="Settings">
            <Button
              type="text"
              icon={<SettingOutlined />}
            />
          </Tooltip>
          {onClose && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
            />
          )}
        </Space>
      </div>
      
      {searchVisible && (
        <div className="terminal-search">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchVisible(false);
              }
            }}
          />
        </div>
      )}
      
      <div className="terminal-body" ref={terminalContainerRef} />
    </div>
  );
};