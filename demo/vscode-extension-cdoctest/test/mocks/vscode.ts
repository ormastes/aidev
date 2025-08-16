/**
 * Mock implementation of VSCode API for testing
 */

export enum TestRunProfileKind {
  Run = 1,
  Debug = 2,
  Coverage = 3,
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export interface FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;
}

export class Uri {
  static file(path: string) {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string) {
    return new Uri('file', '', value, '', '');
  }

  constructor(
    readonly scheme: string,
    readonly authority: string,
    readonly path: string,
    readonly query: string,
    readonly fragment: string
  ) {}

  get fsPath(): string {
    return this.path;
  }

  toString(): string {
    return `${this.scheme}://${this.path}`;
  }
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      }
    };
  };

  fire(data: T) {
    this.listeners.forEach(listener => listener(data));
  }

  dispose() {
    this.listeners = [];
  }
}

export class CancellationTokenSource {
  private _isCancellationRequested = false;
  
  get token() {
    return {
      isCancellationRequested: this._isCancellationRequested,
      onCancellationRequested: new EventEmitter<void>().event
    };
  }

  cancel() {
    this._isCancellationRequested = true;
  }

  dispose() {
    // Cleanup
  }
}

export class TestMessage {
  constructor(public message: string) {}

  static diff(message: string, expected: string, actual: string) {
    const msg = new TestMessage(message);
    (msg as any).expectedOutput = expected;
    (msg as any).actualOutput = actual;
    return msg;
  }
}

export class TestCoverageCount {
  constructor(public covered: number, public total: number) {}
}

export class StatementCoverage {
  constructor(
    public executed: number | boolean,
    public location: Position | Range,
    public endLocation?: Position | Range
  ) {}
}

export class FileCoverage {
  public statementCoverage: TestCoverageCount;
  public branchCoverage?: TestCoverageCount;
  public declarationCoverage?: TestCoverageCount;

  constructor(
    public uri: Uri,
    statementCoverage: TestCoverageCount,
    branchCoverage?: TestCoverageCount,
    declarationCoverage?: TestCoverageCount
  ) {
    this.statementCoverage = statementCoverage;
    this.branchCoverage = branchCoverage;
    this.declarationCoverage = declarationCoverage;
  }
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(
    public start: Position | number,
    public end: Position | number,
    public startCharacter?: number,
    public endCharacter?: number
  ) {
    if (typeof start === 'number' && typeof end === 'number') {
      this.start = new Position(start, startCharacter || 0);
      this.end = new Position(end, endCharacter || 0);
    }
  }
}

export class Location {
  constructor(public uri: Uri, public range: any) {}
}

export interface WorkspaceFolder {
  readonly uri: Uri;
  readonly name: string;
  readonly index: number;
}

export interface WorkspaceConfiguration {
  get<T>(section: string): T | undefined;
  has(section: string): boolean;
  inspect<T>(section: string): { defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T } | undefined;
  update(section: string, value: any, configurationTarget?: any, overrideInLanguage?: boolean): Thenable<void>;
}

export interface TestController {
  readonly id: string;
  label: string;
  items: TestItemCollection;
  createTestItem(id: string, label: string, uri?: Uri): TestItem;
  createRunProfile(label: string, kind: TestRunProfileKind, runHandler: TestRunHandler, isDefault?: boolean, tag?: any, supportsContinuousRun?: boolean): TestRunProfile;
  createTestRun(request: TestRunRequest, name?: string, persist?: boolean): TestRun;
  refreshHandler?: (() => void | Thenable<void>) | undefined;
  dispose(): void;
}

export interface TestItemCollection {
  readonly size: number;
  replace(items: readonly TestItem[]): void;
  forEach(callback: (item: TestItem, collection: TestItemCollection) => unknown): void;
  add(item: TestItem): void;
  delete(itemId: string): void;
  get(itemId: string): TestItem | undefined;
}

export interface TestItem {
  readonly id: string;
  readonly parent?: TestItem;
  label: string;
  children: TestItemCollection;
  uri?: Uri;
  range?: any;
  error?: string | Error;
  description?: string;
  sortText?: string;
  canResolveChildren: boolean;
  busy: boolean;
  tags: readonly any[];
}

export interface TestRunProfile {
  label: string;
  kind: TestRunProfileKind;
  runHandler: TestRunHandler;
  isDefault: boolean;
  tag?: any;
  supportsContinuousRun: boolean;
  loadDetailedCoverage?: (testRun: TestRun, fileCoverage: any, token: any) => Thenable<any[]>;
  dispose(): void;
}

export type TestRunHandler = (request: TestRunRequest, token: any) => void | Thenable<void>;

export interface TestRunRequest {
  readonly include?: TestItem[] | undefined;
  readonly exclude?: TestItem[] | undefined;
  readonly profile?: TestRunProfile | undefined;
}

export interface TestRun {
  name?: string;
  token: any;
  isPersisted: boolean;
  enqueued(test: TestItem): void;
  started(test: TestItem): void;
  skipped(test: TestItem): void;
  failed(test: TestItem, message: TestMessage | readonly TestMessage[], duration?: number): void;
  errored(test: TestItem, message: TestMessage | readonly TestMessage[], duration?: number): void;
  passed(test: TestItem, duration?: number): void;
  appendOutput(output: string, location?: any, test?: TestItem): void;
  end(): void;
  addCoverage?(coverage: any): void;
  onDidDispose?: any;
}

export interface ExtensionContext {
  subscriptions: { push(disposable: any): void };
  extensionPath: string;
  extensionUri: Uri;
  globalState: any;
  workspaceState: any;
  secrets: any;
  environmentVariableCollection: any;
  asAbsolutePath(relativePath: string): string;
  storagePath?: string;
  globalStoragePath: string;
  logPath: string;
}

// Global exports
export const workspace = {
  getConfiguration: jest.fn((section?: string, scope?: any) => ({
    get: jest.fn((key: string) => undefined),
    has: jest.fn((key: string) => false),
    inspect: jest.fn((key: string) => undefined),
    update: jest.fn((key: string, value: any) => Promise.resolve())
  } as WorkspaceConfiguration)),
  workspaceFolders: [] as WorkspaceFolder[],
  onDidChangeWorkspaceFolders: new EventEmitter<any>().event,
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
  },
  createFileSystemWatcher: jest.fn(() => ({
    onDidChange: jest.fn(),
    onDidCreate: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn()
  }))
};

export const window = {
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    append: jest.fn(),
    appendLine: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn()
  })),
  createStatusBarItem: jest.fn((alignment?: StatusBarAlignment, priority?: number) => {
    const item = new StatusBarItem();
    item.alignment = alignment || StatusBarAlignment.Left;
    item.priority = priority || 0;
    return item;
  })
};

export const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn()
};

export const tests = {
  createTestController: jest.fn((id: string, label: string) => {
    const items = new Map<string, TestItem>();
    
    const collection: TestItemCollection = {
      size: items.size,
      replace: jest.fn((newItems: readonly TestItem[]) => {
        items.clear();
        newItems.forEach(item => items.set(item.id, item));
      }),
      forEach: jest.fn((callback) => {
        items.forEach((item) => callback(item, collection));
      }),
      add: jest.fn((item: TestItem) => {
        items.set(item.id, item);
      }),
      delete: jest.fn((itemId: string) => {
        items.delete(itemId);
      }),
      get: jest.fn((itemId: string) => items.get(itemId))
    };

    const controller: TestController = {
      id,
      label,
      items: collection,
      createTestItem: jest.fn((id: string, label: string, uri?: Uri) => {
        const childItems = new Map<string, TestItem>();
        const childCollection: TestItemCollection = {
          size: childItems.size,
          replace: jest.fn(),
          forEach: jest.fn((callback) => {
            childItems.forEach((item) => callback(item, childCollection));
          }),
          add: jest.fn((item: TestItem) => {
            childItems.set(item.id, item);
          }),
          delete: jest.fn((itemId: string) => {
            childItems.delete(itemId);
          }),
          get: jest.fn((itemId: string) => childItems.get(itemId))
        };

        return {
          id,
          label,
          children: childCollection,
          uri,
          canResolveChildren: false,
          busy: false,
          tags: []
        } as TestItem;
      }),
      createRunProfile: jest.fn((label, kind, runHandler, isDefault, tag, supportsContinuousRun) => ({
        label,
        kind,
        runHandler,
        isDefault: isDefault ?? true,
        tag,
        supportsContinuousRun: supportsContinuousRun ?? false,
        dispose: jest.fn()
      } as TestRunProfile)),
      createTestRun: jest.fn((request, name, persist) => ({
        name,
        token: new CancellationTokenSource().token,
        isPersisted: persist ?? false,
        enqueued: jest.fn(),
        started: jest.fn(),
        skipped: jest.fn(),
        failed: jest.fn(),
        errored: jest.fn(),
        passed: jest.fn(),
        appendOutput: jest.fn(),
        end: jest.fn()
      } as TestRun)),
      refreshHandler: undefined,
      dispose: jest.fn()
    };

    return controller;
  })
};

export const debug = {
  activeDebugSession: undefined,
  startDebugging: jest.fn(),
  onDidStartDebugSession: new EventEmitter<any>().event,
  onDidTerminateDebugSession: new EventEmitter<any>().event,
  registerDebugAdapterTrackerFactory: jest.fn()
};

export enum StatusBarAlignment {
  Left = 1,
  Right = 2
}

export class ThemeColor {
  constructor(public id: string) {}
}

export class StatusBarItem {
  text = '';
  tooltip = '';
  color?: string;
  backgroundColor?: ThemeColor;
  command?: string;
  alignment = StatusBarAlignment.Left;
  priority = 0;
  show = jest.fn();
  hide = jest.fn();
  dispose = jest.fn();
}

// Create namespace object with all exports
const vscode = {
  workspace,
  window,
  commands,
  tests,
  debug,
  Uri,
  EventEmitter,
  CancellationTokenSource,
  TestMessage,
  TestCoverageCount,
  StatementCoverage,
  FileCoverage,
  Position,
  Range,
  Location,
  TestRunProfileKind,
  FileType,
  StatusBarAlignment,
  StatusBarItem,
  ThemeColor
};

// Use CommonJS export for better compatibility with Jest moduleNameMapper
module.exports = vscode;