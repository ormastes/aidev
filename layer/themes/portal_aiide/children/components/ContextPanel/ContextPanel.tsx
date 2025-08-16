import React from 'react';
import { Tabs, List, Tag, Empty } from 'antd';
import { FileOutlined, CodeOutlined, HistoryOutlined } from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import { useFileStore } from '../../stores/fileStore';
import './ContextPanel.css';

export const ContextPanel: React.FC = () => {
  const { activeSessionId, sessions } = useChatStore();
  const { openFiles, recentFiles } = useFileStore();
  
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const contextItems = activeSession?.context || [];

  const items = [
    {
      key: 'context',
      label: (
        <span>
          <CodeOutlined />
          Context
        </span>
      ),
      children: (
        <div className="context-panel-content">
          {contextItems.length > 0 ? (
            <List
              dataSource={contextItems}
              renderItem={(item) => (
                <List.Item>
                  <div className="context-item">
                    <FileOutlined />
                    <span>{item.name}</span>
                    <Tag color="blue">{item.type}</Tag>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No context items" />
          )}
        </div>
      ),
    },
    {
      key: 'files',
      label: (
        <span>
          <FileOutlined />
          Open Files
        </span>
      ),
      children: (
        <div className="context-panel-content">
          {openFiles.length > 0 ? (
            <List
              dataSource={openFiles}
              renderItem={(file) => (
                <List.Item>
                  <div className="context-item">
                    <FileOutlined />
                    <span>{file.name}</span>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No open files" />
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          Recent
        </span>
      ),
      children: (
        <div className="context-panel-content">
          {recentFiles && recentFiles.length > 0 ? (
            <List
              dataSource={recentFiles}
              renderItem={(file) => (
                <List.Item>
                  <div className="context-item">
                    <FileOutlined />
                    <span>{file.name}</span>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No recent files" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="context-panel">
      <Tabs items={items} size="small" />
    </div>
  );
};
