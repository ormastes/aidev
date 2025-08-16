#!/bin/bash

echo "Fixing import paths..."

# Fix the imports in monitor-resource-tracking.itest.ts
file="./layer/themes/infra_story-reporter/user-stories/007-story-reporter/tests/integration/monitor-resource-tracking.itest.ts"
if [ -f "$file" ]; then
    echo "Fixing imports in $file"
    sed -i "s|from '../../../../../infra_external-log-lib/src'|from 'events'|g" "$file"
    sed -i "s|from '../../../../infra_external-log-lib/dist'|from 'fs/promises'|g" "$file"
    sed -i "s|from '../../../../../infra_external-log-lib/src';|from 'os';|g" "$file"
    # Fix the EventEmitter type usage
    sed -i "s|let eventBus: typeof EventEmitter;|let eventBus: EventEmitter;|g" "$file"
    # Add EventEmitter import if not present
    sed -i "1s/^/import { EventEmitter } from 'events';\n/" "$file"
fi

# Fix similar issues in multi-room-navigation-switching.stest.ts
file="./layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/system/multi-room-navigation-switching.stest.ts"
if [ -f "$file" ]; then
    echo "Fixing imports in $file"
    sed -i "s|from '../../../../infra_external-log-lib/dist'|from 'fs/promises'|g" "$file"
    sed -i "s|from '../../../../../infra_external-log-lib/src'|from 'os'|g" "$file"
fi

# Fix all remaining infra_external-log-lib/dist imports
find . -type f -name "*.ts" -exec grep -l "from '.*infra_external-log-lib/dist'" {} \; 2>/dev/null | while read file; do
    echo "Fixing import in: $file"
    # Check what's being imported and replace appropriately
    if grep -q "fsPromises as fs" "$file"; then
        sed -i "s|from '.*infra_external-log-lib/dist'|from 'fs/promises'|g" "$file"
    else
        sed -i "s|from '.*infra_external-log-lib/dist'|from '../../layer/themes/infra_external-log-lib/src'|g" "$file"
    fi
done

# Fix all remaining infra_external-log-lib/src imports
find . -type f -name "*.ts" -exec grep -l "{ EventEmitter } from '.*infra_external-log-lib/src'" {} \; 2>/dev/null | while read file; do
    echo "Fixing EventEmitter import in: $file"
    sed -i "s|{ EventEmitter } from '.*infra_external-log-lib/src'|{ EventEmitter } from 'events'|g" "$file"
done

find . -type f -name "*.ts" -exec grep -l "{ os } from '.*infra_external-log-lib/src'" {} \; 2>/dev/null | while read file; do
    echo "Fixing os import in: $file"
    sed -i "s|{ os } from '.*infra_external-log-lib/src'|* as os from 'os'|g" "$file"
done

echo "Import paths fixed!"