#!/bin/bash

echo "Fixing remaining test issues..."

# Fix the typo in test-result-validation-edge-cases.test.ts
file="./layer/themes/infra_story-reporter/user-stories/007-story-reporter/tests/unit/test-result-validation-edge-cases.test.ts"
if [ -f "$file" ]; then
    echo "Fixing import in $file"
    sed -i "s|'../../s../utils/validation-utils'|'../../src/utils/validation-utils'|g" "$file"
fi

# Fix the infra_external-log-lib import issues  
find . -type f -name "*.ts" -exec grep -l "from '../../../../infra_external-log-lib/src'" {} \; 2>/dev/null | while read file; do
    echo "Fixing import in: $file"
    sed -i "s|from '../../../../infra_external-log-lib/src'|from '../../../../infra_external-log-lib/dist'|g" "$file"
done

# Fix parameter type issues in monitor-resource-tracking.itest.ts
file="./layer/themes/infra_story-reporter/user-stories/007-story-reporter/tests/integration/monitor-resource-tracking.itest.ts"
if [ -f "$file" ]; then
    echo "Fixing EventEmitter type in $file"
    sed -i "s|let eventBus: EventEmitter;|let eventBus: typeof EventEmitter;|g" "$file"
    # Fix implicit any parameters
    sed -i "s|(data) =>|(data: any) =>|g" "$file"
fi

# Fix parameter type issues in multi-room-navigation-switching.stest.ts
file="./layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/system/multi-room-navigation-switching.stest.ts"
if [ -f "$file" ]; then
    echo "Fixing filter parameters in $file"
    sed -i "s|filter(f => f.endsWith|filter((f: any) => f.endsWith|g" "$file"
fi

echo "All remaining issues fixed!"