/**
 * Prompt Library Component - Manage and organize AI prompts
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Rate,
  Tooltip,
  List,
  Avatar,
  Dropdown,
  Menu,
  message,
  Tabs,
  Badge,
  Empty,
  Drawer
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  StarOutlined,
  StarFilled,
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  FolderOutlined,
  TagsOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TeamOutlined,
  GlobalOutlined,
  LockOutlined,
  MoreOutlined,
  BookOutlined,
  CodeOutlined,
  BulbOutlined,
  RocketOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import './PromptLibrary.css';

const { TextArea } = Input;
const { TabPane } = Tabs;

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  variables?: PromptVariable[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  usage: number;
  rating: number;
  isPublic: boolean;
  isFavorite: boolean;
  examples?: string[];
}

interface PromptVariable {
  name: string;
  description: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  default?: any;
  required?: boolean;
}

interface PromptCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  count: number;
}

interface PromptLibraryProps {
  onPromptSelect?: (prompt: PromptTemplate) => void;
  showDrawer?: boolean;
}

export const PromptLibrary: React.FC<PromptLibraryProps> = ({
  onPromptSelect,
  showDrawer = false
}) => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<PromptTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('my-prompts');
  
  const [form] = Form.useForm();
  const { sendMessage, activeSessionId } = useChatStore();

  // Prompt categories
  const categories: PromptCategory[] = [
    { id: 'all', name: 'All Prompts', icon: <BookOutlined />, color: '#1890ff', count: 0 },
    { id: 'coding', name: 'Coding', icon: <CodeOutlined />, color: '#52c41a', count: 0 },
    { id: 'writing', name: 'Writing', icon: <EditOutlined />, color: '#722ed1', count: 0 },
    { id: "analysis", name: "Analysis", icon: <BulbOutlined />, color: '#fa8c16', count: 0 },
    { id: "creative", name: "Creative", icon: <RocketOutlined />, color: '#eb2f96', count: 0 },
    { id: "productivity", name: "Productivity", icon: <ToolOutlined />, color: '#13c2c2', count: 0 }
  ];

  // Sample prompts
  const samplePrompts: PromptTemplate[] = [
    {
      id: '1',
      title: 'Code Review Assistant',
      description: 'Comprehensive code review with best practices and suggestions',
      content: `Review the following code for:
1. Code quality and readability
2. Performance optimizations
3. Security vulnerabilities
4. Best practices violations
5. Potential bugs

Code to review:
{{code}}

Programming language: {{language}}
Context: {{context}}

Provide detailed feedback with specific line references and improvement suggestions.`,
      category: 'coding',
      tags: ['review', 'quality', "security"],
      variables: [
        { name: 'code', description: 'Code to review', type: 'text', required: true },
        { name: "language", description: 'Programming language', type: 'select', options: ["JavaScript", "TypeScript", 'Python', 'Java', 'Go'], required: true },
        { name: 'context', description: 'Additional context', type: 'text', required: false }
      ],
      author: 'System',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      usage: 156,
      rating: 4.8,
      isPublic: true,
      isFavorite: true
    },
    {
      id: '2',
      title: 'Unit Test Generator',
      description: 'Generate comprehensive unit tests for your functions',
      content: `Generate unit tests for the following function:

{{function}}

Requirements:
- Test happy path scenarios
- Test edge cases
- Test error conditions
- Include setup and teardown if needed
- Use {{framework}} testing framework
- Aim for {{coverage}}% code coverage

Additional requirements: {{requirements}}`,
      category: 'coding',
      tags: ['testing', 'tdd', 'quality'],
      variables: [
        { name: "function", description: 'Function to test', type: 'text', required: true },
        { name: "framework", description: 'Testing framework', type: 'select', options: ['Jest', 'Mocha', 'Pytest', 'JUnit'], default: 'Jest' },
        { name: "coverage", description: 'Target coverage', type: 'number', default: 80 },
        { name: "requirements", description: 'Additional requirements', type: 'text' }
      ],
      author: 'System',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
      usage: 89,
      rating: 4.6,
      isPublic: true,
      isFavorite: false
    },
    {
      id: '3',
      title: 'Refactoring Assistant',
      description: 'Help refactor code for better maintainability',
      content: `Refactor the following code to improve:
- Readability
- Maintainability
- Performance
- Follow SOLID principles
- Apply design patterns where appropriate

Original code:
{{code}}

Specific focus areas: {{focus}}
Constraints: {{constraints}}`,
      category: 'coding',
      tags: ["refactoring", 'clean-code', "patterns"],
      variables: [
        { name: 'code', description: 'Code to refactor', type: 'text', required: true },
        { name: 'focus', description: 'Focus areas', type: 'text' },
        { name: "constraints", description: 'Constraints or limitations', type: 'text' }
      ],
      author: 'System',
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05'),
      usage: 67,
      rating: 4.7,
      isPublic: true,
      isFavorite: false
    }
  ];

  // Initialize prompts
  useEffect(() => {
    setPrompts(samplePrompts);
    setFilteredPrompts(samplePrompts);
  }, []);

  // Filter prompts
  useEffect(() => {
    let filtered = prompts;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by active tab
    if (activeTab === "favorites") {
      filtered = filtered.filter(p => p.isFavorite);
    } else if (activeTab === 'public') {
      filtered = filtered.filter(p => p.isPublic);
    }
    
    setFilteredPrompts(filtered);
  }, [prompts, selectedCategory, searchQuery, activeTab]);

  // Create or edit prompt
  const handleSavePrompt = (values: any) => {
    const newPrompt: PromptTemplate = {
      id: editingPrompt?.id || Date.now().toString(),
      ...values,
      author: 'User',
      createdAt: editingPrompt?.createdAt || new Date(),
      updatedAt: new Date(),
      usage: editingPrompt?.usage || 0,
      rating: editingPrompt?.rating || 0,
      isFavorite: editingPrompt?.isFavorite || false
    };
    
    if (editingPrompt) {
      setPrompts(prev => prev.map(p => p.id === editingPrompt.id ? newPrompt : p));
      message.success('Prompt updated successfully');
    } else {
      setPrompts(prev => [...prev, newPrompt]);
      message.success('Prompt created successfully');
    }
    
    setIsModalVisible(false);
    setEditingPrompt(null);
    form.resetFields();
  };

  // Delete prompt
  const handleDeletePrompt = (id: string) => {
    Modal.confirm({
      title: 'Delete Prompt',
      content: 'Are you sure you want to delete this prompt?',
      onOk: () => {
        setPrompts(prev => prev.filter(p => p.id !== id));
        message.success('Prompt deleted successfully');
      }
    });
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setPrompts(prev => prev.map(p =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  // Copy prompt to clipboard
  const copyPrompt = (prompt: PromptTemplate) => {
    navigator.clipboard.writeText(prompt.content);
    message.success('Prompt copied to clipboard');
  };

  // Use prompt
  const usePrompt = (prompt: PromptTemplate) => {
    if (onPromptSelect) {
      onPromptSelect(prompt);
    } else {
      setSelectedPrompt(prompt);
      setDrawerVisible(true);
    }
    
    // Increment usage
    setPrompts(prev => prev.map(p =>
      p.id === prompt.id ? { ...p, usage: p.usage + 1 } : p
    ));
  };

  // Render prompt card
  const renderPromptCard = (prompt: PromptTemplate) => (
    <Card
      key={prompt.id}
      className="prompt-card"
      hoverable
      onClick={() => usePrompt(prompt)}
    >
      <div className="prompt-card-header">
        <div className="prompt-title-section">
          <h3 className="prompt-title">{prompt.title}</h3>
          <div className="prompt-meta">
            <Space size="small">
              <Tag color={categories.find(c => c.id === prompt.category)?.color}>
                {prompt.category}
              </Tag>
              {prompt.isPublic ? <GlobalOutlined /> : <LockOutlined />}
              <span className="usage-count">
                <FireOutlined /> {prompt.usage}
              </span>
              <Rate disabled value={prompt.rating} style={{ fontSize: 12 }} />
            </Space>
          </div>
        </div>
        <Space className="prompt-actions">
          <Tooltip title={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
            <Button
              type="text"
              icon={prompt.isFavorite ? <StarFilled /> : <StarOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(prompt.id);
              }}
              className={prompt.isFavorite ? 'favorite-active' : ''}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item
                  key="copy"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    copyPrompt(prompt);
                  }}
                >
                  Copy
                </Menu.Item>
                <Menu.Item
                  key="edit"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    setEditingPrompt(prompt);
                    form.setFieldsValue(prompt);
                    setIsModalVisible(true);
                  }}
                >
                  Edit
                </Menu.Item>
                <Menu.Item
                  key="share"
                  icon={<ShareAltOutlined />}
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    message.info('Share functionality coming soon');
                  }}
                >
                  Share
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  key="delete"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    handleDeletePrompt(prompt.id);
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </Space>
      </div>
      
      <p className="prompt-description">{prompt.description}</p>
      
      <div className="prompt-tags">
        <Space size="small" wrap>
          {prompt.tags.map(tag => (
            <Tag key={tag} className="prompt-tag">
              {tag}
            </Tag>
          ))}
        </Space>
      </div>
      
      {prompt.variables && prompt.variables.length > 0 && (
        <div className="prompt-variables">
          <Tooltip title="This prompt has variables">
            <Badge count={prompt.variables.length} style={{ backgroundColor: '#52c41a' }}>
              <TagsOutlined /> Variables
            </Badge>
          </Tooltip>
        </div>
      )}
      
      <div className="prompt-footer">
        <Space size="small">
          <Avatar size="small" icon={<TeamOutlined />} />
          <span className="prompt-author">{prompt.author}</span>
          <span className="prompt-date">
            <ClockCircleOutlined /> {new Date(prompt.updatedAt).toLocaleDateString()}
          </span>
        </Space>
      </div>
    </Card>
  );

  return (
    <div className="prompt-library-container">
      <div className="prompt-library-header">
        <div className="header-controls">
          <Space>
            <Input
              placeholder="Search prompts..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 150 }}
            >
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  <Space>
                    {cat.icon}
                    {cat.name}
                  </Space>
                </Select.Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingPrompt(null);
                form.resetFields();
                setIsModalVisible(true);
              }}
            >
              New Prompt
            </Button>
          </Space>
        </div>
      </div>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="prompt-tabs">
        <TabPane
          tab={
            <span>
              <BookOutlined /> My Prompts
              <Badge count={prompts.filter(p => !p.isPublic).length} style={{ marginLeft: 8 }} />
            </span>
          }
          key="my-prompts"
        />
        <TabPane
          tab={
            <span>
              <StarOutlined /> Favorites
              <Badge count={prompts.filter(p => p.isFavorite).length} style={{ marginLeft: 8 }} />
            </span>
          }
          key="favorites"
        />
        <TabPane
          tab={
            <span>
              <GlobalOutlined /> Public Library
              <Badge count={prompts.filter(p => p.isPublic).length} style={{ marginLeft: 8 }} />
            </span>
          }
          key="public"
        />
      </Tabs>
      
      <div className="prompt-grid">
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map(renderPromptCard)
        ) : (
          <Empty
            description="No prompts found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
      
      <Modal
        title={editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingPrompt(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSavePrompt}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="Enter prompt title" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input placeholder="Brief description of what this prompt does" />
          </Form.Item>
          
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select category">
              {categories.filter(c => c.id !== 'all').map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  <Space>
                    {cat.icon}
                    {cat.name}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="content"
            label="Prompt Content"
            rules={[{ required: true, message: 'Please enter prompt content' }]}
            extra="Use {{variable}} syntax for variables"
          >
            <TextArea
              rows={8}
              placeholder="Enter your prompt here. Use {{variable}} for dynamic content."
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="Tags"
          >
            <Select
              mode="tags"
              placeholder="Add tags"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="isPublic"
            label="Visibility"
            valuePropName="checked"
          >
            <Select defaultValue={false}>
              <Select.Option value={false}>
                <Space>
                  <LockOutlined /> Private
                </Space>
              </Select.Option>
              <Select.Option value={true}>
                <Space>
                  <GlobalOutlined /> Public
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPrompt ? 'Update' : 'Create'} Prompt
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                setEditingPrompt(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
      <Drawer
        title="Use Prompt"
        placement="right"
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={600}
      >
        {selectedPrompt && (
          <div className="prompt-use-form">
            <h3>{selectedPrompt.title}</h3>
            <p>{selectedPrompt.description}</p>
            
            {selectedPrompt.variables && selectedPrompt.variables.length > 0 ? (
              <Form
                layout="vertical"
                onFinish={(values) => {
                  let content = selectedPrompt.content;
                  Object.keys(values).forEach(key => {
                    content = content.replace(new RegExp(`{{${key}}}`, 'g'), values[key] || '');
                  });
                  
                  if (activeSessionId && sendMessage) {
                    sendMessage(activeSessionId, {
                      id: Date.now().toString(),
                      role: 'user',
                      content,
                      timestamp: new Date()
                    });
                    message.success('Prompt sent to chat');
                    setDrawerVisible(false);
                  }
                }}
              >
                {selectedPrompt.variables.map(variable => (
                  <Form.Item
                    key={variable.name}
                    name={variable.name}
                    label={variable.name}
                    rules={[{ required: variable.required, message: `Please enter ${variable.name}` }]}
                    extra={variable.description}
                  >
                    {variable.type === 'select' ? (
                      <Select placeholder={`Select ${variable.name}`}>
                        {variable.options?.map(opt => (
                          <Select.Option key={opt} value={opt}>
                            {opt}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : variable.type === 'text' ? (
                      <TextArea rows={3} placeholder={`Enter ${variable.name}`} />
                    ) : (
                      <Input type={variable.type} placeholder={`Enter ${variable.name}`} />
                    )}
                  </Form.Item>
                ))}
                
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      Send to Chat
                    </Button>
                    <Button onClick={() => setDrawerVisible(false)}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            ) : (
              <div>
                <TextArea
                  value={selectedPrompt.content}
                  rows={10}
                  readOnly
                />
                <Space style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    onClick={() => {
                      if (activeSessionId && sendMessage) {
                        sendMessage(activeSessionId, {
                          id: Date.now().toString(),
                          role: 'user',
                          content: selectedPrompt.content,
                          timestamp: new Date()
                        });
                        message.success('Prompt sent to chat');
                        setDrawerVisible(false);
                      }
                    }}
                  >
                    Send to Chat
                  </Button>
                  <Button onClick={() => setDrawerVisible(false)}>
                    Cancel
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};