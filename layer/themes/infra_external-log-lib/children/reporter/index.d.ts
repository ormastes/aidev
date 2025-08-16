/**
 * Story Reporter Module
 * Generates narrative reports from log sequences
 */
export type ReportFormat = 'markdown' | 'html' | 'json' | 'text' | 'timeline' | 'summary';
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
export declare class StoryReporter {
    private stories;
    private currentStory?;
    private templates;
    constructor();
    startStory(id: string, title: string, metadata?: Record<string, any>): StoryReport;
    endStory(id?: string): StoryReport | undefined;
    addEvent(event: StoryEvent, storyId?: string): void;
    parseLogsToStory(logs: any[], options?: {
        storyId?: string;
        title?: string;
        correlationField?: string;
    }): StoryReport;
    private logToEvent;
    private extractTitle;
    generateReport(storyId: string, options: ReportOptions): string;
    private generateMarkdownReport;
    private generateHTMLReport;
    private generateJSONReport;
    private generateTimelineReport;
    private generateSummaryReport;
    private generateTextReport;
    private getEventIcon;
    private formatDuration;
    private getDefaultTemplates;
    getStory(id: string): StoryReport | undefined;
    getAllStories(): StoryReport[];
    clearStories(): void;
}
export default StoryReporter;
//# sourceMappingURL=index.d.ts.map