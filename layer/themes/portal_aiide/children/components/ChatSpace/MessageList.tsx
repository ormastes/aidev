import React from 'react';
import { List, Avatar, Typography, Space, Tag } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import { ChatMessage } from '../../types';
import './MessageList.css';

const { Text } = Typography;

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, loading }) => {
  React.useEffect(() => {
    Prism.highlightAll();
  }, [messages]);

  return (
    <List
      className="message-list"
      itemLayout="horizontal"
      dataSource={messages}
      loading={loading}
      renderItem={(message) => (
        <List.Item className={`message-item message-${message.role}`}>
          <List.Item.Meta
            avatar={
              <Avatar
                icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                style={{
                  backgroundColor: message.role === 'user' ? '#1890ff' : '#52c41a',
                }}
              />
            }
            title={
              <Space>
                <Text strong>{message.role === 'user' ? 'You' : "Assistant"}</Text>
                {message.provider && <Tag color="blue">{message.provider}</Tag>}
                {message.model && <Tag color="green">{message.model}</Tag>}
                <Text type="secondary" className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Text>
              </Space>
            }
            description={
              <div className="message-content">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
};
