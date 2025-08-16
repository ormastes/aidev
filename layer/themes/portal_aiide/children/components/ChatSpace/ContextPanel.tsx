import React from 'react';
import { List, Tag, Button, Empty, Space, Tooltip } from 'antd';
import { DeleteOutlined, FileOutlined, CodeOutlined } from '@ant-design/icons';
import { ContextItem } from '../../types';
import './ContextPanel.css';

interface ContextPanelProps {
  context: ContextItem[];
  onAddContext?: () => void;
  onRemoveContext?: (itemId: string) => void;
  onClearContext?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  context,
  onAddContext,
  onRemoveContext,
  onClearContext,
}) => {
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileOutlined />;
      case 'code':
        return <CodeOutlined />;
      default:
        return <FileOutlined />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'file':
        return 'blue';
      case 'code':
        return 'green';
      case 'selection':
        return 'orange';
      default:
        return 'default';
    }
  };

  return (
    <div className="chat-context-panel">
      <div className="context-header">
        <h4>Context Items</h4>
        <Space>
          {onAddContext && (
            <Button size="small" onClick={onAddContext}>
              Add
            </Button>
          )}
          {onClearContext && context.length > 0 && (
            <Button size="small" danger onClick={onClearContext}>
              Clear All
            </Button>
          )}
        </Space>
      </div>
      
      {context.length > 0 ? (
        <List
          className="context-list"
          dataSource={context}
          renderItem={(item) => (
            <List.Item
              actions={
                onRemoveContext
                  ? [
                      <Tooltip title="Remove">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => onRemoveContext(item.id)}
                        />
                      </Tooltip>,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                avatar={getItemIcon(item.type)}
                title={
                  <Space>
                    <span>{item.name}</span>
                    <Tag color={getItemColor(item.type)}>{item.type}</Tag>
                  </Space>
                }
                description={
                  item.metadata?.preview && (
                    <div className="context-preview">
                      {item.metadata.preview}
                    </div>
                  )
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty
          description="No context items"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  );
};
