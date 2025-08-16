/**
 * Conversion Options Component
 * Allows users to configure conversion settings
 */

import React, { useState } from 'react';

export interface ConversionSettings {
  format: "markdown" | 'html' | 'json';
  includeCommonScenarios: boolean;
  generateSequences: boolean;
  minSequenceLength: number;
  commonScenarioThreshold: number;
  enableCaptures: boolean;
  captureOptions?: {
    platform: 'ios' | 'android' | 'web' | 'desktop';
    deviceId?: string;
    browserName?: string;
  };
}

interface ConversionOptionsProps {
  onOptionsChange: (options: ConversionSettings) => void;
}

export const ConversionOptions: React.FC<ConversionOptionsProps> = ({ onOptionsChange }) => {
  const [options, setOptions] = useState<ConversionSettings>({
    format: "markdown",
    includeCommonScenarios: true,
    generateSequences: true,
    minSequenceLength: 2,
    commonScenarioThreshold: 0.5,
    enableCaptures: false
  });

  const updateOption = <K extends keyof ConversionSettings>(
    key: K,
    value: ConversionSettings[K]
  ) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    onOptionsChange(newOptions);
  };

  return (
    <div className="conversion-options">
      <h3>Conversion Options</h3>
      
      <div className="option-group">
        <label>
          Output Format:
          <select 
            value={options.format}
            onChange={(e) => updateOption('format', e.target.value as any)}
          >
            <option value="markdown">Markdown</option>
            <option value="html">HTML</option>
            <option value="json">JSON</option>
          </select>
        </label>
      </div>

      <div className="option-group">
        <label>
          <input
            type="checkbox"
            checked={options.includeCommonScenarios}
            onChange={(e) => updateOption("includeCommonScenarios", e.target.checked)}
          />
          Detect and group common scenarios
        </label>
      </div>

      <div className="option-group">
        <label>
          <input
            type="checkbox"
            checked={options.generateSequences}
            onChange={(e) => updateOption("generateSequences", e.target.checked)}
          />
          Generate test sequences
        </label>
        
        {options.generateSequences && (
          <div className="sub-option">
            <label>
              Minimum sequence length:
              <input
                type="number"
                min="2"
                max="10"
                value={options.minSequenceLength}
                onChange={(e) => updateOption("minSequenceLength", parseInt(e.target.value))}
              />
            </label>
          </div>
        )}
      </div>

      <div className="option-group">
        <label>
          Common scenario threshold:
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={options.commonScenarioThreshold}
            onChange={(e) => updateOption("commonScenarioThreshold", parseFloat(e.target.value))}
          />
          <span>{(options.commonScenarioThreshold * 100).toFixed(0)}%</span>
        </label>
      </div>

      <div className="option-group">
        <label>
          <input
            type="checkbox"
            checked={options.enableCaptures}
            onChange={(e) => updateOption("enableCaptures", e.target.checked)}
          />
          Enable screenshot captures
        </label>
        
        {options.enableCaptures && (
          <div className="sub-options">
            <label>
              Platform:
              <select
                value={options.captureOptions?.platform || 'web'}
                onChange={(e) => updateOption("captureOptions", {
                  ...options.captureOptions,
                  platform: e.target.value as any
                })}
              >
                <option value="web">Web (Playwright)</option>
                <option value="ios">iOS Simulator</option>
                <option value="android">Android Emulator</option>
                <option value="desktop">Desktop</option>
              </select>
            </label>
            
            {options.captureOptions?.platform === 'web' && (
              <label>
                Browser:
                <select
                  value={options.captureOptions?.browserName || "chromium"}
                  onChange={(e) => updateOption("captureOptions", {
                    ...options.captureOptions,
                    browserName: e.target.value
                  })}
                >
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                  <option value="webkit">WebKit</option>
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      <details className="advanced-options">
        <summary>Advanced Options</summary>
        <div className="option-group">
          <h4>Test Organization</h4>
          <label>
            Group by:
            <select>
              <option value="feature">Feature</option>
              <option value="category">Category</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </div>
        
        <div className="option-group">
          <h4>Documentation Style</h4>
          <label>
            Template:
            <select>
              <option value="simple">Simple</option>
              <option value="detailed">Detailed</option>
              <option value="professional">Professional</option>
              <option value="compliance">Compliance</option>
            </select>
          </label>
        </div>
      </details>
    </div>
  );
};