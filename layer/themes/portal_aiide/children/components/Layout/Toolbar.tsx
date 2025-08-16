import React from 'react';
import { Layout, Button, Space, Tooltip, Dropdown } from 'antd';
import {
  LayoutOutlined,
  BulbOutlined,
  SettingOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  CodeOutlined,
  MessageOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import './Toolbar.css';

const { Header } = Layout;

interface ToolbarProps {
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLayoutChange: (layout: 'ide' | 'chat' | 'split') => void;
  currentTheme: 'light' | 'dark';
  currentLayout: 'ide' | 'chat' | 'split';
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onThemeChange,
  onLayoutChange,
  currentTheme,
  currentLayout,
}) => {
  const layoutMenu = {
    items: [
      {
        key: 'ide',
        label: 'IDE Layout',
        icon: <CodeOutlined />,
        onClick: () => onLayoutChange('ide'),
      },
      {
        key: 'chat',
        label: 'Chat Layout',
        icon: <MessageOutlined />,
        onClick: () => onLayoutChange('chat'),
      },
      {
        key: 'split',
        label: 'Split Layout',
        icon: <AppstoreOutlined />,
        onClick: () => onLayoutChange('split'),
      },
    ],
  };

  const themeTooltip = currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';

  return (
    <Header className="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-logo">
          <CodeOutlined />
          <span>AIIDE</span>
        </div>
        <Space>
          <Tooltip title="Open File">
            <Button icon={<FolderOpenOutlined />} type="text" />
          </Tooltip>
          <Tooltip title="Save">
            <Button icon={<SaveOutlined />} type="text" />
          </Tooltip>
        </Space>
      </div>
      
      <div className="toolbar-right">
        <Space>
          <Dropdown menu={layoutMenu} trigger={['click']}>
            <Tooltip title="Change Layout">
              <Button icon={<LayoutOutlined />} type="text" />
            </Tooltip>
          </Dropdown>
          
          <Tooltip title={themeTooltip}>
            <Button
              icon={<BulbOutlined />}
              type="text"
              onClick={() => onThemeChange(currentTheme === 'dark' ? 'light' : 'dark')}
            />
          </Tooltip>
          
          <Tooltip title="Settings">
            <Button icon={<SettingOutlined />} type="text" />
          </Tooltip>
        </Space>
      </div>
    </Header>
  );
};
