import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/runner', () => jest.fn());
jest.mock('../../../src/config', () => ({
  Config: jest.fn().mockImplementation(() => ({
    executable: '/usr/bin/test',
    buildDirectory: '/build'
  }))
}));

jest.mock('vscode', () => ({
  TestRunProfileKind: {
    Run: 1,
    Debug: 2
  },
  tests: {
    createTestController: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn()
    })),
    workspaceFolders: []
  }
}));

describe("Controller", () => {
  let setupController: any;
  let getConfigByController: any;
  let mockController: any;
  let mockRunProfile: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock controller
    mockController = {
      id: "cdoctest",
      label: "CDocTest",
      items: {
        forEach: jest.fn(),
        add: jest.fn(),
        delete: jest.fn(),
        get: jest.fn()
      },
      createRunProfile: jest.fn(),
      createTestRun: jest.fn(),
      refreshHandler: undefined,
      dispose: jest.fn()
    };

    mockRunProfile = {
      runHandler: undefined,
      dispose: jest.fn()
    };

    const vscode = require('vscode');
    vscode.tests.createTestController.mockReturnValue(mockController);
    mockController.createRunProfile.mockReturnValue(mockRunProfile);

    // Import after mocking
    const controllerModule = await import('../../../src/controller/controller');
    setupController = controllerModule.setupController;
    getConfigByController = controllerModule.getConfigByController;
  });

  test('should setup controller', () => {
    const mockContext = {
      subscriptions: [],
      extensionPath: '/test/ext'
    };

    const controller = setupController(mockContext);

    const vscode = require('vscode');
    expect(vscode.tests.createTestController).toHaveBeenCalled();
    expect(controller).toBeDefined();
  });

  test('should return undefined when no controller found', () => {
    const result = getConfigByController(mockController);
    expect(result).toBeUndefined();
  });

  test('should setup controller with context', () => {
    const mockContext = {
      subscriptions: [],
      extensionPath: '/test/ext'
    };

    setupController(mockContext);

    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });

  test('should handle missing workspace folders', () => {
    const mockContext = {
      subscriptions: [],
      extensionPath: '/test/ext'
    };
    
    const vscode = require('vscode');
    vscode.workspace = { workspaceFolders: undefined };

    const controller = setupController(mockContext);
    
    expect(controller).toBeDefined();
  });
});