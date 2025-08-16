import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useFileStore } from '../../stores/fileStore';
import { Empty, Spin } from 'antd';
import './CodeEditor.css';

export const CodeEditor: React.FC = () => {
  const { activeFile, updateFile, files } = useFileStore();
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFile(activeFile.path, value);
    }
  };

  if (!activeFile) {
    return (
      <div className="code-editor-empty">
        <Empty description="No file selected" />
      </div>
    );
  }

  const file = files.find(f => f.path === activeFile.path);
  const language = getLanguageFromPath(activeFile.path);

  return (
    <div className="code-editor">
      <div className="code-editor-header">
        <span className="code-editor-filename">{activeFile.name}</span>
        <span className="code-editor-path">{activeFile.path}</span>
      </div>
      <Editor
        height="calc(100% - 40px)"
        language={language}
        value={file?.content || ''}
        theme="vs-dark"
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
        }}
        loading={<Spin />}
      />
    </div>
  );
};

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    css: 'css',
    scss: 'scss',
    html: 'html',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    sh: 'shell',
    bash: 'shell',
  };
  return languageMap[ext || ''] || 'plaintext';
}
