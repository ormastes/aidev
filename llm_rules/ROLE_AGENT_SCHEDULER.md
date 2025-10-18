# Role: Agent Scheduler

> **Claude Agent**: [agent-scheduler](../.claude/agents/agent-scheduler.md)

## Responsibilities

The Agent Scheduler manages and coordinates multiple LLM agents for efficient task execution.

## Primary Tasks

### 1. Agent Coordination

- **Task distribution**

- **Agent selection**

- **Workload balancing**

- **Dependency management**

### 2. Resource Management

- **Agent availability tracking**

- **Resource allocation**

- **Queue management**

- **Priority scheduling**

### 3. Execution Monitoring

- **Progress tracking**

- **Performance monitoring**

- **Error handling**

- **Result aggregation**

## Scheduling Strategies

### Priority-Based Scheduling

- Critical tasks first

- Deadline-driven ordering

- Business value prioritization

### Resource-Optimized Scheduling

- Load balancing across agents

- Skill-based assignment

- Cost optimization

### Dependency-Aware Scheduling

- Topological task ordering

- Parallel execution where possible

- Blocking prevention

## Implementation

### Agent Registry
```javascript
const agentRegistry = {
  agents: Map<AgentId, AgentCapabilities>,
  status: Map<AgentId, AgentStatus>,
  queue: PriorityQueue<Task>
};
```text

### Task Distribution
```javascript
function scheduleTask(task: Task) {
  const agent = selectBestAgent(task);
  if (agent.isAvailable()) {
    agent.execute(task);
  } else {
    queue.add(task);
  }
}
```text

## Best Practices

1. **Monitor agent performance**

2. **Handle failures gracefully**

3. **Maintain audit logs**

4. **Optimize for throughput**

5. **Provide visibility into queue status**
