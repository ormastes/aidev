/**
 * Results Viewer Component
 * Displays conversion results with preview and download options
 */

import React, { useState } from 'react';
import { ConversionResult } from '../../52.uilogic/types';

interface ResultsViewerProps {
  results: ConversionResult;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ results }) => {
  const [selectedFile, setSelectedFile] = useState<number>(0);

  if (!results.success || !results.data) {
    return (
      <div className="results-error">
        <h3>Conversion Failed</h3>
        {results.errors && (
          <ul>
            {results.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const { outputFiles, preview } = results.data;

  return (
    <div className="results-viewer">
      <div className="results-header">
        <h3>Conversion Successful!</h3>
        {results.statistics && (
          <div className="statistics">
            <span>📄 {results.statistics.totalTests} tests</span>
            <span>🔄 {results.statistics.commonTests} common</span>
            <span>📊 {results.statistics.sequences} sequences</span>
            <span>⏱️ {(results.statistics.processingTime / 1000).toFixed(2)}s</span>
          </div>
        )}
      </div>

      <div className="results-content">
        <div className="file-list">
          <h4>Generated Files</h4>
          <ul>
            {outputFiles.map((file, index) => (
              <li 
                key={index}
                className={`file-item ${selectedFile === index ? "selected" : ''}`}
                onClick={() => setSelectedFile(index)}
              >
                <span className="file-icon">{getFileIcon(file.type)}</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="preview-pane">
          <h4>Preview: {outputFiles[selectedFile]?.name}</h4>
          <div className="preview-content">
            <pre>{outputFiles[selectedFile]?.preview || preview}</pre>
          </div>
        </div>
      </div>

      <div className="results-actions">
        <button className="download-button primary">
          📥 Download All Files
        </button>
        <button className="download-button">
          📄 Download {outputFiles[selectedFile]?.name}
        </button>
        <button className="copy-button">
          📋 Copy to Clipboard
        </button>
      </div>

      {results.warnings && results.warnings.length > 0 && (
        <div className="warnings">
          <h4>⚠️ Warnings</h4>
          <ul>
            {results.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function getFileIcon(type: string): string {
  switch (type) {
    case 'main': return '📑';
    case 'test': return '🧪';
    case "sequence": return '📊';
    case 'common': return '🔄';
    default: return '📄';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}