/**
 * Progress Indicator Component
 * Shows conversion progress with animated feedback
 */

import React from 'react';

interface ProgressIndicatorProps {
  message: string;
  progress?: number;
  isIndeterminate?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  message,
  progress,
  isIndeterminate = true
}) => {
  return (
    <div className="progress-indicator">
      <div className="progress-content">
        <div className="spinner">
          <div className="spinner-circle"></div>
        </div>
        
        <div className="progress-text">
          <p className="progress-message">{message}</p>
          {!isIndeterminate && progress !== undefined && (
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .progress-indicator {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }

        .progress-content {
          text-align: center;
        }

        .spinner {
          display: inline-block;
          margin-bottom: 1rem;
        }

        .spinner-circle {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .progress-message {
          font-size: 1.1rem;
          color: #333;
          margin: 0.5rem 0;
        }

        .progress-bar {
          width: 200px;
          height: 4px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin: 0.5rem auto;
        }

        .progress-fill {
          height: 100%;
          background: #007bff;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
};