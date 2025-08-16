/**
 * AI Code Review Component - Automated code review with AI suggestions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Select, Tag, Spin, Alert, Tabs, Badge, Tooltip, Progress, List, Avatar, Timeline } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  BugOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  SyncOutlined,
  ExportOutlined,
  FilterOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import { useFileStore } from '../../stores/fileStore';
import './CodeReview.css';

interface CodeIssue {
  id: string;
  type: 'bug' | 'security' | 'performance' | 'style' | 'improvement';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column?: number;
  message: string;
  suggestion?: string;
  codeSnippet?: string;
  fixSnippet?: string;
  confidence: number;
}

interface ReviewReport {
  id: string;
  timestamp: Date;
  filesReviewed: number;
  issues: CodeIssue[];
  summary: {
    bugs: number;
    security: number;
    performance: number;
    style: number;
    improvements: number;
  };
  score: number;
  recommendations: string[];
}

interface CodeReviewProps {
  files?: string[];
  autoReview?: boolean;
  onIssueClick?: (issue: CodeIssue) => void;
}

export const CodeReview: React.FC<CodeReviewProps> = ({
  files = [],
  autoReview = false,
  onIssueClick
}) => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReviewReport | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [reviewHistory, setReviewHistory] = useState<ReviewReport[]>([]);
  
  const { activeFile, openFiles } = useFileStore();
  const { sendMessage, activeSessionId } = useChatStore();

  // Issue type configurations
  const issueTypes = {
    bug: { icon: <BugOutlined />, color: '#ff4d4f', label: 'Bug' },
    security: { icon: <SafetyOutlined />, color: '#ff7a45', label: 'Security' },
    performance: { icon: <ThunderboltOutlined />, color: '#ffa940', label: 'Performance' },
    style: { icon: <FileTextOutlined />, color: '#36cfc9', label: 'Style' },
    improvement: { icon: <CheckCircleOutlined />, color: '#52c41a', label: 'Improvement' }
  };

  // Severity configurations
  const severityConfig = {
    critical: { color: '#ff4d4f', label: 'Critical' },
    high: { color: '#ff7a45', label: 'High' },
    medium: { color: '#ffa940', label: 'Medium' },
    low: { color: '#52c41a', label: 'Low' }
  };

  // Perform AI code review
  const performReview = useCallback(async () => {
    setIsReviewing(true);
    
    try {
      const filesToReview = files.length > 0 ? files : openFiles.map(f => f.path);
      
      // Simulate AI review process (replace with actual AI API call)
      const reviewPrompt = `
        Please review the following code files and identify:
        1. Bugs and potential errors
        2. Security vulnerabilities
        3. Performance issues
        4. Code style violations
        5. Improvement suggestions
        
        Files to review: ${filesToReview.join(', ')}
        
        Return structured JSON with issues found.
      `;

      // Mock review results (replace with actual AI response)
      const mockIssues: CodeIssue[] = [
        {
          id: '1',
          type: 'security',
          severity: 'high',
          file: filesToReview[0] || 'app.tsx',
          line: 42,
          column: 15,
          message: 'Potential XSS vulnerability: User input not sanitized',
          suggestion: 'Use DOMPurify or similar library to sanitize user input',
          codeSnippet: 'dangerouslySetInnerHTML={{ __html: userInput }}',
          fixSnippet: 'dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }}',
          confidence: 0.95
        },
        {
          id: '2',
          type: 'performance',
          severity: 'medium',
          file: filesToReview[0] || 'app.tsx',
          line: 78,
          message: 'Expensive operation in render method',
          suggestion: 'Move calculation to useMemo hook',
          codeSnippet: 'const result = heavyCalculation(data);',
          fixSnippet: 'const result = useMemo(() => heavyCalculation(data), [data]);',
          confidence: 0.88
        },
        {
          id: '3',
          type: 'bug',
          severity: 'medium',
          file: filesToReview[0] || 'app.tsx',
          line: 105,
          message: 'Missing null check may cause runtime error',
          suggestion: 'Add optional chaining or null check',
          codeSnippet: 'user.profile.settings.theme',
          fixSnippet: 'user?.profile?.settings?.theme',
          confidence: 0.92
        },
        {
          id: '4',
          type: 'style',
          severity: 'low',
          file: filesToReview[0] || 'app.tsx',
          line: 23,
          message: 'Inconsistent naming convention',
          suggestion: 'Use camelCase for variable names',
          codeSnippet: 'const user_name = props.userName;',
          fixSnippet: 'const userName = props.userName;',
          confidence: 0.99
        },
        {
          id: '5',
          type: 'improvement',
          severity: 'low',
          file: filesToReview[0] || 'app.tsx',
          line: 156,
          message: 'Consider extracting complex logic to custom hook',
          suggestion: 'Create a custom hook for form validation logic',
          confidence: 0.75
        }
      ];

      const report: ReviewReport = {
        id: Date.now().toString(),
        timestamp: new Date(),
        filesReviewed: filesToReview.length,
        issues: mockIssues,
        summary: {
          bugs: mockIssues.filter(i => i.type === 'bug').length,
          security: mockIssues.filter(i => i.type === 'security').length,
          performance: mockIssues.filter(i => i.type === 'performance').length,
          style: mockIssues.filter(i => i.type === 'style').length,
          improvements: mockIssues.filter(i => i.type === 'improvement').length
        },
        score: calculateCodeScore(mockIssues),
        recommendations: [
          'Consider implementing automated security scanning in CI/CD pipeline',
          'Add comprehensive unit tests for critical functions',
          'Review and update dependencies to latest stable versions',
          'Implement consistent error handling patterns across the codebase'
        ]
      };

      setCurrentReport(report);
      setReviewHistory(prev => [report, ...prev.slice(0, 9)]);
      
    } catch (error) {
      console.error('Code review failed:', error);
    } finally {
      setIsReviewing(false);
    }
  }, [files, openFiles]);

  // Calculate code quality score
  const calculateCodeScore = (issues: CodeIssue[]): number => {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });
    
    return Math.max(0, score);
  };

  // Filter issues
  const filterIssues = (issues: CodeIssue[]): CodeIssue[] => {
    return issues.filter(issue => {
      const severityMatch = selectedSeverity === 'all' || issue.severity === selectedSeverity;
      const typeMatch = selectedType === 'all' || issue.type === selectedType;
      return severityMatch && typeMatch;
    });
  };

  // Auto-review on file change
  useEffect(() => {
    if (autoReview && activeFile) {
      const timer = setTimeout(() => {
        performReview();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [activeFile, autoReview, performReview]);

  // Handle issue click
  const handleIssueClick = (issue: CodeIssue) => {
    if (onIssueClick) {
      onIssueClick(issue);
    }
  };

  // Export report
  const exportReport = () => {
    if (currentReport) {
      const reportJson = JSON.stringify(currentReport, null, 2);
      const blob = new Blob([reportJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code-review-${currentReport.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#faad14';
    if (score >= 50) return '#ff7a45';
    return '#ff4d4f';
  };

  return (
    <div className="code-review-container">
      <Card className="code-review-header">
        <div className="review-actions">
          <Space>
            <Button
              type="primary"
              icon={<SyncOutlined spin={isReviewing} />}
              onClick={performReview}
              loading={isReviewing}
            >
              {isReviewing ? 'Reviewing...' : 'Run Review'}
            </Button>
            
            <Select
              value={selectedSeverity}
              onChange={setSelectedSeverity}
              style={{ width: 120 }}
              placeholder="Severity"
            >
              <Select.Option value="all">All Severities</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="low">Low</Select.Option>
            </Select>
            
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: 120 }}
              placeholder="Type"
            >
              <Select.Option value="all">All Types</Select.Option>
              <Select.Option value="bug">Bugs</Select.Option>
              <Select.Option value="security">Security</Select.Option>
              <Select.Option value="performance">Performance</Select.Option>
              <Select.Option value="style">Style</Select.Option>
              <Select.Option value="improvement">Improvements</Select.Option>
            </Select>
            
            {currentReport && (
              <Button
                icon={<ExportOutlined />}
                onClick={exportReport}
              >
                Export
              </Button>
            )}
          </Space>
        </div>
        
        {currentReport && (
          <div className="review-summary">
            <Space size="large">
              <div className="score-display">
                <Progress
                  type="circle"
                  percent={currentReport.score}
                  width={80}
                  strokeColor={getScoreColor(currentReport.score)}
                  format={percent => (
                    <div className="score-text">
                      <div className="score-value">{percent}</div>
                      <div className="score-label">Score</div>
                    </div>
                  )}
                />
              </div>
              
              <div className="issue-stats">
                <Space size="middle">
                  <Badge count={currentReport.summary.bugs} showZero>
                    <Tag icon={<BugOutlined />} color="error">Bugs</Tag>
                  </Badge>
                  <Badge count={currentReport.summary.security} showZero>
                    <Tag icon={<SafetyOutlined />} color="warning">Security</Tag>
                  </Badge>
                  <Badge count={currentReport.summary.performance} showZero>
                    <Tag icon={<ThunderboltOutlined />} color="processing">Performance</Tag>
                  </Badge>
                  <Badge count={currentReport.summary.style} showZero>
                    <Tag icon={<FileTextOutlined />} color="cyan">Style</Tag>
                  </Badge>
                  <Badge count={currentReport.summary.improvements} showZero>
                    <Tag icon={<CheckCircleOutlined />} color="success">Improvements</Tag>
                  </Badge>
                </Space>
              </div>
            </Space>
          </div>
        )}
      </Card>
      
      <Tabs defaultActiveKey="issues" className="review-tabs">
        <Tabs.TabPane
          tab={
            <span>
              Issues
              {currentReport && <Badge count={currentReport.issues.length} style={{ marginLeft: 8 }} />}
            </span>
          }
          key="issues"
        >
          <div className="issues-list">
            {isReviewing ? (
              <div className="review-loading">
                <Spin size="large" tip="Analyzing code..." />
              </div>
            ) : currentReport ? (
              filterIssues(currentReport.issues).map(issue => (
                <Card
                  key={issue.id}
                  className={`issue-card severity-${issue.severity}`}
                  onClick={() => handleIssueClick(issue)}
                  hoverable
                >
                  <div className="issue-header">
                    <Space>
                      {issueTypes[issue.type].icon}
                      <Tag color={severityConfig[issue.severity].color}>
                        {severityConfig[issue.severity].label}
                      </Tag>
                      <span className="issue-location">
                        {issue.file}:{issue.line}
                        {issue.column && `:${issue.column}`}
                      </span>
                    </Space>
                    <Tooltip title={`Confidence: ${(issue.confidence * 100).toFixed(0)}%`}>
                      <Progress
                        percent={issue.confidence * 100}
                        showInfo={false}
                        strokeWidth={4}
                        style={{ width: 50 }}
                      />
                    </Tooltip>
                  </div>
                  
                  <div className="issue-message">{issue.message}</div>
                  
                  {issue.suggestion && (
                    <Alert
                      message="Suggestion"
                      description={issue.suggestion}
                      type="info"
                      showIcon
                      icon={<QuestionCircleOutlined />}
                    />
                  )}
                  
                  {issue.codeSnippet && (
                    <div className="issue-code">
                      <div className="code-before">
                        <pre><code>{issue.codeSnippet}</code></pre>
                      </div>
                      {issue.fixSnippet && (
                        <>
                          <div className="code-arrow">→</div>
                          <div className="code-after">
                            <pre><code>{issue.fixSnippet}</code></pre>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <Alert
                message="No review results"
                description="Click 'Run Review' to analyze your code"
                type="info"
                showIcon
              />
            )}
          </div>
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="Recommendations" key="recommendations">
          {currentReport && currentReport.recommendations.length > 0 ? (
            <List
              dataSource={currentReport.recommendations}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<CheckCircleOutlined />} />}
                    description={item}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Alert
              message="No recommendations"
              description="Run a code review to get recommendations"
              type="info"
              showIcon
            />
          )}
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="History" key="history">
          <Timeline>
            {reviewHistory.map(report => (
              <Timeline.Item
                key={report.id}
                color={getScoreColor(report.score)}
              >
                <Card
                  size="small"
                  className="history-card"
                  onClick={() => setCurrentReport(report)}
                  hoverable
                >
                  <div className="history-header">
                    <span>{new Date(report.timestamp).toLocaleString()}</span>
                    <Tag color={getScoreColor(report.score)}>Score: {report.score}</Tag>
                  </div>
                  <div className="history-summary">
                    <Space size="small">
                      <span>{report.filesReviewed} files</span>
                      <span>{report.issues.length} issues</span>
                    </Space>
                  </div>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};