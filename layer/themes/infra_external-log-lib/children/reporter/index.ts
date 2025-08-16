/**
 * Story Reporter Module
 * Generates narrative reports from log sequences
 */

export type ReportFormat = 
  | "markdown"
  | 'html'
  | 'json'
  | 'text'
  | "timeline"
  | 'summary';

export interface StoryEvent {
  timestamp: Date;
  type: 'start' | 'action' | 'error' | 'warning' | 'success' | 'end';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  duration?: number;
  relatedEvents?: string[];
}

export interface StoryReport {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  events: StoryEvent[];
  summary: {
    totalEvents: number;
    errors: number;
    warnings: number;
    successes: number;
    averageEventDuration?: number;
  };
  metadata?: Record<string, any>;
}

export interface ReportOptions {
  format: ReportFormat;
  includeRawLogs?: boolean;
  maxEvents?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
  groupBy?: 'session' | 'request' | 'process' | 'error';
  templates?: ReportTemplates;
}

export interface ReportTemplates {
  markdown?: string;
  html?: string;
  header?: string;
  footer?: string;
  eventTemplate?: string;
}

export class StoryReporter {
  private stories: Map<string, StoryReport>;
  private currentStory?: StoryReport;
  private templates: ReportTemplates;

  constructor() {
    this.stories = new Map();
    this.templates = this.getDefaultTemplates();
  }

  startStory(id: string, title: string, metadata?: Record<string, any>): StoryReport {
    const story: StoryReport = {
      id,
      title,
      startTime: new Date(),
      events: [],
      summary: {
        totalEvents: 0,
        errors: 0,
        warnings: 0,
        successes: 0,
      },
      metadata,
    };

    this.stories.set(id, story);
    this.currentStory = story;

    this.addEvent({
      timestamp: story.startTime,
      type: 'start',
      title: `Story Started: ${title}`,
      metadata,
    });

    return story;
  }

  endStory(id?: string): StoryReport | undefined {
    const story = id ? this.stories.get(id) : this.currentStory;
    
    if (!story) return undefined;

    story.endTime = new Date();
    story.duration = story.endTime.getTime() - story.startTime.getTime();

    this.addEvent({
      timestamp: story.endTime,
      type: 'end',
      title: 'Story Completed',
      duration: story.duration,
    }, story.id);

    // Calculate average event duration
    const eventDurations = story.events
      .filter(e => e.duration)
      .map(e => e.duration!);
    
    if (eventDurations.length > 0) {
      story.summary.averageEventDuration = 
        eventDurations.reduce((sum, d) => sum + d, 0) / eventDurations.length;
    }

    if (this.currentStory?.id === story.id) {
      this.currentStory = undefined;
    }

    return story;
  }

  addEvent(event: StoryEvent, storyId?: string): void {
    const story = storyId 
      ? this.stories.get(storyId) 
      : this.currentStory;
    
    if (!story) return;

    story.events.push(event);
    story.summary.totalEvents++;

    // Update summary counters
    switch (event.type) {
      case 'error':
        story.summary.errors++;
        break;
      case 'warning':
        story.summary.warnings++;
        break;
      case 'success':
        story.summary.successes++;
        break;
    }
  }

  parseLogsToStory(logs: any[], options?: {
    storyId?: string;
    title?: string;
    correlationField?: string;
  }): StoryReport {
    const storyId = options?.storyId || `story_${Date.now()}`;
    const title = options?.title || 'Log Analysis Story';
    
    const story = this.startStory(storyId, title);

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const event = this.logToEvent(log, i === 0 ? undefined : logs[i - 1]);
      this.addEvent(event, storyId);
    }

    return this.endStory(storyId)!;
  }

  private logToEvent(log: any, previousLog?: any): StoryEvent {
    const timestamp = log.timestamp ? new Date(log.timestamp) : new Date();
    const level = (log.level || 'info').toLowerCase();
    
    let type: StoryEvent['type'] = 'action';
    if (level === 'error' || level === 'fatal') type = 'error';
    else if (level === 'warn' || level === 'warning') type = 'warning';
    else if (log.message?.toLowerCase().includes('success')) type = 'success';

    const duration = previousLog?.timestamp 
      ? timestamp.getTime() - new Date(previousLog.timestamp).getTime()
      : undefined;

    return {
      timestamp,
      type,
      title: this.extractTitle(log),
      description: log.message || JSON.stringify(log),
      metadata: {
        level: log.level,
        source: log.source,
        ...log.fields,
      },
      duration,
    };
  }

  private extractTitle(log: any): string {
    // Try to extract a meaningful title from the log
    if (log.title) return log.title;
    if (log.event) return log.event;
    if (log.action) return log.action;
    
    // Extract from message
    if (log.message) {
      const message = log.message;
      
      // Look for common patterns
      const patterns = [
        /^(\w+ing)\s+(.+)/i,  // "Starting server", "Loading config"
        /^(\w+ed)\s+(.+)/i,   // "Started server", "Loaded config"
        /^(\w+)\s+(\w+)/,     // First two words
      ];
      
      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
          return match[0].substring(0, 50);
        }
      }
      
      // Fallback to first 50 chars
      return message.substring(0, 50);
    }
    
    return `Event at ${log.timestamp || new Date().toISOString()}`;
  }

  generateReport(storyId: string, options: ReportOptions): string {
    const story = this.stories.get(storyId);
    if (!story) {
      throw new Error(`Story with id ${storyId} not found`);
    }

    switch (options.format) {
      case "markdown":
        return this.generateMarkdownReport(story, options);
      case 'html':
        return this.generateHTMLReport(story, options);
      case 'json':
        return this.generateJSONReport(story, options);
      case "timeline":
        return this.generateTimelineReport(story, options);
      case 'summary':
        return this.generateSummaryReport(story, options);
      default:
        return this.generateTextReport(story, options);
    }
  }

  private generateMarkdownReport(story: StoryReport, options: ReportOptions): string {
    const template = options.templates?.markdown || this.templates.markdown!;
    
    let report = `# ${story.title}\n\n`;
    report += `**Started:** ${story.startTime.toISOString()}\n`;
    if (story.endTime) {
      report += `**Ended:** ${story.endTime.toISOString()}\n`;
      report += `**Duration:** ${this.formatDuration(story.duration!)}\n`;
    }
    report += '\n';

    // Summary section
    report += '## Summary\n\n';
    report += `- Total Events: ${story.summary.totalEvents}\n`;
    report += `- Errors: ${story.summary.errors}\n`;
    report += `- Warnings: ${story.summary.warnings}\n`;
    report += `- Successes: ${story.summary.successes}\n`;
    if (story.summary.averageEventDuration) {
      report += `- Average Event Duration: ${this.formatDuration(story.summary.averageEventDuration)}\n`;
    }
    report += '\n';

    // Events timeline
    report += '## Events Timeline\n\n';
    
    const maxEvents = options.maxEvents || story.events.length;
    const events = story.events.slice(0, maxEvents);

    for (const event of events) {
      const icon = this.getEventIcon(event.type);
      const time = event.timestamp.toISOString();
      
      report += `### ${icon} ${event.title}\n`;
      report += `*${time}*`;
      if (event.duration) {
        report += ` (${this.formatDuration(event.duration)})`;
      }
      report += '\n\n';
      
      if (event.description) {
        report += `${event.description}\n\n`;
      }
      
      if (event.metadata && Object.keys(event.metadata).length > 0) {
        report += '<details>\n<summary>Metadata</summary>\n\n';
        report += '```json\n';
        report += JSON.stringify(event.metadata, null, 2);
        report += '\n```\n</details>\n\n';
      }
    }

    if (story.events.length > maxEvents) {
      report += `\n*... and ${story.events.length - maxEvents} more events*\n`;
    }

    return report;
  }

  private generateHTMLReport(story: StoryReport, options: ReportOptions): string {
    const template = options.templates?.html || this.templates.html!;
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>${story.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .event { border-left: 3px solid #ddd; padding-left: 15px; margin: 20px 0; }
    .event.error { border-color: #f44336; }
    .event.warning { border-color: #ff9800; }
    .event.success { border-color: #4caf50; }
    .timestamp { color: #666; font-size: 0.9em; }
    .metadata { background: #f9f9f9; padding: 10px; border-radius: 3px; margin-top: 10px; }
    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${story.title}</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Started:</strong> ${story.startTime.toISOString()}</p>
    ${story.endTime ? `<p><strong>Ended:</strong> ${story.endTime.toISOString()}</p>` : ''}
    ${story.duration ? `<p><strong>Duration:</strong> ${this.formatDuration(story.duration)}</p>` : ''}
    <p><strong>Total Events:</strong> ${story.summary.totalEvents}</p>
    <p><strong>Errors:</strong> ${story.summary.errors}</p>
    <p><strong>Warnings:</strong> ${story.summary.warnings}</p>
    <p><strong>Successes:</strong> ${story.summary.successes}</p>
  </div>
  
  <h2>Events Timeline</h2>`;

    const maxEvents = options.maxEvents || story.events.length;
    const events = story.events.slice(0, maxEvents);

    for (const event of events) {
      const icon = this.getEventIcon(event.type);
      html += `
  <div class="event ${event.type}">
    <h3>${icon} ${event.title}</h3>
    <div class="timestamp">${event.timestamp.toISOString()}`;
      
      if (event.duration) {
        html += ` (${this.formatDuration(event.duration)})`;
      }
      
      html += `</div>`;
      
      if (event.description) {
        html += `<p>${event.description}</p>`;
      }
      
      if (event.metadata && Object.keys(event.metadata).length > 0) {
        html += `<details class="metadata">
          <summary>Metadata</summary>
          <pre>${JSON.stringify(event.metadata, null, 2)}</pre>
        </details>`;
      }
      
      html += `</div>`;
    }

    html += `
</body>
</html>`;

    return html;
  }

  private generateJSONReport(story: StoryReport, options: ReportOptions): string {
    const report = {
      ...story,
      events: options.maxEvents 
        ? story.events.slice(0, options.maxEvents)
        : story.events,
    };
    
    return JSON.stringify(report, null, 2);
  }

  private generateTimelineReport(story: StoryReport, options: ReportOptions): string {
    let timeline = `Timeline: ${story.title}\n`;
    timeline += '='.repeat(50) + '\n\n';

    const maxEvents = options.maxEvents || story.events.length;
    const events = story.events.slice(0, maxEvents);
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const icon = this.getEventIcon(event.type);
      const time = event.timestamp.toTimeString().split(' ')[0];
      
      timeline += `${time} ${icon} ${event.title}`;
      
      if (event.duration) {
        timeline += ` (${this.formatDuration(event.duration)})`;
      }
      
      timeline += '\n';
      
      if (i < events.length - 1) {
        timeline += '   |\n';
      }
    }

    return timeline;
  }

  private generateSummaryReport(story: StoryReport, options: ReportOptions): string {
    let summary = `Story: ${story.title}\n\n`;
    summary += `Duration: ${this.formatDuration(story.duration || 0)}\n`;
    summary += `Events: ${story.summary.totalEvents}\n`;
    summary += `Errors: ${story.summary.errors}\n`;
    summary += `Warnings: ${story.summary.warnings}\n`;
    summary += `Successes: ${story.summary.successes}\n`;
    
    if (story.summary.averageEventDuration) {
      summary += `Avg Event Duration: ${this.formatDuration(story.summary.averageEventDuration)}\n`;
    }

    return summary;
  }

  private generateTextReport(story: StoryReport, options: ReportOptions): string {
    let report = `${story.title}\n`;
    report += '-'.repeat(story.title.length) + '\n\n';
    
    report += `Started: ${story.startTime.toISOString()}\n`;
    if (story.endTime) {
      report += `Ended: ${story.endTime.toISOString()}\n`;
      report += `Duration: ${this.formatDuration(story.duration!)}\n`;
    }
    report += '\n';

    const maxEvents = options.maxEvents || story.events.length;
    const events = story.events.slice(0, maxEvents);

    for (const event of events) {
      const icon = this.getEventIcon(event.type);
      report += `${icon} [${event.timestamp.toISOString()}] ${event.title}\n`;
      
      if (event.description) {
        report += `   ${event.description}\n`;
      }
    }

    return report;
  }

  private getEventIcon(type: StoryEvent['type']): string {
    const icons: Record<StoryEvent['type'], string> = {
      start: '🚀',
      action: '▶️',
      error: '❌',
      warning: '⚠️',
      success: '✅',
      end: '🏁',
    };
    
    return icons[type] || '•';
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }

  private getDefaultTemplates(): ReportTemplates {
    return {
      markdown: '',
      html: '',
      header: '',
      footer: '',
      eventTemplate: '',
    };
  }

  getStory(id: string): StoryReport | undefined {
    return this.stories.get(id);
  }

  getAllStories(): StoryReport[] {
    return Array.from(this.stories.values());
  }

  clearStories(): void {
    this.stories.clear();
    this.currentStory = undefined;
  }
}

export default StoryReporter;