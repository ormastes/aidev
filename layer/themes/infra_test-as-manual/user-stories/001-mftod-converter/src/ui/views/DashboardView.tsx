/**
 * Dashboard View - Main UI for Test-as-Manual Converter
 * Provides web interface for converting tests to manual documentation
 */

import React, { useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { ConversionOptions } from '../components/ConversionOptions';
import { ResultsViewer } from '../components/ResultsViewer';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { ConversionRequest, ConversionResult } from '../../52.uilogic/types';

export const DashboardView: React.FC = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConversion = async (request: ConversionRequest) => {
    setIsConverting(true);
    setError(null);
    
    try {
      // Call UILogic controller
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error(`Conversion failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Test-as-Manual Converter</h1>
        <p>Convert your automated tests into professional manual test documentation</p>
      </header>

      <main className="dashboard-main">
        <section className="input-section">
          <h2>Input</h2>
          <FileUploader 
            onFilesSelected={(files) => console.log('Files selected:', files)}
            accept=".feature,.js,.ts,.test.js,.test.ts,.spec.js,.spec.ts"
          />
          
          <ConversionOptions 
            onOptionsChange={(options) => console.log('Options changed:', options)}
          />
          
          <button 
            className="convert-button"
            onClick={() => handleConversion({
              files: [],
              options: {
                format: 'markdown',
                includeCommonScenarios: true,
                generateSequences: true
              }
            })}
            disabled={isConverting}
          >
            {isConverting ? 'Converting...' : 'Convert to Manual Tests'}
          </button>
        </section>

        {isConverting && (
          <ProgressIndicator 
            message="Converting your tests..."
            progress={50}
          />
        )}

        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {results && !isConverting && (
          <section className="results-section">
            <h2>Results</h2>
            <ResultsViewer results={results} />
          </section>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>Powered by Test-as-Manual Converter with HEA Architecture</p>
      </footer>
    </div>
  );
};