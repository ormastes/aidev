import {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MCPMethod,
  Tool,
  ToolCall,
  ToolResult,
  Resource,
  ResourceContent,
  Prompt,
  PromptMessage,
  SamplingMessage,
  CreateMessageRequest,
  CreateMessageResult,
  ServerCapabilities,
  InitializeRequest,
  InitializeResult,
  ProgressNotification,
  LogMessage,
  MCPTransport,
  MCPConnectionConfig,
  MCPProtocol
} from '../../children/src/domain/protocol';

describe('MCP Protocol', () => {
  describe('MCPRequest', () => {
    it('should create valid MCP request', () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };

      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe(1);
      expect(request.method).toBe('tools/list');
      expect(request.params).toEqual({});
    });

    it('should handle request without params', () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'initialize'
      };

      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe('test-123');
      expect(request.method).toBe('initialize');
      expect(request.params).toBeUndefined();
    });

    it('should support string and number IDs', () => {
      const stringId: MCPRequest = {
        jsonrpc: '2.0',
        id: 'string-id',
        method: 'test'
      };

      const numberId: MCPRequest = {
        jsonrpc: '2.0',
        id: 42,
        method: 'test'
      };

      expect(typeof stringId.id).toBe('string');
      expect(typeof numberId.id).toBe('number');
    });
  });

  describe('MCPResponse', () => {
    it('should create successful response', () => {
      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { success: true, data: 'test' }
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toEqual({ success: true, data: 'test' });
      expect(response.error).toBeUndefined();
    });

    it('should create error response', () => {
      const error: MCPError = {
        code: -32602,
        message: 'Invalid params',
        data: { field: 'required' }
      };

      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: 1,
        error
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.error).toEqual(error);
      expect(response.result).toBeUndefined();
    });
  });

  describe('MCPNotification', () => {
    it('should create notification without ID', () => {
      const notification: MCPNotification = {
        jsonrpc: '2.0',
        method: 'notification/test',
        params: { message: 'hello' }
      };

      expect(notification.jsonrpc).toBe('2.0');
      expect(notification.method).toBe('notification/test');
      expect(notification.params).toEqual({ message: 'hello' });
      expect('id' in notification).toBe(false);
    });
  });

  describe('MCPMethod enum', () => {
    it('should contain all required methods', () => {
      expect(MCPMethod.INITIALIZE).toBe('initialize');
      expect(MCPMethod.INITIALIZED).toBe('initialized');
      expect(MCPMethod.SHUTDOWN).toBe('shutdown');
      expect(MCPMethod.LIST_TOOLS).toBe('tools/list');
      expect(MCPMethod.CALL_TOOL).toBe('tools/call');
      expect(MCPMethod.LIST_RESOURCES).toBe('resources/list');
      expect(MCPMethod.READ_RESOURCE).toBe('resources/read');
      expect(MCPMethod.LIST_PROMPTS).toBe('prompts/list');
      expect(MCPMethod.GET_PROMPT).toBe('prompts/get');
      expect(MCPMethod.CREATE_MESSAGE).toBe('sampling/createMessage');
      expect(MCPMethod.PROGRESS).toBe('notifications/progress');
      expect(MCPMethod.LOG_MESSAGE).toBe('notifications/message');
      expect(MCPMethod.RESOURCE_UPDATED).toBe('notifications/resources/updated');
    });
  });

  describe('Tool interfaces', () => {
    it('should create valid Tool definition', () => {
      const tool: Tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          },
          required: ['input']
        }
      };

      expect(tool.name).toBe('test_tool');
      expect(tool.description).toBe('A test tool');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('input');
    });

    it('should create valid ToolCall', () => {
      const toolCall: ToolCall = {
        name: 'test_tool',
        arguments: {
          input: 'test input',
          count: 5
        }
      };

      expect(toolCall.name).toBe('test_tool');
      expect(toolCall.arguments!.input).toBe('test input');
      expect(toolCall.arguments!.count).toBe(5);
    });

    it('should create valid ToolResult', () => {
      const result: ToolResult = {
        content: [
          { type: 'text', text: 'Operation completed successfully' }
        ],
        isError: false
      };

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Operation completed successfully');
      expect(result.isError).toBe(false);
    });

    it('should create error ToolResult', () => {
      const errorResult: ToolResult = {
        content: [
          { type: 'text', text: 'Tool execution failed' }
        ],
        isError: true
      };

      expect(errorResult.content[0].text).toBe('Tool execution failed');
      expect(errorResult.isError).toBe(true);
    });

    it('should handle image content in ToolResult', () => {
      const result: ToolResult = {
        content: [
          { 
            type: 'image', 
            data: 'base64ImageData',
            mimeType: 'image/png'
          }
        ]
      };

      expect(result.content[0].type).toBe('image');
      expect(result.content[0].data).toBe('base64ImageData');
      expect(result.content[0].mimeType).toBe('image/png');
    });

    it('should handle resource content in ToolResult', () => {
      const result: ToolResult = {
        content: [
          { 
            type: 'resource', 
            uri: 'file:///path/to/resource'
          }
        ]
      };

      expect(result.content[0].type).toBe('resource');
      expect(result.content[0].uri).toBe('file:///path/to/resource');
    });
  });

  describe('Resource interfaces', () => {
    it('should create valid Resource', () => {
      const resource: Resource = {
        uri: 'file:///path/to/file.txt',
        name: 'test file',
        description: 'A test file resource',
        mimeType: 'text/plain'
      };

      expect(resource.uri).toBe('file:///path/to/file.txt');
      expect(resource.name).toBe('test file');
      expect(resource.mimeType).toBe('text/plain');
    });

    it('should create valid ResourceContent', () => {
      const content: ResourceContent = {
        uri: 'file:///path/to/file.txt',
        mimeType: 'text/plain',
        text: 'File contents here'
      };

      expect(content.uri).toBe('file:///path/to/file.txt');
      expect(content.text).toBe('File contents here');
      expect(content.mimeType).toBe('text/plain');
    });

    it('should handle binary ResourceContent', () => {
      const content: ResourceContent = {
        uri: 'file:///path/to/image.png',
        mimeType: 'image/png',
        blob: 'base64EncodedData'
      };

      expect(content.blob).toBe('base64EncodedData');
      expect(content.text).toBeUndefined();
    });
  });

  describe('Prompt interfaces', () => {
    it('should create valid Prompt', () => {
      const prompt: Prompt = {
        name: 'generate_code',
        description: 'Generate code based on requirements',
        arguments: [
          {
            name: 'language',
            description: 'Programming language',
            required: true
          },
          {
            name: 'requirements',
            description: 'Code requirements',
            required: true
          }
        ]
      };

      expect(prompt.name).toBe('generate_code');
      expect(prompt.arguments).toHaveLength(2);
      expect(prompt.arguments![0].required).toBe(true);
    });

    it('should create valid PromptMessage', () => {
      const message: PromptMessage = {
        role: 'user',
        content: {
          type: 'text',
          text: 'Generate a hello world program'
        }
      };

      expect(message.role).toBe('user');
      expect(message.content.type).toBe('text');
      expect(message.content.text).toBe('Generate a hello world program');
    });

    it('should handle image PromptMessage', () => {
      const message: PromptMessage = {
        role: 'assistant',
        content: {
          type: 'image',
          data: 'base64ImageData',
          mimeType: 'image/png'
        }
      };

      expect(message.content.type).toBe('image');
      expect(message.content.data).toBe('base64ImageData');
    });
  });

  describe('Sampling interfaces', () => {
    it('should create valid SamplingMessage', () => {
      const message: SamplingMessage = {
        role: 'user',
        content: {
          type: 'text',
          text: 'User input'
        }
      };

      expect(message.role).toBe('user');
      expect(message.content.type).toBe('text');
    });

    it('should create valid CreateMessageRequest', () => {
      const request: CreateMessageRequest = {
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: 'Hello' }
          }
        ],
        modelPreferences: {
          hints: [{ name: 'gpt-4' }],
          costPriority: 0.5,
          speedPriority: 0.3,
          intelligencePriority: 0.2
        },
        systemPrompt: 'You are a helpful assistant',
        includeContext: 'thisServer',
        temperature: 0.7,
        maxTokens: 1000,
        stopSequences: ['\\n\\n'],
        metadata: { requestId: '123' }
      };

      expect(request.messages).toHaveLength(1);
      expect(request.modelPreferences?.hints![0].name).toBe('gpt-4');
      expect(request.temperature).toBe(0.7);
    });

    it('should create valid CreateMessageResult', () => {
      const result: CreateMessageResult = {
        role: 'assistant',
        content: {
          type: 'text',
          text: 'Generated response'
        },
        model: 'gpt-4',
        stopReason: 'endTurn'
      };

      expect(result.role).toBe('assistant');
      expect(result.content.text).toBe('Generated response');
      expect(result.stopReason).toBe('endTurn');
    });
  });

  describe('ServerCapabilities', () => {
    it('should define complete capabilities structure', () => {
      const capabilities: ServerCapabilities = {
        tools: {
          'file_reader': {
            name: 'file_reader',
            inputSchema: { type: 'object' }
          }
        },
        resources: {
          subscribe: true,
          listChanged: true
        },
        prompts: {
          listChanged: true
        },
        logging: {
          levels: ['debug', 'info', 'warning', 'error']
        }
      };

      expect(capabilities.tools!['file_reader'].name).toBe('file_reader');
      expect(capabilities.resources?.subscribe).toBe(true);
      expect(capabilities.logging?.levels).toContain('debug');
    });
  });

  describe('Initialize interfaces', () => {
    it('should create valid InitializeRequest', () => {
      const request: InitializeRequest = {
        protocolVersion: '1.0',
        capabilities: {
          roots: [
            { uri: 'file:///workspace', name: 'Workspace' }
          ],
          sampling: { temperature: 0.8 }
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      };

      expect(request.protocolVersion).toBe('1.0');
      expect(request.capabilities.roots![0].uri).toBe('file:///workspace');
      expect(request.clientInfo.name).toBe('test-client');
    });

    it('should create valid InitializeResult', () => {
      const result: InitializeResult = {
        protocolVersion: '1.0',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'test-server',
          version: '2.0.0'
        }
      };

      expect(result.protocolVersion).toBe('1.0');
      expect(result.serverInfo.name).toBe('test-server');
    });
  });

  describe('Notifications', () => {
    it('should create valid ProgressNotification', () => {
      const progress: ProgressNotification = {
        progressToken: 'task-123',
        progress: 50,
        total: 100
      };

      expect(progress.progressToken).toBe('task-123');
      expect(progress.progress).toBe(50);
      expect(progress.total).toBe(100);
    });

    it('should create valid LogMessage', () => {
      const log: LogMessage = {
        level: 'error',
        logger: 'file-handler',
        data: { error: 'File not found' }
      };

      expect(log.level).toBe('error');
      expect(log.logger).toBe('file-handler');
      expect(log.data.error).toBe('File not found');
    });
  });

  describe('Connection types', () => {
    it('should handle stdio transport config', () => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'mcp-server',
        args: ['--debug']
      };

      expect(config.transport).toBe('stdio');
      expect(config.command).toBe('mcp-server');
      expect(config.args).toContain('--debug');
    });

    it('should handle websocket transport config', () => {
      const config: MCPConnectionConfig = {
        transport: 'websocket',
        url: 'ws://localhost:8080',
        headers: {
          'Authorization': 'Bearer token'
        }
      };

      expect(config.transport).toBe('websocket');
      expect(config.url).toBe('ws://localhost:8080');
      expect(config.headers!['Authorization']).toBe('Bearer token');
    });
  });

  describe('MCPProtocol helper class', () => {
    describe('createRequest', () => {
      it('should create request with auto-generated ID', () => {
        const request = MCPProtocol.createRequest(MCPMethod.LIST_TOOLS, { category: 'test' });

        expect(request.jsonrpc).toBe('2.0');
        expect(request.method).toBe('tools/list');
        expect(request.params).toEqual({ category: 'test' });
        expect(request.id).toBeDefined();
        expect(typeof request.id).toBe('number');
      });

      it('should create request with custom ID', () => {
        const request = MCPProtocol.createRequest(MCPMethod.INITIALIZE, {}, 'custom-id');

        expect(request.id).toBe('custom-id');
      });

      it('should create request without params', () => {
        const request = MCPProtocol.createRequest(MCPMethod.SHUTDOWN);

        expect(request.params).toBeUndefined();
      });
    });

    describe('createResponse', () => {
      it('should create success response', () => {
        const response = MCPProtocol.createResponse('test-id', { result: 'success' });

        expect(response.jsonrpc).toBe('2.0');
        expect(response.id).toBe('test-id');
        expect(response.result).toEqual({ result: 'success' });
        expect(response.error).toBeUndefined();
      });

      it('should create error response', () => {
        const error = MCPProtocol.createError(-32602, 'Invalid params');
        const response = MCPProtocol.createResponse('test-id', undefined, error);

        expect(response.id).toBe('test-id');
        expect(response.error).toEqual(error);
        expect(response.result).toBeUndefined();
      });

      it('should handle number ID', () => {
        const response = MCPProtocol.createResponse(123, { data: 'test' });

        expect(response.id).toBe(123);
      });
    });

    describe('createNotification', () => {
      it('should create notification', () => {
        const notification = MCPProtocol.createNotification(MCPMethod.PROGRESS, {
          progressToken: 'task-1',
          progress: 25
        });

        expect(notification.jsonrpc).toBe('2.0');
        expect(notification.method).toBe('notifications/progress');
        expect(notification.params.progressToken).toBe('task-1');
        expect('id' in notification).toBe(false);
      });
    });

    describe('createError', () => {
      it('should create error with code and message', () => {
        const error = MCPProtocol.createError(-32601, 'Method not found');

        expect(error.code).toBe(-32601);
        expect(error.message).toBe('Method not found');
        expect(error.data).toBeUndefined();
      });

      it('should create error with additional data', () => {
        const error = MCPProtocol.createError(-32602, 'Invalid params', { field: 'required' });

        expect(error.code).toBe(-32602);
        expect(error.data).toEqual({ field: 'required' });
      });
    });

    describe('ErrorCodes', () => {
      it('should have standard JSON-RPC error codes', () => {
        expect(MCPProtocol.ErrorCodes.PARSE_ERROR).toBe(-32700);
        expect(MCPProtocol.ErrorCodes.INVALID_REQUEST).toBe(-32600);
        expect(MCPProtocol.ErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
        expect(MCPProtocol.ErrorCodes.INVALID_PARAMS).toBe(-32602);
        expect(MCPProtocol.ErrorCodes.INTERNAL_ERROR).toBe(-32603);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty tool arguments', () => {
      const toolCall: ToolCall = {
        name: 'no_args_tool'
      };

      expect(toolCall.arguments).toBeUndefined();
    });

    it('should handle very large tool arguments', () => {
      const largeArgs = {
        data: 'x'.repeat(1000000)
      };

      const toolCall: ToolCall = {
        name: 'large_tool',
        arguments: largeArgs
      };

      expect(toolCall.arguments!.data.length).toBe(1000000);
    });

    it('should handle special characters in various fields', () => {
      const tool: Tool = {
        name: 'tool-with_special.chars@domain',
        description: 'Tool with "quotes" and \'apostrophes\'',
        inputSchema: { type: 'object' }
      };

      expect(tool.name).toBe('tool-with_special.chars@domain');
      expect(tool.description).toContain('"quotes"');
    });

    it('should handle deeply nested parameters', () => {
      const complexParams = {
        config: {
          nested: {
            deeply: {
              value: 'test',
              array: [1, 2, { item: 'value' }]
            }
          }
        }
      };

      const request = MCPProtocol.createRequest(MCPMethod.CALL_TOOL, complexParams);

      expect(request.params.config.nested.deeply.value).toBe('test');
      expect(request.params.config.nested.deeply.array[2].item).toBe('value');
    });

    it('should handle malformed URIs gracefully', () => {
      const resource: Resource = {
        uri: 'not://a valid/uri with spaces',
        name: 'malformed'
      };

      expect(resource.uri).toBe('not://a valid/uri with spaces');
    });

    it('should handle empty arrays in capabilities', () => {
      const capabilities: ServerCapabilities = {
        logging: {
          levels: []
        }
      };

      expect(capabilities.logging?.levels).toEqual([]);
    });

    it('should handle null values in optional fields', () => {
      const request: CreateMessageRequest = {
        messages: [],
        systemPrompt: undefined,
        temperature: undefined,
        maxTokens: undefined
      };

      expect(request.systemPrompt).toBeUndefined();
      expect(request.temperature).toBeUndefined();
    });
  });
});