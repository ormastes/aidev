/**
 * Log Parser Module
 * Parses and structures various log formats
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogFormat = 'json' | 'plain' | 'structured' | 'syslog' | 'apache' | 'nginx' | 'python' | 'java' | 'custom';
export interface StructuredData {
    [key: string]: string | number | boolean | StructuredData | StructuredData[];
}
export interface ParsedLog {
    timestamp?: Date;
    level?: LogLevel;
    message: string;
    source?: string;
    category?: string;
    fields?: StructuredData;
    raw: string;
    format: LogFormat;
    metadata?: Record<string, any>;
}
export interface ParserConfig {
    format: LogFormat;
    customPattern?: RegExp;
    timestampFormat?: string;
    levelMapping?: Record<string, LogLevel>;
    fieldExtractors?: Array<{
        pattern: RegExp;
        fields: string[];
    }>;
    multiline?: {
        startPattern: RegExp;
        endPattern?: RegExp;
    };
}
export declare class LogParser {
    private config;
    private multilineBuffer;
    private isMultiline;
    private static readonly PATTERNS;
    private static readonly LEVEL_MAPS;
    constructor(config: ParserConfig);
    parse(line: string): ParsedLog | null;
    private handleMultiline;
    private parseJSON;
    private parseSyslog;
    private parseApache;
    private parseNginx;
    private parsePython;
    private parseJava;
    private parseStructured;
    private parseCustom;
    private parsePlain;
    private extractTimestamp;
    private extractLevel;
    private extractFields;
    private parseTimestamp;
    private normalizeLevel;
    private getLogLevelFromStatus;
    private parseValue;
    reset(): void;
}
export default LogParser;
//# sourceMappingURL=index.d.ts.map