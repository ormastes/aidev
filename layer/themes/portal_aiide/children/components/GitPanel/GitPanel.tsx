/**
 * Git Panel Component - Git integration and version control
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Input,
  Select,
  Tag,
  List,
  Badge,
  Tooltip,
  Modal,
  Form,
  message,
  Tabs,
  Timeline,
  Avatar,
  Dropdown,
  Menu,
  Checkbox,
  Alert,
  Progress,
  Empty
} from 'antd';
import {
  GitlabOutlined,
  BranchesOutlined,
  PullRequestOutlined,
  SyncOutlined,
  PlusOutlined,
  MinusOutlined,
  EditOutlined,
  FileAddOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TagOutlined,
  HistoryOutlined,
  DiffOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  RollbackOutlined,
  ForkOutlined,
  MergeOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import './GitPanel.css';

const { TextArea } = Input;
const { TabPane } = Tabs;

interface GitFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
  additions?: number;
  deletions?: number;
}

interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  branch?: string;
  tags?: string[];
}

interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  ahead?: number;
  behind?: number;
  lastCommit?: GitCommit;
}

interface GitRemote {
  name: string;
  url: string;
  type: 'fetch' | 'push';
}

interface GitStash {
  id: string;
  message: string;
  date: Date;
  branch: string;
}

interface GitPanelProps {
  workingDirectory?: string;
  onFileClick?: (file: GitFile) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const GitPanel: React.FC<GitPanelProps> = ({
  workingDirectory = '.',
  onFileClick,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [files, setFiles] = useState<GitFile[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commitModalVisible, setCommitModalVisible] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [stashModalVisible, setStashModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('changes');
  const [diffView, setDiffView] = useState<string | null>(null);
  
  const [commitForm] = Form.useForm();
  const [branchForm] = Form.useForm();
  const [stashForm] = Form.useForm();

  // Mock data for demonstration
  const mockFiles: GitFile[] = [
    { path: 'src/App.tsx', status: 'modified', staged: false, additions: 10, deletions: 5 },
    { path: 'src/components/Header.tsx', status: 'added', staged: true, additions: 50, deletions: 0 },
    { path: 'src/styles/old.css', status: 'deleted', staged: false, additions: 0, deletions: 100 },
    { path: 'README.md', status: 'modified', staged: true, additions: 3, deletions: 1 },
    { path: 'package.json', status: 'modified', staged: false, additions: 2, deletions: 0 }
  ];

  const mockCommits: GitCommit[] = [
    {
      hash: 'abc123',
      author: 'John Doe',
      email: 'john@example.com',
      date: new Date('2024-01-20T10:30:00'),
      message: 'feat: Add new feature component'
    },
    {
      hash: 'def456',
      author: 'Jane Smith',
      email: 'jane@example.com',
      date: new Date('2024-01-19T15:45:00'),
      message: 'fix: Resolve navigation bug'
    },
    {
      hash: 'ghi789',
      author: 'Bob Wilson',
      email: 'bob@example.com',
      date: new Date('2024-01-19T09:00:00'),
      message: 'refactor: Improve code structure'
    }
  ];

  const mockBranches: GitBranch[] = [
    { name: 'main', current: true, ahead: 0, behind: 0 },
    { name: 'feature/new-ui', current: false, ahead: 3, behind: 1 },
    { name: 'bugfix/navigation', current: false, ahead: 1, behind: 0 },
    { name: 'develop', current: false, ahead: 5, behind: 2 }
  ];

  // Fetch git status
  const fetchGitStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setFiles(mockFiles);
      setCommits(mockCommits);
      setBranches(mockBranches);
      setCurrentBranch('main');
      
    } catch (error) {
      console.error('Failed to fetch git status:', error);
      message.error('Failed to fetch git status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchGitStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchGitStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchGitStatus]);

  // Stage/unstage files
  const toggleStaging = (filePath: string) => {
    setFiles(prev => prev.map(file =>
      file.path === filePath ? { ...file, staged: !file.staged } : file
    ));
  };

  // Stage all files
  const stageAll = () => {
    setFiles(prev => prev.map(file => ({ ...file, staged: true })));
    message.success('All files staged');
  };

  // Unstage all files
  const unstageAll = () => {
    setFiles(prev => prev.map(file => ({ ...file, staged: false })));
    message.success('All files unstaged');
  };

  // Commit changes
  const handleCommit = async (values: any) => {
    try {
      // Simulate commit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('Changes committed successfully');
      setCommitModalVisible(false);
      commitForm.resetFields();
      fetchGitStatus();
    } catch (error) {
      message.error('Failed to commit changes');
    }
  };

  // Create branch
  const handleCreateBranch = async (values: any) => {
    try {
      // Simulate branch creation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      message.success(`Branch '${values.name}' created successfully`);
      setBranchModalVisible(false);
      branchForm.resetFields();
      fetchGitStatus();
    } catch (error) {
      message.error('Failed to create branch');
    }
  };

  // Switch branch
  const switchBranch = async (branchName: string) => {
    try {
      // Simulate branch switch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentBranch(branchName);
      setBranches(prev => prev.map(b => ({
        ...b,
        current: b.name === branchName
      })));
      message.success(`Switched to branch '${branchName}'`);
      fetchGitStatus();
    } catch (error) {
      message.error('Failed to switch branch');
    }
  };

  // Push changes
  const pushChanges = async () => {
    try {
      setIsLoading(true);
      // Simulate push
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('Changes pushed successfully');
      fetchGitStatus();
    } catch (error) {
      message.error('Failed to push changes');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull changes
  const pullChanges = async () => {
    try {
      setIsLoading(true);
      // Simulate pull
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('Changes pulled successfully');
      fetchGitStatus();
    } catch (error) {
      message.error('Failed to pull changes');
    } finally {
      setIsLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return '#52c41a';
      case 'modified':
        return '#1890ff';
      case 'deleted':
        return '#ff4d4f';
      case 'renamed':
        return '#722ed1';
      case 'untracked':
        return '#8c8c8c';
      default:
        return '#8c8c8c';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <PlusOutlined />;
      case 'modified':
        return <EditOutlined />;
      case 'deleted':
        return <MinusOutlined />;
      case 'renamed':
        return <DiffOutlined />;
      case 'untracked':
        return <FileAddOutlined />;
      default:
        return <FileAddOutlined />;
    }
  };

  // Render file item
  const renderFileItem = (file: GitFile) => (
    <List.Item
      key={file.path}
      className={`git-file-item ${file.staged ? 'staged' : ''}`}
      onClick={() => onFileClick?.(file)}
    >
      <Checkbox
        checked={file.staged}
        onChange={() => toggleStaging(file.path)}
        onClick={(e) => e.stopPropagation()}
      />
      
      <div className="file-info">
        <Space>
          <Tag color={getStatusColor(file.status)} icon={getStatusIcon(file.status)}>
            {file.status.toUpperCase()}
          </Tag>
          <span className="file-path">{file.path}</span>
        </Space>
        
        {(file.additions || file.deletions) && (
          <Space className="file-stats">
            {file.additions > 0 && (
              <span className="additions">+{file.additions}</span>
            )}
            {file.deletions > 0 && (
              <span className="deletions">-{file.deletions}</span>
            )}
          </Space>
        )}
      </div>
    </List.Item>
  );

  return (
    <div className="git-panel-container">
      <Card className="git-header">
        <div className="git-branch-info">
          <Space>
            <GitlabOutlined style={{ fontSize: 20 }} />
            <Dropdown
              overlay={
                <Menu onClick={({ key }) => switchBranch(key)}>
                  {branches.map(branch => (
                    <Menu.Item
                      key={branch.name}
                      icon={branch.current ? <CheckOutlined /> : <BranchesOutlined />}
                    >
                      <Space>
                        {branch.name}
                        {branch.ahead > 0 && <Tag color="green">↑{branch.ahead}</Tag>}
                        {branch.behind > 0 && <Tag color="orange">↓{branch.behind}</Tag>}
                      </Space>
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item
                    key="new-branch"
                    icon={<PlusOutlined />}
                    onClick={() => setBranchModalVisible(true)}
                  >
                    Create New Branch
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
            >
              <Button type="text">
                <Space>
                  <BranchesOutlined />
                  {currentBranch}
                  <Badge count={branches.length - 1} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </div>
        
        <Space>
          <Tooltip title="Pull">
            <Button
              icon={<CloudDownloadOutlined />}
              onClick={pullChanges}
              loading={isLoading}
            />
          </Tooltip>
          <Tooltip title="Push">
            <Button
              icon={<CloudUploadOutlined />}
              onClick={pushChanges}
              loading={isLoading}
            />
          </Tooltip>
          <Tooltip title="Refresh">
            <Button
              icon={<SyncOutlined spin={isLoading} />}
              onClick={fetchGitStatus}
            />
          </Tooltip>
        </Space>
      </Card>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="git-tabs">
        <TabPane
          tab={
            <span>
              <DiffOutlined /> Changes
              <Badge count={files.length} style={{ marginLeft: 8 }} />
            </span>
          }
          key="changes"
        >
          <div className="git-changes">
            {files.length > 0 ? (
              <>
                <div className="changes-actions">
                  <Space>
                    <Button size="small" onClick={stageAll}>
                      Stage All
                    </Button>
                    <Button size="small" onClick={unstageAll}>
                      Unstage All
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => setCommitModalVisible(true)}
                      disabled={!files.some(f => f.staged)}
                    >
                      Commit
                    </Button>
                  </Space>
                </div>
                
                <List
                  dataSource={files}
                  renderItem={renderFileItem}
                  className="git-files-list"
                />
              </>
            ) : (
              <Empty
                description="No changes detected"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <HistoryOutlined /> History
            </span>
          }
          key="history"
        >
          <Timeline className="git-history">
            {commits.map(commit => (
              <Timeline.Item
                key={commit.hash}
                dot={<Avatar size="small" icon={<UserOutlined />} />}
              >
                <div className="commit-item">
                  <div className="commit-header">
                    <Space>
                      <Tag color="blue">{commit.hash.substring(0, 7)}</Tag>
                      <span className="commit-author">{commit.author}</span>
                      <span className="commit-date">
                        <ClockCircleOutlined /> {new Date(commit.date).toLocaleString()}
                      </span>
                    </Space>
                  </div>
                  <div className="commit-message">{commit.message}</div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <ForkOutlined /> Branches
            </span>
          }
          key="branches"
        >
          <List
            dataSource={branches}
            renderItem={branch => (
              <List.Item
                className={`branch-item ${branch.current ? 'current' : ''}`}
                actions={[
                  branch.current ? (
                    <Tag color="green">Current</Tag>
                  ) : (
                    <Button
                      size="small"
                      onClick={() => switchBranch(branch.name)}
                    >
                      Switch
                    </Button>
                  )
                ]}
              >
                <List.Item.Meta
                  avatar={<BranchesOutlined />}
                  title={branch.name}
                  description={
                    <Space>
                      {branch.ahead > 0 && (
                        <span className="branch-ahead">↑ {branch.ahead} ahead</span>
                      )}
                      {branch.behind > 0 && (
                        <span className="branch-behind">↓ {branch.behind} behind</span>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <TagOutlined /> Stashes
            </span>
          }
          key="stashes"
        >
          {stashes.length > 0 ? (
            <List
              dataSource={stashes}
              renderItem={stash => (
                <List.Item
                  actions={[
                    <Button size="small">Apply</Button>,
                    <Button size="small" danger>Drop</Button>
                  ]}
                >
                  <List.Item.Meta
                    title={stash.message}
                    description={`${stash.branch} • ${new Date(stash.date).toLocaleString()}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty
              description="No stashes"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setStashModalVisible(true)}
              >
                Create Stash
              </Button>
            </Empty>
          )}
        </TabPane>
      </Tabs>
      
      <Modal
        title="Commit Changes"
        visible={commitModalVisible}
        onCancel={() => setCommitModalVisible(false)}
        footer={null}
      >
        <Form
          form={commitForm}
          layout="vertical"
          onFinish={handleCommit}
        >
          <Alert
            message={`${files.filter(f => f.staged).length} files staged for commit`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item
            name="message"
            label="Commit Message"
            rules={[{ required: true, message: 'Please enter a commit message' }]}
          >
            <TextArea
              rows={4}
              placeholder="Enter commit message..."
              showCount
              maxLength={200}
            />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Extended Description (optional)"
          >
            <TextArea
              rows={3}
              placeholder="Add extended description..."
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Commit
              </Button>
              <Button onClick={() => setCommitModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
      <Modal
        title="Create New Branch"
        visible={branchModalVisible}
        onCancel={() => setBranchModalVisible(false)}
        footer={null}
      >
        <Form
          form={branchForm}
          layout="vertical"
          onFinish={handleCreateBranch}
        >
          <Form.Item
            name="name"
            label="Branch Name"
            rules={[
              { required: true, message: 'Please enter branch name' },
              { pattern: /^[a-zA-Z0-9/_-]+$/, message: 'Invalid branch name' }
            ]}
          >
            <Input placeholder="feature/new-feature" />
          </Form.Item>
          
          <Form.Item
            name="from"
            label="Create from"
            initialValue={currentBranch}
          >
            <Select>
              {branches.map(branch => (
                <Select.Option key={branch.name} value={branch.name}>
                  {branch.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="checkout"
            valuePropName="checked"
            initialValue={true}
          >
            <Checkbox>Switch to new branch after creation</Checkbox>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Branch
              </Button>
              <Button onClick={() => setBranchModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};