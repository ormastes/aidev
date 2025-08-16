/**
 * File Store - Manages file system operations and state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { FileNode, OpenFile } from '../types';
import { FileService } from '../services/FileService';
import { v4 as uuidv4 } from 'uuid';

interface FileState {
  fileTree: FileNode[];
  openFiles: OpenFile[];
  activeFile: string | null;
  selectedFile: FileNode | null;
  expandedKeys: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFileTree: () => Promise<void>;
  refreshTree: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  saveFile: (path: string, content: string) => Promise<void>;
  createFile: (parentPath: string, name: string, content?: string) => Promise<void>;
  createFolder: (parentPath: string, name: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
  renameNode: (path: string, newName: string) => Promise<void>;
  moveNode: (sourcePath: string, targetPath: string) => Promise<void>;
  setActiveFile: (path: string | null) => void;
  setSelectedFile: (file: FileNode | null) => void;
  setExpandedKeys: (keys: string[]) => void;
  updateFileContent: (path: string, content: string) => void;
  searchFiles: (query: string) => FileNode[];
}

const fileService = new FileService();

export const useFileStore = create<FileState>()(
  devtools(
    (set, get) => ({
      fileTree: [],
      openFiles: [],
      activeFile: null,
      selectedFile: null,
      expandedKeys: [],
      isLoading: false,
      error: null,

      loadFileTree: async () => {
        set({ isLoading: true, error: null });
        try {
          const tree = await fileService.getFileTree();
          set({ fileTree: tree, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load file tree',
            isLoading: false
          });
        }
      },

      refreshTree: async () => {
        await get().loadFileTree();
      },

      openFile: async (path) => {
        const openFile = get().openFiles.find(f => f.path === path);
        
        if (openFile) {
          set({ activeFile: path });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const content = await fileService.readFile(path);
          const language = fileService.getLanguageFromPath(path);
          
          const newFile: OpenFile = {
            path,
            content,
            language,
            isDirty: false
          };

          set((state) => ({
            openFiles: [...state.openFiles, newFile],
            activeFile: path,
            isLoading: false
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to open file',
            isLoading: false
          });
        }
      },

      closeFile: (path) => {
        set((state) => {
          const openFiles = state.openFiles.filter(f => f.path !== path);
          const activeFile = state.activeFile === path
            ? (openFiles[0]?.path || null)
            : state.activeFile;
          
          return { openFiles, activeFile };
        });
      },

      saveFile: async (path, content) => {
        set({ isLoading: true, error: null });
        try {
          await fileService.saveFile(path, content);
          
          set((state) => ({
            openFiles: state.openFiles.map(f =>
              f.path === path ? { ...f, content, isDirty: false } : f
            ),
            isLoading: false
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save file',
            isLoading: false
          });
          throw error;
        }
      },

      createFile: async (parentPath, name, content = '') => {
        set({ isLoading: true, error: null });
        try {
          const fullPath = `${parentPath}/${name}`.replace(/\/+/g, '/');
          await fileService.createFile(fullPath, content);
          
          // Refresh tree to show new file
          await get().loadFileTree();
          
          // Open the new file
          await get().openFile(fullPath);
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create file',
            isLoading: false
          });
          throw error;
        }
      },

      createFolder: async (parentPath, name) => {
        set({ isLoading: true, error: null });
        try {
          const fullPath = `${parentPath}/${name}`.replace(/\/+/g, '/');
          await fileService.createFolder(fullPath);
          
          // Refresh tree to show new folder
          await get().loadFileTree();
          
          // Expand parent folder
          const expandedKeys = [...get().expandedKeys];
          if (!expandedKeys.includes(parentPath)) {
            expandedKeys.push(parentPath);
            set({ expandedKeys });
          }
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create folder',
            isLoading: false
          });
          throw error;
        }
      },

      deleteNode: async (path) => {
        set({ isLoading: true, error: null });
        try {
          await fileService.deleteNode(path);
          
          // Close file if it's open
          get().closeFile(path);
          
          // Refresh tree
          await get().loadFileTree();
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete',
            isLoading: false
          });
          throw error;
        }
      },

      renameNode: async (path, newName) => {
        set({ isLoading: true, error: null });
        try {
          const dir = path.substring(0, path.lastIndexOf('/'));
          const newPath = `${dir}/${newName}`.replace(/\/+/g, '/');
          
          await fileService.renameNode(path, newPath);
          
          // Update open files
          set((state) => ({
            openFiles: state.openFiles.map(f =>
              f.path === path ? { ...f, path: newPath } : f
            ),
            activeFile: state.activeFile === path ? newPath : state.activeFile
          }));
          
          // Refresh tree
          await get().loadFileTree();
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to rename',
            isLoading: false
          });
          throw error;
        }
      },

      moveNode: async (sourcePath, targetPath) => {
        set({ isLoading: true, error: null });
        try {
          await fileService.moveNode(sourcePath, targetPath);
          
          // Update open files
          const fileName = sourcePath.substring(sourcePath.lastIndexOf('/') + 1);
          const newPath = `${targetPath}/${fileName}`.replace(/\/+/g, '/');
          
          set((state) => ({
            openFiles: state.openFiles.map(f =>
              f.path === sourcePath ? { ...f, path: newPath } : f
            ),
            activeFile: state.activeFile === sourcePath ? newPath : state.activeFile
          }));
          
          // Refresh tree
          await get().loadFileTree();
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to move',
            isLoading: false
          });
          throw error;
        }
      },

      setActiveFile: (path) => {
        set({ activeFile: path });
      },

      setSelectedFile: (file) => {
        set({ selectedFile: file });
      },

      setExpandedKeys: (keys) => {
        set({ expandedKeys: keys });
      },

      updateFileContent: (path, content) => {
        set((state) => ({
          openFiles: state.openFiles.map(f =>
            f.path === path ? { ...f, content, isDirty: true } : f
          )
        }));
      },

      searchFiles: (query) => {
        const search = (nodes: FileNode[], q: string): FileNode[] => {
          const results: FileNode[] = [];
          
          for (const node of nodes) {
            if (node.name.toLowerCase().includes(q.toLowerCase())) {
              results.push(node);
            }
            
            if (node.children) {
              results.push(...search(node.children, q));
            }
          }
          
          return results;
        };
        
        return search(get().fileTree, query);
      }
    })
  )
);