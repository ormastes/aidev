export class Logger {
  private logs: string[] = [];

  log(message: string): void {
    this.logs.push(message);
  }

  warn(message: string): void {
    this.logs.push(`[WARN] ${message}`);
  }

  error(message: string): void {
    this.logs.push(`[ERROR] ${message}`);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  getLogCount(): number {
    return this.logs.length;
  }
}