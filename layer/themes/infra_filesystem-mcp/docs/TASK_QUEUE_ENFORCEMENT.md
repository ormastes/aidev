# Task Queue Enforcement in Filesystem MCP

## Overview

The filesystem MCP now has **built-in task queue enforcement** to ensure Claude and other LLM agents follow the proper workflow. This is embedded directly into the MCP server, making it impossible to bypass.

## How It Works

### 1. Startup Enforcement

When the MCP server starts, it blocks all non-task-queue operations until the task queue has been checked:

```javascript
// First request to any non-task method will be blocked
vf_read "some-file.json"
// Returns: { blocked: true, message: "You must check TASK_QUEUE.vf.json first!" }

// Must use one of these first:
vf_startup        // New method that initializes and checks tasks
vf_get_tasks      // Check task queue
vf_read "TASK_QUEUE.vf.json"  // Or read the task queue file
```

### 2. Automatic Task Tracking

The MCP server tracks:
- Whether task queue has been checked
- Number of pending tasks
- Current task being worked on
- Task completion status

### 3. Task Queue Reminders

When you check the task queue, the server adds reminders:

```json
{
  "queues": { ... },
  "_reminder": "You have 4 pending tasks. Use vf_pop_task to get the next one."
}
```

## New Features

### vf_startup Command

A new command that initializes the session properly:

```bash
mcp vf_startup
```

Returns:
```json
{
  "status": "ready",
  "pendingTasks": 4,
  "hasInstructions": true,
  "instructions": "You have 4 pending tasks. Use vf_pop_task to get started!",
  "workflow": [
    "1. vf_get_tasks - Check all tasks",
    "2. vf_pop_task - Get next task",
    "3. Work on the task",
    "4. vf_complete_task <id> - Mark as done",
    "5. Repeat"
  ]
}
```

### Task Queue Methods

These methods are always allowed and mark the task queue as "checked":
- `vf_startup` - Initialize and check status
- `vf_get_tasks` - Get all tasks
- `vf_pop_task` - Get next task to work on
- `vf_complete_task` - Mark task as done
- `vf_push_task` - Add new task
- `vf_read TASK_QUEUE.vf.json` - Direct read of task queue

## Benefits

1. **Enforced Workflow** - Can't skip checking tasks
2. **No Configuration Needed** - Works automatically
3. **Clear Guidance** - Provides instructions and reminders
4. **Session Awareness** - Tracks what you're working on

## Example Session

```bash
# Claude/LLM starts session
> mcp vf_startup
< "You have 4 pending tasks. Use vf_pop_task to get started!"

# Get next task
> mcp vf_pop_task
< { "id": "task-001", "title": "Implement calculator", ... }

# Work on the task...

# Complete it
> mcp vf_complete_task task-001
< { "completed": true }

# Check for more
> mcp vf_get_tasks
< "You have 3 pending tasks..."
```

## Why This Works Better

1. **Single Source of Truth** - All enforcement in one place (MCP server)
2. **Can't Be Bypassed** - First operation must check tasks
3. **Automatic Reminders** - Built into responses
4. **No Extra Files** - No need for separate CLAUDE_STARTUP.md
5. **Works for All Agents** - Not just Claude-specific

## Configuration

No configuration needed! The task queue enforcement is built into the filesystem MCP server and activates automatically when:
- A `TASK_QUEUE.vf.json` file exists in the project
- The MCP server is started

To disable enforcement (not recommended), you can:
- Remove the TASK_QUEUE.vf.json file
- Use a different MCP server
- Modify the server code to disable the check

## Troubleshooting

### "Task queue not checked" error
- Run `vf_startup` or `vf_get_tasks` first
- This only happens on the first operation of a session

### Can't find tasks
- Ensure TASK_QUEUE.vf.json exists
- Check file permissions
- Verify MCP server is running in correct directory

### Tasks not updating
- Use proper MCP commands (vf_pop_task, vf_complete_task)
- Don't edit TASK_QUEUE.vf.json directly