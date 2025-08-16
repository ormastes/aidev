# Theme Integration Research Document

## Overview
This document outlines the relationships and integration patterns between themes in the AI Development Platform, with specific focus on how the AI Dev Portal will orchestrate multi-theme cooperation.

## Theme Analysis

### 1. PocketFlow Theme
**Purpose**: Lightweight workflow management and task automation
**Key Features**:
- Pocket-sized task management
- Quick automation flows
- Minimal dashboard
- Event-driven architecture

### 2. Chat Space Theme
**Purpose**: Real-time collaborative development with AI coordinator
**Key Features**:
- Command-line chat interface
- Multi-room support
- AI-powered coordinator agent
- PocketFlow integration built-in

### 3. Story Reporter Theme
**Purpose**: Test execution and reporting with external log integration
**Key Features**:
- Mock-free test execution
- Multi-format report generation
- External log library integration
- Test result aggregation

### 4. GUI Selector Theme
**Purpose**: Template selection and GUI management
**Key Features**:
- Multi-theme GUI architecture
- Database-driven theme management
- Template engine integration
- Requirements export functionality

### 5. AI Dev Portal (NEW)
**Purpose**: Central hub for multi-app development with unified authentication
**Key Features**:
- Centralized authentication (login logic ONLY here)
- Service orchestration
- Multi-app management
- Cross-theme coordination

## Integration Patterns

### Event-Driven Architecture
All themes communicate through a pub/sub event system:
```
Theme A → Event Bus → Theme B
         ↓         ↑
      Theme C → Theme D
```

### Existing Theme Connections

#### Chat Space ↔ PocketFlow Integration
**Already In Progress**:
- Chat commands trigger PocketFlow workflows
- PocketFlow events generate chat notifications
- Shared workspace context
- Bidirectional event flow

**Integration Flow**:
```
Chat Command → Coordinator Agent → PocketFlow API → Workflow Execution
                                                  ↓
User Notification ← Chat Room ← Event Bus ← Status Update
```

#### Story Reporter → External Log Library
**Connection Type**: Direct integration
- Story Reporter uses external log library for test execution logging
- Log aggregation and parsing capabilities
- Real-time streaming support

## AI Dev Portal Integration Strategy

### 1. Authentication Hub
**All themes must**:
- Remove any login UI/logic
- Validate requests through portal's `/api/auth/verify`
- Include auth tokens in all requests
- Handle 401 responses by redirecting to portal

### 2. Service Registry
```typescript
interface ServiceRegistration {
  themeId: string;
  serviceName: string;
  port: number;
  healthCheck: string;
  capabilities: string[];
  eventTypes: string[];
}
```

### 3. Event Bus Extension
The portal will extend the existing event bus to:
- Route events between themes across different apps
- Filter events based on app context
- Provide event history and replay
- Monitor event flow health

### 4. Unified Context Store
```typescript
interface PortalContextStore {
  // App-level context
  getAppContext(appId: string): AppContext;
  setAppContext(appId: string, context: AppContext): void;
  
  // Theme-specific context within app
  getThemeContext(appId: string, themeId: string): ThemeContext;
  setThemeContext(appId: string, themeId: string, context: ThemeContext): void;
  
  // Cross-app theme sharing (if permitted)
  shareThemeContext(sourceApp: string, targetApp: string, themeId: string): void;
}
```

## Implementation Requirements

### Phase 1: Foundation
1. **Portal Infrastructure**
   - Express.js server with TypeScript
   - JWT authentication system
   - Service registry implementation
   - Basic routing and proxy

2. **Theme Adaptation**
   - Remove login endpoints from all themes
   - Add portal auth validation middleware
   - Update configuration for service discovery

### Phase 2: Integration
1. **Event Bus Integration**
   - Connect portal to existing theme event buses
   - Implement event routing logic
   - Add event filtering by app context

2. **Context Management**
   - Implement unified context store
   - Add context synchronization
   - Handle context conflicts

### Phase 3: Advanced Features
1. **Multi-App Orchestration**
   - App isolation mechanisms
   - Cross-app communication (when permitted)
   - Resource allocation per app

2. **Theme Cooperation Enhancement**
   - Portal-mediated theme discovery
   - Dynamic capability negotiation
   - Advanced workflow orchestration

## Security Considerations

### Authentication Flow
1. User → Portal Login → JWT Token
2. User → Theme Request → Portal Proxy → Token Validation
3. Theme → Portal Auth API → User Verification
4. Portal → Theme → Authorized Request

### Permission Model
```typescript
interface AppPermission {
  userId: string;
  appId: string;
  role: 'owner' | 'developer' | 'viewer';
  themeAccess: {
    [themeId: string]: {
      read: boolean;
      write: boolean;
      execute: boolean;
    }
  };
}
```

## Monitoring and Observability

### Portal Metrics
- Authentication IN PROGRESS/failure rates
- Service health status
- Event flow volume and latency
- Context synchronization performance

### Theme Integration Health
- Cross-theme event delivery IN PROGRESS
- Context conflict rates
- Service discovery latency
- Error propagation tracking

## Testing Strategy

### Integration Testing Priorities
1. **Portal ↔ Theme Authentication**: Token validation flow
2. **Event Routing**: Cross-theme event delivery
3. **Context Synchronization**: Multi-theme state management
4. **Service Discovery**: Dynamic theme registration

### System Testing Scenarios
1. **Multi-App Workflow**: User creates app and uses all themes
2. **Theme Cooperation**: Chat triggers PocketFlow through portal
3. **Context Sharing**: GUI selection affects Story Reporter config
4. **Failover**: Theme unavailability handling

## Future Considerations

### Scalability
- Horizontal scaling of portal instances
- Event bus clustering
- Distributed context store
- Load balancing strategies

### Additional Themes
- Plugin architecture for new themes
- Theme marketplace concept
- Community theme integration
- Theme versioning and compatibility

## Conclusion

The AI Dev Portal will serve as the central orchestrator for all themes, providing:
1. **Unified Authentication**: Single login for all services
2. **Service Discovery**: Dynamic theme registration and health monitoring
3. **Event Orchestration**: Cross-theme communication management
4. **Context Management**: Unified state across themes and apps
5. **Multi-App Support**: Isolated development environments

This architecture maintains the loose coupling of themes while providing the necessary coordination for complex multi-theme workflows.

---
*Research Date: 2025-01-17*
*Version: 1.0*