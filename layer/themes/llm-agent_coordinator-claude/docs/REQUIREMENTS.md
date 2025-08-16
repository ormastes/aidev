# Coordinator Claude Agent Requirements

## Functional Requirements

### 1. Claude API Integration
- **FR-1.1**: Support Claude API v2023-06-01 or later with streaming capabilities
- **FR-1.2**: Handle JSON stream input and output using server-sent events (SSE)
- **FR-1.3**: Support multiple Claude models (Opus, Sonnet, Haiku)
- **FR-1.4**: Implement retry logic with exponential backoff for API failures
- **FR-1.5**: Handle rate limiting with appropriate delays and queuing

### 2. Session Management
- **FR-2.1**: Create persistent sessions with unique identifiers
- **FR-2.2**: Save In Progress session state including:
  - Conversation history
  - Current execution context
  - Permission settings
  - Task queue position
  - Integration states
- **FR-2.3**: Implement clean shutdown interface that preserves session
- **FR-2.4**: Support session resume with full state restoration
- **FR-2.5**: Handle session versioning for backward compatibility

### 3. Permission Control
- **FR-3.1**: Implement "dangerously skip permissions" mode
- **FR-3.2**: Support granular tool permissions configuration
- **FR-3.3**: Allow runtime permission mode switching
- **FR-3.4**: Audit and log all permission-related actions
- **FR-3.5**: Implement safety checks even in dangerous mode (configurable)

### 4. Interrupt Handling
- **FR-4.1**: Detect user prompt insertion during execution
- **FR-4.2**: Pause current task execution gracefully
- **FR-4.3**: Save execution state at interrupt point
- **FR-4.4**: Support clean restart with state recovery
- **FR-4.5**: Continue task queue from interruption point

### 5. Stream Processing
- **FR-5.1**: Parse JSON stream input in real-time
- **FR-5.2**: Format responses as JSON stream output
- **FR-5.3**: Handle partial JSON objects in streams
- **FR-5.4**: Implement stream buffering and backpressure
- **FR-5.5**: Support multiple concurrent streams

### 6. Task Queue Management
- **FR-6.1**: Read and parse TASK_QUEUE.md format
- **FR-6.2**: Track task execution progress
- **FR-6.3**: Update task status in queue
- **FR-6.4**: Support task dependencies and ordering
- **FR-6.5**: Handle task failures and retries

### 7. Integration Requirements

#### Chat-Space Integration
- **FR-7.1**: Connect to chat-room CLI via EventEmitter
- **FR-7.2**: Receive commands from chat interface
- **FR-7.3**: Send status updates to chat rooms
- **FR-7.4**: Support multi-user coordination
- **FR-7.5**: Handle chat-based interrupts

#### PocketFlow Integration
- **FR-7.6**: Trigger PocketFlow workflows
- **FR-7.7**: Receive workflow status updates
- **FR-7.8**: Coordinate workflow execution with tasks
- **FR-7.9**: Map task outputs to workflow inputs
- **FR-7.10**: Handle workflow failures gracefully

## Non-Functional Requirements

### Performance
- **NFR-1.1**: Handle streams with < 100ms latency
- **NFR-1.2**: Support sessions up to 100MB in size
- **NFR-1.3**: Process interrupts within 500ms
- **NFR-1.4**: Maintain < 5 second session save time
- **NFR-1.5**: Support 10+ concurrent sessions

### Reliability
- **NFR-2.1**: 99.9% session recovery IN PROGRESS rate
- **NFR-2.2**: Zero data loss on clean shutdown
- **NFR-2.3**: Graceful degradation on API failures
- **NFR-2.4**: Automatic reconnection on network issues
- **NFR-2.5**: Session corruption detection and recovery

### Security
- **NFR-3.1**: Encrypt sensitive session data
- **NFR-3.2**: Secure API key storage
- **NFR-3.3**: Audit logging for all actions
- **NFR-3.4**: Permission validation at runtime
- **NFR-3.5**: Sandboxed execution environment

### Usability
- **NFR-4.1**: Clear error messages and recovery steps
- **NFR-4.2**: Progress indicators for long operations
- **NFR-4.3**: Intuitive CLI interface
- **NFR-4.4**: Comprehensive documentation
- **NFR-4.5**: Example configurations

### Compatibility
- **NFR-5.1**: Node.js 18+ support
- **NFR-5.2**: Cross-platform (Windows, macOS, Linux)
- **NFR-5.3**: TypeScript 5.0+ compatibility
- **NFR-5.4**: ESM and CommonJS module support
- **NFR-5.5**: Docker containerization ready

## Technical Constraints

### API Limitations
- Claude API timeout: 60 minutes for inference calls
- Rate limits vary by model and tier
- Maximum context window depends on model
- Streaming requires SSE support

### Architecture Constraints
- Must follow Hierarchical Encapsulation Architecture (HEA)
- Event-driven communication between layers
- No direct external library imports without abstraction
- Mock-Free Test Oriented Development (MFTOD)

### Integration Constraints
- Chat-space theme must be running for chat integration
- PocketFlow must be initialized for workflow features
- TASK_QUEUE.md must follow specified format
- All integrations via EventEmitter pattern

## IN PROGRESS Criteria

1. Working on tasks with dangerous permissions enabled
2. Handle user interrupts without data loss
3. Resume sessions with full context restoration
4. Integrate seamlessly with chat-space and pocketflow
5. Maintain audit trail of all operations
6. Pass all MFTOD test levels (unit, integration, external, system, env)