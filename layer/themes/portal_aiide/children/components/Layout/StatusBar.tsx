import React from 'react';
import { Space, Tag } from 'antd';
import { FileNode } from '../../types';
import './StatusBar.css';

interface StatusBarProps {
  activeFile?: FileNode | null;
  theme: 'light' | 'dark';
  layout: 'ide' | 'chat' | 'split';
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeFile,
  theme,
  layout,
}) => {
  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <Space>
          {activeFile && (
            <>
              <span className="status-bar-item">{activeFile.name}</span>
              <span className="status-bar-separator">|</span>
              <span className="status-bar-item">{activeFile.path}</span>
            </>
          )}
        </Space>
      </div>
      
      <div className="status-bar-right">
        <Space>
          <Tag color="blue">Layout: {layout}</Tag>
          <Tag color="green">Theme: {theme}</Tag>
          <span className="status-bar-item">AIIDE v1.0.0</span>
        </Space>
      </div>
    </div>
  );
};
