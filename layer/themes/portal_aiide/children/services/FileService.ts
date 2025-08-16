import axios from 'axios';
import { FileNode } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3457';

export class FileService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getFileTree(path: string = '/'): Promise<FileNode> {
    const response = await axios.get(`${this.baseUrl}/api/files/tree`, {
      params: { path },
    });
    return response.data;
  }

  async readFile(path: string): Promise<string> {
    const response = await axios.get(`${this.baseUrl}/api/files/read`, {
      params: { path },
    });
    return response.data.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    await axios.post(`${this.baseUrl}/api/files/write`, {
      path,
      content,
    });
  }

  async createFile(path: string, content: string = ''): Promise<void> {
    await axios.post(`${this.baseUrl}/api/files/create`, {
      path,
      content,
      type: 'file',
    });
  }

  async createDirectory(path: string): Promise<void> {
    await axios.post(`${this.baseUrl}/api/files/create`, {
      path,
      type: 'directory',
    });
  }

  async deleteFile(path: string): Promise<void> {
    await axios.delete(`${this.baseUrl}/api/files/delete`, {
      params: { path },
    });
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    await axios.post(`${this.baseUrl}/api/files/rename`, {
      oldPath,
      newPath,
    });
  }

  async searchFiles(query: string, path: string = '/'): Promise<FileNode[]> {
    const response = await axios.get(`${this.baseUrl}/api/files/search`, {
      params: { query, path },
    });
    return response.data;
  }

  async getFileInfo(path: string): Promise<{
    size: number;
    modified: Date;
    created: Date;
    type: string;
  }> {
    const response = await axios.get(`${this.baseUrl}/api/files/info`, {
      params: { path },
    });
    return response.data;
  }
}

export const fileService = new FileService();
