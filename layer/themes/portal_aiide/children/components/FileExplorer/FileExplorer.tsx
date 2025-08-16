/**
 * FileExplorer Component
 * File tree navigation with CRUD operations
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Tree, Input, Dropdown, Modal, Button, Space, message } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  FileTextOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileZipOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CopyOutlined,
  ScissorOutlined,
  SearchOutlined,
  ReloadOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { FileNode } from '../../types';
import { useFileStore } from '../../stores/fileStore';
import './FileExplorer.css';

const { DirectoryTree } = Tree;
const { Search } = Input;

interface FileExplorerProps {
  onFileSelect?: (file: FileNode) => void;
  onFileOpen?: (file: FileNode) => void;
  className?: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  onFileSelect,
  onFileOpen,
  className
}) => {
  const {
    fileTree,
    selectedFile,
    loadFileTree,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    refreshTree
  } = useFileStore();

  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [contextMenuNode, setContextMenuNode] = useState<FileNode | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState<{ type: 'file' | 'folder'; parentId: string } | null>(null);

  // Load file tree on mount
  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // Get file icon based on extension
  const getFileIcon = (node: FileNode) => {
    if (node.type === "directory") {
      return expandedKeys.includes(node.id) ? <FolderOpenOutlined /> : <FolderOutlined />;
    }

    const ext = node.extension?.toLowerCase();
    switch (ext) {
      case 'md':
      case 'mdx':
        return <FileMarkdownOutlined />;
      case 'txt':
      case 'log':
        return <FileTextOutlined />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <FileImageOutlined />;
      case 'pdf':
        return <FilePdfOutlined />;
      case 'zip':
      case 'tar':
      case 'gz':
        return <FileZipOutlined />;
      default:
        return <FileOutlined />;
    }
  };

  // Convert FileNode to Tree data
  const convertToTreeData = (nodes: FileNode[]): any[] => {
    return nodes.map(node => ({
      title: isRenaming === node.id ? (
        <Input
          size="small"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={() => handleRename(node)}
          onBlur={() => setIsRenaming(null)}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={`file-node ${node.gitStatus?.status || ''}`}>
          {node.name}
          {node.gitStatus && (
            <span className={`git-status ${node.gitStatus.status}`}>
              {node.gitStatus.status[0].toUpperCase()}
            </span>
          )}
        </span>
      ),
      key: node.id,
      icon: getFileIcon(node),
      children: node.children ? convertToTreeData(node.children) : undefined,
      isLeaf: node.type === 'file',
      data: node
    }));
  };

  // Handle tree selection
  const handleSelect = (selectedKeys: any[], info: any) => {
    setSelectedKeys(selectedKeys);
    const node = info.node.data as FileNode;
    
    if (node.type === 'file') {
      onFileSelect?.(node);
    }
  };

  // Handle double click to open file
  const handleDoubleClick = (e: React.MouseEvent, node: FileNode) => {
    if (node.type === 'file') {
      onFileOpen?.(node);
    }
  };

  // Handle context menu
  const handleContextMenu = (info: any) => {
    const node = info.node.data as FileNode;
    setContextMenuNode(node);
  };

  // Handle file/folder creation
  const handleCreate = async (type: 'file' | 'folder') => {
    if (!contextMenuNode) return;

    const parentId = contextMenuNode.type === "directory" ? contextMenuNode.id : contextMenuNode.id;
    setIsCreating({ type, parentId });

    Modal.confirm({
      title: `Create new ${type}`,
      content: (
        <Input
          placeholder={`Enter ${type} name`}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={() => {
            Modal.destroyAll();
            performCreate(type, parentId);
          }}
        />
      ),
      onOk: () => performCreate(type, parentId),
      onCancel: () => setIsCreating(null)
    });
  };

  const performCreate = async (type: 'file' | 'folder', parentId: string) => {
    if (!newName.trim()) {
      message.error('Name cannot be empty');
      return;
    }

    try {
      if (type === 'file') {
        await createFile(parentId, newName);
      } else {
        await createFolder(parentId, newName);
      }
      message.success(`${type} created successfully`);
      setNewName('');
      setIsCreating(null);
      
      // Expand parent folder
      if (!expandedKeys.includes(parentId)) {
        setExpandedKeys([...expandedKeys, parentId]);
      }
    } catch (error) {
      message.error(`Failed to create ${type}`);
    }
  };

  // Handle rename
  const handleRename = async (node: FileNode) => {
    if (!newName.trim() || newName === node.name) {
      setIsRenaming(null);
      return;
    }

    try {
      await renameNode(node.id, newName);
      message.success('Renamed successfully');
      setIsRenaming(null);
      setNewName('');
    } catch (error) {
      message.error('Failed to rename');
    }
  };

  // Handle delete
  const handleDelete = async (node: FileNode) => {
    Modal.confirm({
      title: `Delete ${node.name}?`,
      content: `This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteNode(node.id);
          message.success('Deleted successfully');
        } catch (error) {
          message.error('Failed to delete');
        }
      }
    });
  };

  // Context menu items
  const getContextMenuItems = (node: FileNode) => {
    const items = [];

    if (node.type === "directory") {
      items.push(
        {
          key: 'new-file',
          label: 'New File',
          icon: <FileOutlined />,
          onClick: () => handleCreate('file')
        },
        {
          key: 'new-folder',
          label: 'New Folder',
          icon: <FolderOutlined />,
          onClick: () => handleCreate('folder')
        },
        { type: 'divider', key: 'divider-1' }
      );
    }

    items.push(
      {
        key: 'rename',
        label: 'Rename',
        icon: <EditOutlined />,
        onClick: () => {
          setIsRenaming(node.id);
          setNewName(node.name);
        }
      },
      {
        key: 'copy',
        label: 'Copy',
        icon: <CopyOutlined />,
        onClick: () => message.info('Copy functionality coming soon')
      },
      {
        key: 'cut',
        label: 'Cut',
        icon: <ScissorOutlined />,
        onClick: () => message.info('Cut functionality coming soon')
      },
      { type: 'divider', key: 'divider-2' },
      {
        key: 'delete',
        label: 'Delete',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(node)
      }
    );

    return items;
  };

  // Filter tree based on search
  const filterTree = (nodes: FileNode[], searchValue: string): FileNode[] => {
    if (!searchValue) return nodes;

    return nodes.reduce((filtered: FileNode[], node) => {
      const matches = node.name.toLowerCase().includes(searchValue.toLowerCase());
      const childMatches = node.children ? filterTree(node.children, searchValue) : [];

      if (matches || childMatches.length > 0) {
        filtered.push({
          ...node,
          children: childMatches.length > 0 ? childMatches : node.children
        });
      }

      return filtered;
    }, []);
  };

  const filteredTree = filterTree(fileTree, searchValue);
  const treeData = convertToTreeData(filteredTree);

  return (
    <div className={`file-explorer ${className || ''}`}>
      <div className="file-explorer-header">
        <Search
          placeholder="Search files..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          prefix={<SearchOutlined />}
          allowClear
        />
        <Space>
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={() => {
              setContextMenuNode({ id: 'root', type: "directory" } as FileNode);
              handleCreate('file');
            }}
          />
          <Button
            icon={<FolderOutlined />}
            size="small"
            onClick={() => {
              setContextMenuNode({ id: 'root', type: "directory" } as FileNode);
              handleCreate('folder');
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={refreshTree}
          />
        </Space>
      </div>

      <div className="file-explorer-tree">
        <Dropdown
          menu={{ items: contextMenuNode ? getContextMenuItems(contextMenuNode) : [] }}
          trigger={["contextMenu"]}
          open={!!contextMenuNode}
          onOpenChange={(open) => !open && setContextMenuNode(null)}
        >
          <DirectoryTree
            treeData={treeData}
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
            onSelect={handleSelect}
            onExpand={setExpandedKeys}
            onRightClick={handleContextMenu}
            draggable
            blockNode
            showIcon
            switcherIcon={<FolderOutlined />}
          />
        </Dropdown>
      </div>

      {selectedFile && (
        <div className="file-explorer-status">
          <span className="file-path">{selectedFile.path}</span>
          {selectedFile.size && (
            <span className="file-size">{formatFileSize(selectedFile.size)}</span>
          )}
        </div>
      )}
    </div>
  );
};

// Utility function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}