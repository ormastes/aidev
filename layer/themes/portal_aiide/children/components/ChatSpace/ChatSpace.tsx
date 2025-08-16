/**
 * ChatSpace Component
 * Main chat interface supporting multiple LLM providers
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, Button, Dropdown, Space, Input, Spin, message } from 'antd';
import {
  PlusOutlined,
  CloseOutlined,
  SettingOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { ChatSession, ChatMessage, LLMProvider, ContextItem } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { MessageList } from './MessageList';
import { ProviderSelector } from './ProviderSelector';
import { ContextPanel } from './ContextPanel';
import './ChatSpace.css';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface ChatSpaceProps {
  className?: string;
  onFileRequest?: (path: string) => void;
}

export const ChatSpace: React.FC<ChatSpaceProps> = ({ className, onFileRequest }) => {
  const {
    sessions,
    activeSessionId,
    providers,
    createSession,
    deleteSession,
    setActiveSession,
    sendMessage,
    updateSession
  } = useChatStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const inputRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // Handle creating new chat session
  const handleNewChat = useCallback((provider?: LLMProvider) => {
    const defaultProvider = provider || providers[0];
    const sessionId = createSession({
      title: `New Chat ${sessions.length + 1}`,
      provider: defaultProvider
    });
    setActiveSession(sessionId);
  }, [createSession, providers, sessions.length, setActiveSession]);

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || !activeSession || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setInput('');
    setIsLoading(true);

    try {
      await sendMessage(activeSession.id, userMessage);
      
      // Focus back on input after sending
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      message.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [input, activeSession, isLoading, sendMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file drop for context
  const handleFileDrop = useCallback((files: FileList) => {
    if (!activeSession) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const contextItem: ContextItem = {
          id: `ctx-${Date.now()}-${file.name}`,
          type: 'file',
          name: file.name,
          content: content
        };
        
        updateSession(activeSession.id, {
          context: [...activeSession.context, contextItem]
        });
      };
      reader.readAsText(file);
    });
  }, [activeSession, updateSession]);

  // Handle tab operations
  const handleTabEdit = (targetKey: any, action: 'add' | 'remove') => {
    if (action === 'add') {
      handleNewChat();
    } else if (action === 'remove') {
      deleteSession(targetKey as string);
    }
  };

  // Handle provider change
  const handleProviderChange = (provider: LLMProvider) => {
    if (!activeSession) return;
    updateSession(activeSession.id, { provider });
  };

  // Export chat as markdown
  const handleExportChat = () => {
    if (!activeSession) return;

    const markdown = activeSession.messages
      .map(msg => `**${msg.role === 'user' ? 'User' : "Assistant"}**: ${msg.content}`)
      .join('\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSession.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy chat to clipboard
  const handleCopyChat = () => {
    if (!activeSession) return;

    const text = activeSession.messages
      .map(msg => `${msg.role === 'user' ? 'User' : "Assistant"}: ${msg.content}`)
      .join('\n\n');

    navigator.clipboard.writeText(text);
    message.success('Chat copied to clipboard');
  };

  const chatActions = [
    {
      key: 'export',
      label: 'Export as Markdown',
      icon: <DownloadOutlined />,
      onClick: handleExportChat
    },
    {
      key: 'copy',
      label: 'Copy to Clipboard',
      icon: <CopyOutlined />,
      onClick: handleCopyChat
    }
  ];

  return (
    <div className={`chat-space ${className || ''}`}>
      <Tabs
        type="editable-card"
        activeKey={activeSessionId || undefined}
        onChange={setActiveSession}
        onEdit={handleTabEdit}
        tabBarExtraContent={{
          right: (
            <Space>
              <ProviderSelector
                providers={providers}
                currentProvider={activeSession?.provider}
                onChange={handleProviderChange}
              />
              <Dropdown menu={{ items: chatActions }}>
                <Button icon={<SettingOutlined />} />
              </Dropdown>
              <Button
                icon={showContext ? <CloseOutlined /> : <PaperClipOutlined />}
                onClick={() => setShowContext(!showContext)}
                type={showContext ? 'primary' : 'default'}
              />
            </Space>
          )
        }}
      >
        {sessions.map(session => (
          <TabPane
            tab={
              <span>
                <RobotOutlined />
                {session.title}
              </span>
            }
            key={session.id}
            closable
          >
            <div className="chat-container">
              <div className="messages-area">
                <MessageList
                  messages={session.messages}
                  isLoading={isLoading && session.id === activeSessionId}
                />
                <div ref={messagesEndRef} />
              </div>

              {showContext && (
                <ContextPanel
                  context={session.context}
                  onAdd={(item) => updateSession(session.id, {
                    context: [...session.context, item]
                  })}
                  onRemove={(itemId) => updateSession(session.id, {
                    context: session.context.filter(c => c.id !== itemId)
                  })}
                  onFileDrop={handleFileDrop}
                />
              )}

              <div className="input-area">
                <TextArea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${session.provider.name}...`}
                  autoSize={{ minRows: 2, maxRows: 10 }}
                  disabled={isLoading}
                />
                <div className="input-actions">
                  <Button
                    icon={<PaperClipOutlined />}
                    onClick={() => setShowContext(!showContext)}
                  >
                    {session.context.length > 0 ? `${session.context.length} files` : 'Add context'}
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    loading={isLoading}
                    disabled={!input.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </TabPane>
        ))}
      </Tabs>

      {sessions.length === 0 && (
        <div className="empty-state">
          <RobotOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <h3>No active chats</h3>
          <p>Start a new chat with your preferred AI provider</p>
          <Space>
            {providers.map(provider => (
              <Button
                key={provider.id}
                onClick={() => handleNewChat(provider)}
                icon={<PlusOutlined />}
              >
                New {provider.name} Chat
              </Button>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
};