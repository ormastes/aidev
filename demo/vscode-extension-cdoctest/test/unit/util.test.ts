/**
 * Unit tests for util.ts functions
 */

// Mock vscode workspace fs
const mockStat = jest.fn();

jest.mock('vscode', () => ({
  workspace: {
    fs: {
      stat: mockStat
    }
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path }))
  }
}), { virtual: true });

import { fileExists, fileExistsText } from '../../src/util';
import * as vscode from 'vscode';

describe('Util Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fileExists', () => {
    test('should return true when file exists', async () => {
      mockStat.mockResolvedValue({ type: 1, size: 100 });
      
      const uri = { fsPath: '/test/file.txt' } as vscode.Uri;
      const result = await fileExists(uri);
      
      expect(result).toBe(true);
      expect(mockStat).toHaveBeenCalledWith(uri);
    });

    test('should return false when file does not exist (FileNotFound)', async () => {
      const error = new Error('File not found');
      (error as any).code = 'FileNotFound';
      mockStat.mockRejectedValue(error);
      
      const uri = { fsPath: '/test/missing.txt' } as vscode.Uri;
      const result = await fileExists(uri);
      
      expect(result).toBe(false);
      expect(mockStat).toHaveBeenCalledWith(uri);
    });

    test('should return false when file does not exist (ENOENT)', async () => {
      const error = new Error('No such file or directory');
      (error as any).code = 'ENOENT';
      mockStat.mockRejectedValue(error);
      
      const uri = { fsPath: '/test/missing.txt' } as vscode.Uri;
      const result = await fileExists(uri);
      
      expect(result).toBe(false);
      expect(mockStat).toHaveBeenCalledWith(uri);
    });

    test('should rethrow other errors', async () => {
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      mockStat.mockRejectedValue(error);
      
      const uri = { fsPath: '/test/forbidden.txt' } as vscode.Uri;
      
      await expect(fileExists(uri)).rejects.toThrow('Permission denied');
      expect(mockStat).toHaveBeenCalledWith(uri);
    });

    test('should handle undefined error code', async () => {
      const error = new Error('Unknown error');
      mockStat.mockRejectedValue(error);
      
      const uri = { fsPath: '/test/file.txt' } as vscode.Uri;
      
      await expect(fileExists(uri)).rejects.toThrow('Unknown error');
      expect(mockStat).toHaveBeenCalledWith(uri);
    });
  });

  describe('fileExistsText', () => {
    test('should return true when file exists using text path', async () => {
      mockStat.mockResolvedValue({ type: 1, size: 100 });
      
      const result = await fileExistsText('/test/file.txt');
      
      expect(result).toBe(true);
      expect(vscode.Uri.file).toHaveBeenCalledWith('/test/file.txt');
      expect(mockStat).toHaveBeenCalled();
    });

    test('should return false when file does not exist using text path', async () => {
      const error = new Error('File not found');
      (error as any).code = 'FileNotFound';
      mockStat.mockRejectedValue(error);
      
      const result = await fileExistsText('/test/missing.txt');
      
      expect(result).toBe(false);
      expect(vscode.Uri.file).toHaveBeenCalledWith('/test/missing.txt');
      expect(mockStat).toHaveBeenCalled();
    });

    test('should handle empty path', async () => {
      mockStat.mockResolvedValue({ type: 1, size: 0 });
      
      const result = await fileExistsText('');
      
      expect(result).toBe(true);
      expect(vscode.Uri.file).toHaveBeenCalledWith('');
    });

    test('should handle Windows paths', async () => {
      mockStat.mockResolvedValue({ type: 1, size: 100 });
      
      const result = await fileExistsText('C:\\Users\\test\\file.txt');
      
      expect(result).toBe(true);
      expect(vscode.Uri.file).toHaveBeenCalledWith('C:\\Users\\test\\file.txt');
    });

    test('should handle Unix paths', async () => {
      mockStat.mockResolvedValue({ type: 1, size: 100 });
      
      const result = await fileExistsText('/home/user/file.txt');
      
      expect(result).toBe(true);
      expect(vscode.Uri.file).toHaveBeenCalledWith('/home/user/file.txt');
    });
  });
});