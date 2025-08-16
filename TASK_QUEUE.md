# Task Queue

## Overview

The AI Development Platform uses a VF.json-based task queue system to track development tasks across all themes.

## Task Structure

Tasks are managed in two ways:
1. **Global Tasks** - Root level TASK_QUEUE.vf.json
2. **Theme Tasks** - Individual theme TASK_QUEUE.vf.json files

## Task States

- **pending** - Not yet started
- **in_progress** - Currently being worked on
- **blocked** - Waiting on dependencies
- **completed** - Finished and tested
- **cancelled** - No longer needed

## Active Tasks

### Global Queue
See: [TASK_QUEUE.vf.json](./TASK_QUEUE.vf.json)

### Theme Queues
Each theme maintains its own task queue:
- `layer/themes/*/TASK_QUEUE.vf.json`

## Task Management Process

1. **Adding Tasks**
   - Add to appropriate TASK_QUEUE.vf.json
   - Set initial status as 'pending'
   - Include clear description

2. **Working on Tasks**
   - Update status to 'in_progress'
   - Create tests first (TDD)
   - Implement functionality
   - Update documentation

3. **Completing Tasks**
   - Ensure all tests pass
   - Verify coverage requirements
   - Update status to 'completed'
   - Remove from queue or archive

## Priority Levels

- **🔴 Critical** - Blocking other work
- **🟡 High** - Important features
- **🟢 Normal** - Standard tasks
- **⚪ Low** - Nice to have

## Integration with Features

Tasks often implement features defined in FEATURE.vf.json files.
Ensure task completion aligns with feature requirements.
