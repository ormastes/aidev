import { FileNode } from '../types';

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function getFileLanguage(filename: string): string {
  const ext = getFileExtension(filename).toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    cs: 'csharp',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    r: 'r',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    json: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    conf: 'conf',
    txt: 'plaintext',
  };
  return languageMap[ext] || 'plaintext';
}

export function sortFileTree(node: FileNode): FileNode {
  if (node.type === 'directory' && node.children) {
    const sortedChildren = [...node.children].sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
    
    return {
      ...node,
      children: sortedChildren.map(child => 
        child.type === 'directory' ? sortFileTree(child) : child
      ),
    };
  }
  return node;
}

export function findFileInTree(
  node: FileNode,
  path: string
): FileNode | undefined {
  if (node.path === path) return node;
  
  if (node.type === 'directory' && node.children) {
    for (const child of node.children) {
      const found = findFileInTree(child, path);
      if (found) return found;
    }
  }
  
  return undefined;
}

export function getFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function isTextFile(filename: string): boolean {
  const textExtensions = [
    'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css',
    'scss', 'sass', 'less', 'xml', 'yaml', 'yml', 'toml', 'ini',
    'conf', 'sh', 'bash', 'zsh', 'ps1', 'py', 'rb', 'go', 'rs',
    'java', 'cpp', 'c', 'h', 'cs', 'php', 'swift', 'kt', 'scala',
    'r', 'sql', 'vue', 'svelte', 'astro', 'mdx',
  ];
  
  const ext = getFileExtension(filename).toLowerCase();
  return textExtensions.includes(ext);
}

export function getFileMimeType(filename: string): string {
  const ext = getFileExtension(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    txt: 'text/plain',
    md: 'text/markdown',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    zip: 'application/zip',
  };
  
  return mimeMap[ext] || 'application/octet-stream';
}