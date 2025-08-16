#!/bin/bash

echo "Fixing remaining direct imports..."

# Fix imports from 'fs'
find layer/themes -name "*.ts" -o -name "*.js" | while read file; do
  if [[ "$file" == *"infra_external-log-lib"* ]]; then
    continue
  fi
  
  # Fix: import { createWriteStream } from 'fs'
  sed -i "s/import { createWriteStream, WriteStream } from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src';\nconst { createWriteStream } = fs;\ntype WriteStream = ReturnType<typeof createWriteStream>/g" "$file"
  
  # Fix: import { promises as fs } from 'fs'
  sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/infra_external-log-lib\/src'/g" "$file"
  
  # Fix fraud-checker itself to use external-log-lib
  if [[ "$file" == *"infra_fraud-checker"* ]]; then
    sed -i "s/import \* as fs from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src'/g" "$file"
    sed -i "s/import \* as path from 'path'/import { path } from '..\/..\/..\/infra_external-log-lib\/src'/g" "$file"
  fi
done

# Fix specific files with proper relative paths
echo "Fixing specific files..."

# Fix tool_web-scraper
sed -i "s/import { createWriteStream, WriteStream } from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src';\nconst { createWriteStream } = fs;\ntype WriteStream = any/g" \
  layer/themes/tool_web-scraper/children/exporter/index.ts

# Fix llm-agent_chat-space test files
for file in layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/**/*.ts; do
  sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/..\/..\/infra_external-log-lib\/src'/g" "$file"
done

# Fix helpers
sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/..\/..\/infra_external-log-lib\/src'/g" \
  layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/helpers/test-file-system.ts

echo "Done fixing remaining imports!"