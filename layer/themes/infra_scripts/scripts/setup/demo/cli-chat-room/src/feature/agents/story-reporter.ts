/**
 * Story Reporter Agent
 * Reports on stories and events happening in the chat room
 */

import { BaseCoordinatorAgent } from './coordinator-interface';
import { WSMessage, MessageType } from '../types/messages';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../../../../infra_external-log-lib/src';

export interface StoryReporterConfig {
  reportInterval?: number; // milliseconds
  storyLogDir?: string;
  themes?: string[];
}

export class StoryReporterAgent extends BaseCoordinatorAgent {
  private config: StoryReporterConfig;
  private storyBuffer: any[] = [];
  private reportTimer?: NodeJS.Timeout;
  private storyCount = 0;
  private themes: string[];

  constructor(
    serverUrl: string,
    roomId: string,
    agentName: string = 'StoryReporter',
    config: StoryReporterConfig = {}
  ) {
    super(serverUrl, roomId, agentName);
    
    this.config = {
      reportInterval: config.reportInterval || 60000, // 1 minute default
      storyLogDir: config.storyLogDir || path.join(process.cwd(), 'logs', 'stories'),
      themes: config.themes || ['general', 'technical', 'social', 'system']
    };
    
    this.themes = this.config.themes!;
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (this.config.storyLogDir && !fs.existsSync(this.config.storyLogDir)) {
      fs.mkdirSync(this.config.storyLogDir, { recursive: true });
    }
  }

  protected async handleConnect(): Promise<void> {
    await super.handleConnect();
    console.log(`📰 Story Reporter connected to room ${this.roomId}`);
    
    // Start periodic reporting
    this.startReporting();
    
    // Announce presence
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: "📰 Story Reporter is now tracking events and stories in this room.",
      metadata: {
        agent: this.agentName,
        capability: 'story_reporting'
      }
    });
  }

  protected async handleMessage(message: WSMessage<any>): Promise<void> {
    // Track all messages for story analysis
    this.trackEvent(message);
    
    // Check for story requests
    if (message.type === MessageType.USER_MESSAGE) {
      const content = message.content.toLowerCase();
      
      if (content.includes('story') || content.includes('report') || content.includes('what happened')) {
        await this.generateStoryReport(message.sender);
      } else if (content.includes('theme')) {
        await this.reportThemes();
      }
    }
  }

  private trackEvent(message: WSMessage<any>): void {
    const event = {
      timestamp: new Date(),
      type: message.type,
      sender: message.sender,
      content: message.content,
      theme: this.detectTheme(message.content),
      metadata: message.metadata
    };
    
    this.storyBuffer.push(event);
    
    // Keep buffer size manageable
    if (this.storyBuffer.length > 1000) {
      this.storyBuffer = this.storyBuffer.slice(-500);
    }
  }

  private detectTheme(content: string): string {
    const lowerContent = content.toLowerCase();
    
    // Technical theme detection
    if (lowerContent.match(/code|program|bug|error|api|database|server|client/)) {
      return 'technical';
    }
    
    // Social theme detection
    if (lowerContent.match(/hello|hi|bye|thanks|please|sorry|welcome/)) {
      return 'social';
    }
    
    // System theme detection
    if (lowerContent.match(/joined|left|connected|disconnected|system/)) {
      return 'system';
    }
    
    // External theme detection
    if (lowerContent.match(/http|api|external|network|request/)) {
      return 'external';
    }
    
    return 'general';
  }

  private startReporting(): void {
    this.reportTimer = setInterval(() => {
      this.generatePeriodicReport();
    }, this.config.reportInterval!);
  }

  private async generatePeriodicReport(): Promise<void> {
    if (this.storyBuffer.length === 0) return;
    
    const report = this.createStoryReport();
    
    // Save to file
    if (this.config.storyLogDir) {
      const filename = `story-${Date.now()}.json`;
      const filepath = path.join(this.config.storyLogDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    }
    
    // Send summary to chat
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: `📰 **Periodic Story Report**\n${this.summarizeReport(report)}`,
      metadata: {
        agent: this.agentName,
        reportType: 'periodic',
        eventCount: report.events.length
      }
    });
    
    this.storyCount++;
  }

  private createStoryReport(): any {
    const now = new Date();
    const events = [...this.storyBuffer];
    
    // Theme analysis
    const themeCount: Record<string, number> = {};
    events.forEach(event => {
      themeCount[event.theme] = (themeCount[event.theme] || 0) + 1;
    });
    
    // User activity
    const userActivity: Record<string, number> = {};
    events.forEach(event => {
      if (event.sender && event.sender !== 'System') {
        userActivity[event.sender] = (userActivity[event.sender] || 0) + 1;
      }
    });
    
    // Key events
    const keyEvents = events.filter(event => 
      event.type === MessageType.USER_JOINED ||
      event.type === MessageType.USER_LEFT ||
      event.content.includes('!')
    );
    
    return {
      reportId: `story-${this.storyCount}`,
      timestamp: now,
      roomId: this.roomId,
      duration: this.config.reportInterval,
      events: events,
      analysis: {
        totalEvents: events.length,
        themes: themeCount,
        activeUsers: Object.keys(userActivity).length,
        userActivity: userActivity,
        keyEvents: keyEvents.length,
        averageEventsPerMinute: (events.length / (this.config.reportInterval! / 60000)).toFixed(2)
      },
      narrative: this.generateNarrative(events, themeCount, userActivity)
    };
  }

  private generateNarrative(events: any[], themes: Record<string, number>, users: Record<string, number>): string {
    const dominantTheme = Object.entries(themes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
    const mostActiveUser = Object.entries(users).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    
    const narratives = {
      technical: `A technical discussion dominated the room with ${themes.technical || 0} technical exchanges.`,
      social: `Social interactions were prominent with ${themes.social || 0} friendly exchanges.`,
      system: `System activity was high with ${themes.system || 0} system events.`,
      external: `External integrations were active with ${themes.external || 0} external calls.`,
      general: `General conversation flowed with ${themes.general || 0} messages.`
    };
    
    return `${narratives[dominantTheme as keyof typeof narratives]} ${mostActiveUser} was the most active participant with ${users[mostActiveUser]} contributions.`;
  }

  private summarizeReport(report: any): string {
    return `
- Total Events: ${report.analysis.totalEvents}
- Active Users: ${report.analysis.activeUsers}
- Dominant Theme: ${Object.entries(report.analysis.themes).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'none'}
- Story: ${report.narrative}
`;
  }

  private async generateStoryReport(requester?: string): Promise<void> {
    const report = this.createStoryReport();
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: `📰 **Story Report${requester ? ` for ${requester}` : ''}**\n${this.summarizeReport(report)}`,
      metadata: {
        agent: this.agentName,
        reportType: 'requested',
        requester
      }
    });
  }

  private async reportThemes(): Promise<void> {
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: `📰 **Available Story Themes**: ${this.themes.join(', ')}`,
      metadata: {
        agent: this.agentName,
        themes: this.themes
      }
    });
  }

  public async shutdown(): Promise<void> {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
    
    // Generate final report
    await this.generatePeriodicReport();
    
    await super.shutdown();
  }
}

// Export factory function
export function createStoryReporter(
  serverUrl: string,
  roomId: string,
  agentName?: string,
  config?: StoryReporterConfig
): StoryReporterAgent {
  return new StoryReporterAgent(serverUrl, roomId, agentName, config);
}