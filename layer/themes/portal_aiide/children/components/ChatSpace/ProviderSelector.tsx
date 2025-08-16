import React from 'react';
import { Select, Space, Tag } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { LLMProvider } from '../../types';

const { Option } = Select;

interface ProviderSelectorProps {
  providers: LLMProvider[];
  selectedProvider: string;
  onProviderChange: (providerId: string) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  selectedProvider,
  onProviderChange,
}) => {
  const getProviderColor = (type: string) => {
    const colors: Record<string, string> = {
      claude: 'purple',
      openai: 'green',
      ollama: 'orange',
      deepseek: 'blue',
    };
    return colors[type] || 'default';
  };

  return (
    <Select
      value={selectedProvider}
      onChange={onProviderChange}
      style={{ width: 200 }}
      placeholder="Select AI Provider"
      suffixIcon={<RobotOutlined />}
    >
      {providers.map((provider) => (
        <Option key={provider.id} value={provider.id}>
          <Space>
            <Tag color={getProviderColor(provider.type)}>
              {provider.type.toUpperCase()}
            </Tag>
            <span>{provider.name}</span>
          </Space>
        </Option>
      ))}
    </Select>
  );
};
