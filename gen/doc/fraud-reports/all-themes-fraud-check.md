# All Themes Fraud Check Report

Generated: 2025-08-03T01:31:18.427Z

## Summary

- **Total Themes**: 35
- **Total Files Checked**: 1610
- **Total Violations**: 819
- **Themes with Violations**: 32

## Violation Breakdown

| Violation Type | Count |
|----------------|-------|
| External Library Usage | 519 |
| Test Fraud | 13 |
| Mock Usage | 287 |

## Themes with Violations

### filesystem_mcp (101 violations)

**External Library Usage (84):**
- layer/themes/filesystem_mcp/children/CommentTaskExecutor.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/children/DefaultTaskExecutor.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/children/RunnableCommentExecutor.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/children/RunnableCommentProcessor.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/children/StepFileExecutor.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/children/StoryReportValidator.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/children/TaskQueueRunnableExtension.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/children/VFDistributedFeatureWrapper.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/children/VFFileStructureWrapper.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/children/VFFileWrapper.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/children/VFNameIdWrapper.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/children/VFScenarioEntityManager.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/children/VFSearchWrapper.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/children/VFValidatedFileWrapper.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/demo/test-pop-comment.js
  - `require('fs')`
- layer/themes/filesystem_mcp/examples/runnable-comment-demo.js
  - `require('fs')`
- layer/themes/filesystem_mcp/scripts/check-duplication.js
  - `require('fs')`
- layer/themes/filesystem_mcp/scripts/convert-taskqueue.js
  - `require('fs')`
- layer/themes/filesystem_mcp/scripts/fix-all-tests.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/scripts/fix-test-failures.js
  - `require('fs')`
- layer/themes/filesystem_mcp/scripts/run-system-tests.js
  - `require('fs')`
- layer/themes/filesystem_mcp/scripts/runnable/runnable-generate-test-manual.js
  - `require('fs')`
- layer/themes/filesystem_mcp/scripts/simple-test-runner.js
  - `require('fs')`
- layer/themes/filesystem_mcp/scripts/test-quality-check.js
  - `require('fs')`
- layer/themes/filesystem_mcp/src/VFSetupFolderWrapper.js
  - `require('fs')`
- layer/themes/filesystem_mcp/src/scripts/insert-task-with-children.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/VFDistributedFeatureWrapper.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/VFFileWrapper.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/VFNameIdWrapper.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/VFSearchWrapper.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/VFTaskQueueWrapper.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/complex-hierarchical-relationships.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/comprehensive-e2e.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/concurrent-operations.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/demo-e2e-realworld.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/distributed-feature-integration.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/edge-cases-error-handling.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/environment/mcp-server-environment.envtest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/external/mcp-protocol-interactions.etest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/fraud-detection.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/integration/real-world-freeze.itest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/migration-scenarios.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/name-search.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/pipe-integration.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/runnable-comment-demo.test.ts
  - `import * as fs from 'fs'`
  - `require('fs')`
- layer/themes/filesystem_mcp/tests/runnable-comment-validation.fixed.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/runnable-comment-validation.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/schema-validation.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/simple-integration.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/filesystem_mcp/tests/story-report-validation-extended.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/story-report-validation.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/system/complete-queue-workflow.systest.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/system/e2e/filesystem-mcp-integration.systest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/system/freeze-validation.systest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/system/mcp-freeze-validation.systest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/system/register-item.systest.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/system/runnable-comment-simple.systest.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/system/runnable-comment-step-file.systest.ts
  - `import * as fs from 'fs'`
  - `require('fs')`
- layer/themes/filesystem_mcp/tests/system/scenarios/file-structure-scenarios.systest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/system/scenarios/name-id-scenarios.systest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/system/scenarios/task-queue-scenarios.systest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/system/step-file-integration.systest.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/system/test-scenario-entity-manager.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/tag-search.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/test-search-simple.js
  - `require('fs')`
- layer/themes/filesystem_mcp/tests/test-vf-search-by-name.js
  - `require('fs')`
- layer/themes/filesystem_mcp/tests/testJsonUpdates.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/unit/CommentTaskExecutor.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/DefaultTaskExecutor.comprehensive.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/DefaultTaskExecutor.real.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/DefaultTaskExecutor.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/RunnableCommentExecutor.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/VFFileWrapper.comprehensive.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/VFFileWrapper.filter.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/VFIdNameWrapper.comprehensive.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/VFIdNameWrapper.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/VFTaskQueueWrapper.step.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/tests/unit/debug-freeze.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/unit/freeze-validation.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/tests/unit/insert-task-with-children.test.ts
  - `import * as fs from 'fs'`
- layer/themes/filesystem_mcp/utils/JsonDocumentHandler.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/filesystem_mcp/utils/migrateToV2.ts
  - `import * as fs from 'fs/promises'`

**Mock Usage (17):**
- layer/themes/filesystem_mcp/tests/VFDistributedFeatureWrapper.test.ts
- layer/themes/filesystem_mcp/tests/fraud-detection.test.ts
- layer/themes/filesystem_mcp/tests/pipe-integration.test.ts
- layer/themes/filesystem_mcp/tests/story-report-validation-extended.test.ts
- layer/themes/filesystem_mcp/tests/story-report-validation-extended.test.ts
- layer/themes/filesystem_mcp/tests/story-report-validation.test.ts
- layer/themes/filesystem_mcp/tests/system/mcp-freeze-validation.systest.ts
- layer/themes/filesystem_mcp/tests/system/mcp-freeze-validation.systest.ts
- layer/themes/filesystem_mcp/tests/system/mcp-freeze-validation.systest.ts
- layer/themes/filesystem_mcp/tests/unit/CommentTaskExecutor.test.ts
- layer/themes/filesystem_mcp/tests/unit/DefaultTaskExecutor.comprehensive.test.ts
- layer/themes/filesystem_mcp/tests/unit/DefaultTaskExecutor.comprehensive.test.ts
- layer/themes/filesystem_mcp/tests/unit/DefaultTaskExecutor.real.test.ts
- layer/themes/filesystem_mcp/tests/unit/DefaultTaskExecutor.test.ts
- layer/themes/filesystem_mcp/tests/unit/insert-task-with-children.test.ts
- layer/themes/filesystem_mcp/tests/unit/insert-task-with-children.test.ts
- layer/themes/filesystem_mcp/tests/unit/insert-task-with-children.test.ts

### aidev-portal (71 violations)

**External Library Usage (57):**
- layer/themes/aidev-portal/children/release-additional/ai_dev_portal_final/config/database.js
  - `require('sqlite3')`
- layer/themes/aidev-portal/children/release-additional/ai_dev_portal_final/init-db.js
  - `require('fs')`
- layer/themes/aidev-portal/children/release-additional/ai_dev_portal_live_demo/config/database.js
  - `require('sqlite3')`
- layer/themes/aidev-portal/children/release-additional/ai_dev_portal_live_demo/init-db.js
  - `require('fs')`
- layer/themes/aidev-portal/demo/ai_dev_portal/config/database.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal/init-db-postgres.ts
  - `import fs from 'fs'`
- layer/themes/aidev-portal/demo/ai_dev_portal/init-db.ts
  - `import fs from 'fs'`
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal/server-postgres.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal/server.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal/test-db-integrity.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal_e2e_test/config/database.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal_e2e_test/init-db-postgres.ts
  - `import fs from 'fs'`
- layer/themes/aidev-portal/demo/ai_dev_portal_e2e_test/init-db.ts
  - `import fs from 'fs'`
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal_e2e_test/server-postgres.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal_e2e_test/server.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal_e2e_test/test-db-integrity.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal_production/config/database.js
  - `require('sqlite3')`
- layer/themes/aidev-portal/demo/ai_dev_portal_production/init-db.js
  - `require('fs')`
- layer/themes/aidev-portal/demo/ai_dev_portal_secured/server.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/demo/ai_dev_portal_test_demo/config/database.js
  - `require('sqlite3')`
- layer/themes/aidev-portal/demo/ai_dev_portal_test_demo/init-db.js
  - `require('fs')`
- layer/themes/aidev-portal/demo/test_cleanup_demo/config/database.js
  - `require('sqlite3')`
- layer/themes/aidev-portal/demo/test_cleanup_demo/init-db.js
  - `require('fs')`
- layer/themes/aidev-portal/demo/test_service_demo/check-db.js
  - `require('sqlite3')`
- layer/themes/aidev-portal/demo/test_service_demo/config/database.js
  - `require('sqlite3')`
- layer/themes/aidev-portal/demo/test_service_demo/init-db.js
  - `require('fs')`
  - `require('sqlite3')`
- layer/themes/aidev-portal/demo/test_service_demo/server.js
  - `require('fs')`
  - `require('sqlite3')`
- layer/themes/aidev-portal/release/ai_dev_portal/config/database.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal/init-db-postgres.ts
  - `import fs from 'fs'`
- layer/themes/aidev-portal/release/ai_dev_portal/init-db.ts
  - `import fs from 'fs'`
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal/server-postgres.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal/server.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal/test-db-integrity.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_release/config/database.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_release/init-db-postgres.ts
  - `import fs from 'fs'`
- layer/themes/aidev-portal/release/ai_dev_portal_release/init-db.ts
  - `import fs from 'fs'`
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_release/server-postgres.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_release/server.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_release/test-db-integrity.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_v2025.07.19/ai_dev_portal/config/database.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_v2025.07.19/ai_dev_portal/init-db-postgres.ts
  - `import fs from 'fs'`
- layer/themes/aidev-portal/release/ai_dev_portal_v2025.07.19/ai_dev_portal/init-db.ts
  - `import fs from 'fs'`
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_v2025.07.19/ai_dev_portal/server-postgres.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_v2025.07.19/ai_dev_portal/server.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/release/ai_dev_portal_v2025.07.19/ai_dev_portal/test-db-integrity.ts
  - `import sqlite3 from 'sqlite3'`
- layer/themes/aidev-portal/scripts/clean-database.js
  - `require('fs')`
- layer/themes/aidev-portal/user-stories/024-aidev-portal/src/core/service-registry.ts
  - `import { Server } from 'http'`
- layer/themes/aidev-portal/user-stories/024-aidev-portal/src/server.ts
  - `import fs from 'fs'`
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/env/authentication-middleware.envtest.ts
  - `import { Server } from 'http'`
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/env/express-portal-server.envtest.ts
  - `import { Server } from 'http'`

**Mock Usage (14):**
- layer/themes/aidev-portal/tests/setup.ts
- layer/themes/aidev-portal/tests/setup.ts
- layer/themes/aidev-portal/tests/unit/authentication-manager.test.ts
- layer/themes/aidev-portal/tests/unit/authentication-manager.test.ts
- layer/themes/aidev-portal/tests/unit/authentication-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/auth/authentication-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/auth/authentication-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/auth/authentication-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/auth/user-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/auth/user-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/authentication-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/authentication-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/authentication-manager.test.ts
- layer/themes/aidev-portal/user-stories/024-aidev-portal/tests/unit/core/service-registry-simple.test.ts

### gui-selector (60 violations)

**External Library Usage (30):**
- layer/themes/gui-selector/scripts/check-pages-comments.js
  - `require('fs')`
- layer/themes/gui-selector/scripts/e2e-comment-test.js
  - `require('fs')`
- layer/themes/gui-selector/scripts/fix-pages.js
  - `require('fs')`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/src/routes/apps.ts
  - `import fs from 'fs'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/src/services/DatabaseService.ts
  - `import fs from 'fs'`
  - `import sqlite3 from 'sqlite3'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/src/services/ExternalLogService.ts
  - `import fs from 'fs'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/src/services/VFThemeStorageExtended.ts
  - `import * as fs from 'fs'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/src/services/VFThemeStorageWrapper.ts
  - `import * as fs from 'fs'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/env/database-connection.envtest.ts
  - `import * as fs from 'fs'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/env/session-middleware.envtest.ts
  - `import * as fs from 'fs'`
  - `import * as http from 'http'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/integration/authentication-session-integration.itest.ts
  - `import { Server } from 'http'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/integration/guiserver-database-integration.itest.ts
  - `import { Server } from 'http'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/integration/guiserver-sessionstore-integration.itest.ts
  - `import { Server } from 'http'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/integration/guiserver-templateengine-integration.itest.ts
  - `import { Server } from 'http'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/integration/session-persistence-restart_FAKE.itest.ts
  - `import fs from 'fs'`
  - `import { Server } from 'http'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/system/comprehensive-gui-server.systest.ts
  - `import * as fs from 'fs'`
  - `import axios, { AxiosInstance } from 'axios'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/system/database-service.systest.ts
  - `import * as fs from 'fs'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/system/gui-server-integration.systest.ts
  - `import * as fs from 'fs'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/system/gui-template-selection-workflow.systest.ts
  - `import fs from 'fs'`
  - `import { Server } from 'http'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/system/requirements-export-workflow.systest.ts
  - `import fs from 'fs'`
  - `import { Server } from 'http'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/apps.test.ts
  - `import fs from 'fs'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/DatabaseService.test.ts
  - `import fs from 'fs'`
  - `import sqlite3 from 'sqlite3'`
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/ExternalLogService.test.ts
  - `import fs from 'fs'`

**Mock Usage (30):**
- layer/themes/gui-selector/user-stories/023-gui-selector-server/__mocks__/sqlite3.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/setup-jwt-mock.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/setup.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/middleware/jwt-auth.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/middleware/jwt-auth.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/middleware/jwt-auth.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/apps.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/apps.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/apps.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/auth-jwt.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/auth-jwt.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/auth-jwt.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/health.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/messages.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/requirements.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/requirements.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/selections.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/templates.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/themes.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/themes.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/DatabaseService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/DatabaseService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/DatabaseService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/ExternalLogService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/ExternalLogService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/JWTService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/JWTService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/JWTService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/TemplateService.test.ts
- layer/themes/gui-selector/user-stories/023-gui-selector-server/tests/unit/services/ThemeService.test.ts

### story-reporter (59 violations)

**External Library Usage (49):**
- layer/themes/story-reporter/release/server/src/simple-server.ts
  - `import * as fs from 'fs'`
- layer/themes/story-reporter/release/server/test/system/story-reporter-portal-e2e.systest.ts
  - `import * as fs from 'fs'`
- layer/themes/story-reporter/src/cli/coverage-analyzer.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/src/cli/rule-suggestion-analyzer.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/src/services/branch-coverage-analyzer.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/src/services/coverage-report-generator.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/src/services/duplication-checker.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/src/services/rule-suggestion-analyzer.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/src/services/system-test-class-coverage-analyzer.ts
  - `import { readFileSync } from 'fs'`
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/external/mock-free-test-runner.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/external/report-generator.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/external/story-report-generator.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/server.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/services/build-artifact-collector.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/services/coverage-checker.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/services/distributed-build-executor.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/services/setup-aggregator.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/services/story-service.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/src/services/unified-report-generator.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/env/file-validation.envtest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/env/mock-free-test-execution.envtest.ts
  - `import { existsSync, readFileSync, writeFileSync } from 'fs'`
  - `require('fs')`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/external/event-bus.etest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/external/workflow-manager.etest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/fraud/story-reporter-fraud.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/helpers/test-file-system.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/helpers/test-process-simulator.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/configuration-validation.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/error-handling-components.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/external-log-library-report-generation.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/file-system-operations.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/mock-free-test-runner-logger.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/monitor-resource-tracking.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/report-generator-logger.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/workflow-manager-logger.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/integration/workflow-manager-mock-free-test-runner.itest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/system/automated-workflow-lifecycle.stest.ts
  - `import { promises as fs } from 'fs'`
  - `require('fs')`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/system/external-log-integration-workflow.stest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/system/mock-free-test-workflow.stest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/system/multi-format-report-generation.stest.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/system/story-reporter-minimal.stest.ts
  - `import { promises as fs } from 'fs'`
  - `require('fs')`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/system/test-result-aggregation-workflow.stest.ts
  - `import * as fs from 'fs/promises'`
  - `require('fs')`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/coverage-report-generator.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/distributed-build-executor.test.ts
  - `require('fs')`
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/report-generator-error-scenarios.test.ts
  - `import { promises as fs } from 'fs'`

**Mock Usage (10):**
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/fraud/story-reporter-fraud.test.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/helpers/spawn-simulator.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/distributed-build-executor.test.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/distributed-build-executor.test.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/distributed-build-executor.test.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/mock-free-test-runner-external-logger.test.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/report-generator-external-logger.test.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/test-suite-manager-error-scenarios-coverage.test.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/test-suite-manager-error-scenarios-coverage.test.ts
- layer/themes/story-reporter/user-stories/007-story-reporter/tests/unit/test-suite-manager-error-scenarios-coverage.test.ts

### web-security (50 violations)

**External Library Usage (22):**
- layer/themes/web-security/children/CredentialStore.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/web-security/demo/serve-test.js
  - `require('fs')`
- layer/themes/web-security/layer/themes/setup-folder/children/src/setup/mcp-setup.ts
  - `import * as fs from 'fs'`
- layer/themes/web-security/layer/themes/setup-folder/children/src/setup/release-setup.ts
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/check__type__requirements.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/check_all_other_queues_empty.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/check_coverage__type_.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/check_external_dependencies.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/check_scenario_research_files.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/check_system_test_child_items.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/conduct__type__retrospective.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/register__type__item.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/register_scenario_items.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/register_user_story_item.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/script-matcher.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/task_queue_steps.ts
  - `import * as fs from 'fs'`
- layer/themes/web-security/llm_rules/steps/task_queue_validation_steps.ts
  - `import * as fs from 'fs'`
- layer/themes/web-security/llm_rules/steps/update_name_id.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/validate__type__format.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/verify__type__implementation.js
  - `require('fs')`
- layer/themes/web-security/llm_rules/steps/write_a__file_.js
  - `require('fs')`
- layer/themes/web-security/scripts/mcp-server.js
  - `require('fs')`

**Mock Usage (28):**
- layer/themes/web-security/layer/themes/setup-folder/jest.setup.js
- layer/themes/web-security/layer/themes/setup-folder/jest.setup.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/all-setup-coverage.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/all-setup-coverage.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/all-setup-coverage.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/all-setup-coverage.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/base-setup-complete.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/base-setup-complete.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/base-setup-complete.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/base-setup-complete.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/base-setup.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/base-setup.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/base-setup.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/base-setup.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/commands/theme.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/commands/theme.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/commands/theme.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/commands/theme.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/demo-setup.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/demo-setup.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/demo-setup.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/demo-setup.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/setup-classes-complete.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/setup-classes-complete.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/story-setup.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/story-setup.test.ts
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/theme-setup.test.js
- layer/themes/web-security/layer/themes/setup-folder/tests/unit/theme-setup.test.ts

### external-log-lib (45 violations)

**External Library Usage (37):**
- layer/themes/external-log-lib/children/fs-wrapper.ts
  - `import * as originalFs from 'fs'`
  - `import * as originalFsPromises from 'fs/promises'`
- layer/themes/external-log-lib/children/http-wrapper.ts
  - `import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'`
  - `import * as http from 'http'`
  - `import * as https from 'https'`
- layer/themes/external-log-lib/children/sqlite3-wrapper.ts
  - `import * as originalSqlite3 from 'sqlite3'`
- layer/themes/external-log-lib/children/src/external/database-wrapper.ts
  - `import sqlite3 from 'sqlite3'`
  - `require('fs')`
- layer/themes/external-log-lib/tests/setup.ts
  - `require('fs')`
- layer/themes/external-log-lib/tests/system/advanced-log-scenarios.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/tests/system/comprehensive-log-system.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/tests/system/transport-buffering.stest.ts
  - `import * as fs from 'fs'`
  - `import * as http from 'http'`
  - `require('fs')`
- layer/themes/external-log-lib/tests/unit/external-log-lib-core.test.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/tests/utils/process-simulator.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/src/application/aidev-platform.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/src/domain/file-manager.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/env/nodejs-spawn.envtest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/integration/file-save-integration.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/system/log-capture-e2e.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/unit/file-manager.test.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/unit/log-capture-session.test.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/002-python-process-logging/tests/system/python-log-capture-e2e.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/002-python-process-logging/tests/unit/python-log-capture-session.test.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/003-structured-log-parsing/tests/system/structured-log-parsing.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/004-real-time-streaming/tests/env/high-volume-performance.envtest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/004-real-time-streaming/tests/env/nodejs-realtime-streaming.envtest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/004-real-time-streaming/tests/env/process-lifecycle.envtest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/004-real-time-streaming/tests/integration/event-emitter-filtering.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/004-real-time-streaming/tests/integration/log-monitor-process-manager.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/004-real-time-streaming/tests/system/backpressure-management.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/004-real-time-streaming/tests/system/end-to-end-monitoring.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/004-real-time-streaming/tests/system/process-crash-recovery.stest.ts
  - `import * as fs from 'fs'`
  - `require('fs')`
- layer/themes/external-log-lib/user-stories/005-error-log-filtering/tests/system/error-log-filtering-e2e.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/external-log-lib/user-stories/006-multi-process-aggregation/tests/system/multi-process-aggregation-e2e.stest.ts
  - `import * as fs from 'fs'`

**Mock Usage (8):**
- layer/themes/external-log-lib/tests/unit/database-wrapper.test.ts
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/external/external-log-lib-api.etest.ts
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/unit/log-capture-session-comprehensive.test.ts
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/unit/log-capture-session-comprehensive.test.ts
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/unit/log-capture-session-comprehensive.test.ts
- layer/themes/external-log-lib/user-stories/001-basic-log-capture/tests/unit/process-handle.test.ts
- layer/themes/external-log-lib/user-stories/002-python-process-logging/tests/unit/python-log-capture-session.test.ts
- layer/themes/external-log-lib/user-stories/002-python-process-logging/tests/unit/python-log-platform.test.ts

### fraud-checker (45 violations)

**External Library Usage (25):**
- layer/themes/fraud-checker/children/ExternalLibraryDetector.ts
  - `import fs from "fs"`
- layer/themes/fraud-checker/examples/example.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/external/FileSystemWrapper.d.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/external/FileSystemWrapper.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/scripts/check-all-themes-comprehensive.ts
  - `import * as fs from 'fs'`
- layer/themes/fraud-checker/scripts/check-external-lib-usage.ts
  - `import * as fs from 'fs'`
  - `import sqlite3 from "sqlite3"`
  - `import axios from "axios"`
- layer/themes/fraud-checker/scripts/check-fraud.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/scripts/run-all-fraud-checks.js
  - `require('fs')`
- layer/themes/fraud-checker/src/cli/fraud-analyzer.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/src/detectors/base-detector.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/fraud-checker/src/reporters/fraud-report-generator.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/src/services/code-smell-detector.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/src/services/dependency-fraud-detector.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/src/services/fraud-analyzer-service.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/src/services/mock-detection-service.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/src/services/rule-suggestion-analyzer.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/src/services/security-vulnerability-detector.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/src/services/test-coverage-fraud-detector.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/tests/integration/cli-script.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/tests/integration/pipe-integration.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/tests/integration/real-coverage.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/tests/performance/stress-tests.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/fraud-checker/tests/unit/FileSystemWrapper.test.ts
  - `import * as fs from 'fs/promises'`

**Test Fraud (7):**
- layer/themes/fraud-checker/tests/integration/cli-script.test.ts
- layer/themes/fraud-checker/tests/integration/pipe-integration.test.ts
- layer/themes/fraud-checker/tests/integration/real-coverage.test.ts
- layer/themes/fraud-checker/tests/unit/FraudPatternDetector-coverage.test.ts
- layer/themes/fraud-checker/tests/unit/FraudPatternDetector-coverage.test.ts
- layer/themes/fraud-checker/tests/unit/FraudPatternDetector-coverage.test.ts
- layer/themes/fraud-checker/tests/unit/FraudPatternDetector-coverage.test.ts

**Mock Usage (13):**
- layer/themes/fraud-checker/examples/example.ts
- layer/themes/fraud-checker/tests/unit/ASTParserWrapper.test.ts
- layer/themes/fraud-checker/tests/unit/ASTParserWrapper.test.ts
- layer/themes/fraud-checker/tests/unit/ASTParserWrapper.test.ts
- layer/themes/fraud-checker/tests/unit/FileSystemWrapper.test.ts
- layer/themes/fraud-checker/tests/unit/FileSystemWrapper.test.ts
- layer/themes/fraud-checker/tests/unit/FileSystemWrapper.test.ts
- layer/themes/fraud-checker/tests/unit/FraudChecker.test.ts
- layer/themes/fraud-checker/tests/unit/FraudChecker.test.ts
- layer/themes/fraud-checker/tests/unit/FraudChecker.test.ts
- layer/themes/fraud-checker/tests/unit/FraudReportGenerator.test.ts
- layer/themes/fraud-checker/tests/unit/FraudReportGenerator.test.ts
- layer/themes/fraud-checker/tests/unit/jest.setup.ts

### ollama-mcp-agent (38 violations)

**External Library Usage (15):**
- layer/themes/ollama-mcp-agent/tests/unit/ollama-mcp-agent-core.test.ts
  - `import axios from 'axios'`
  - `import WebSocket from 'ws'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/scripts/setup-ollama.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/src/domain/ollama-server.ts
  - `import axios from 'axios'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/src/external/ollama-client.ts
  - `import axios, { AxiosInstance } from 'axios'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/e2e/mcp-server-integration.e2e.test.ts
  - `import WebSocket from 'ws'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/e2e/ollama-install-flow.e2e.test.ts
  - `import { existsSync } from 'fs'`
  - `import axios from 'axios'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/e2e/platform-lifecycle.e2e.test.ts
  - `import axios from 'axios'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/system/chat-space-integration.stest.ts
  - `import fs from 'fs'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/system/ollama-platform.stest.ts
  - `import fs from 'fs'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/advanced-coverage.test.ts
  - `import axios from 'axios'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/mcp-server.test.ts
  - `import { WebSocket, WebSocketServer } from 'ws'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/ollama-client.test.ts
  - `import axios from 'axios'`
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/pipe.test.ts
  - `require('fs')`

**Mock Usage (23):**
- layer/themes/ollama-mcp-agent/tests/setup.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/integration/ollama-integration.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/advanced-coverage.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/advanced-coverage.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/async-coverage.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/async-coverage.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/chat-space-connector.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/chat-space-connector.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/chat-space-connector.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/coordinator-bridge.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/coordinator-bridge.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/coordinator-bridge.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/edge-cases.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/index.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/index.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/mcp-server.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/mcp-server.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/mcp-server.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/ollama-client.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/ollama-client.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/ollama-platform.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/pocketflow-nodes.test.ts
- layer/themes/ollama-mcp-agent/user-stories/011-ollama-mcp-integration/tests/unit/pocketflow-nodes.test.ts

### pocketflow (37 violations)

**External Library Usage (22):**
- layer/themes/pocketflow/tests/system/pocketflow-complete.stest.ts
  - `import * as fs from 'fs'`
  - `require('fs')`
- layer/themes/pocketflow/tests/system/pocketflow-scenarios.stest.ts
  - `import * as fs from 'fs'`
  - `require('fs')`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/src/external/logger.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/src/external/task-storage.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/env/logger-external-lib.etest.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/env/task-storage-filesystem.etest.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/integration/task-manager-logger.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/integration/task-manager-task-storage.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/integration/task-storage-logger-coordination.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/system/task-lifecycle-e2e.stest.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/unit/task-storage-persist-to-file.test.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/external/action-executor-action-execution.etest.ts
  - `import * as http from 'http'`
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/external/flow-storage-crud-operations.etest.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/integration/flow-manager-flow-storage.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/system/flow-lifecycle-e2e.stest.ts
  - `import * as fs from 'fs'`
  - `require('fs')`
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/unit/flow-storage-methods.test.ts
  - `import * as fs from 'fs'`
- layer/themes/pocketflow/user-stories/019-agentic-coding/tests/environment/019_agentic_coding.envtest.ts
  - `require('fs')`
- layer/themes/pocketflow/user-stories/019-agentic-coding/tests/external/019_agentic_coding.etest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/pocketflow/user-stories/020-architecture-docs/tests/docs.test.ts
  - `import * as fs from 'fs'`

**Test Fraud (2):**
- layer/themes/pocketflow/user-stories/019-agentic-coding/tests/unit/agentic-node.test.ts
- layer/themes/pocketflow/user-stories/019-agentic-coding/tests/unit/test-gen-agent.test.ts

**Mock Usage (13):**
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/unit/task-storage-generate-task-id.test.ts
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/unit/task-storage-generate-task-id.test.ts
- layer/themes/pocketflow/user-stories/001-pocket-task-manager/tests/unit/task-storage-persist-to-file.test.ts
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/fraud/pocketflow-fraud.test.ts
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/fraud/pocketflow-fraud.test.ts
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/unit/async-node.test.ts
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/unit/domain/flow.test.ts
- layer/themes/pocketflow/user-stories/002-quick-automation-flows/tests/unit/flow-manager-methods.test.ts
- layer/themes/pocketflow/user-stories/019-agentic-coding/src/agents/test-gen-agent.ts
- layer/themes/pocketflow/user-stories/019-agentic-coding/tests/unit/agentic-node.test.ts
- layer/themes/pocketflow/user-stories/019-agentic-coding/tests/unit/agentic-node.test.ts
- layer/themes/pocketflow/user-stories/019-agentic-coding/tests/unit/test-gen-agent.test.ts
- layer/themes/pocketflow/user-stories/021-integration-patterns/tests/providers/base-provider.test_FAKE.ts

### coordinator-claude-agent (33 violations)

**External Library Usage (28):**
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/examples/auth-demo.js
  - `require('fs')`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/src/core/claude-api-client.ts
  - `import { IncomingMessage } from 'http'`
  - `import * as https from 'https'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/src/core/claude-auth.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/src/core/session-manager.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/src/index.ts
  - `import * as fs from 'fs'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/src/integration/task-queue-manager.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/test-auth.js
  - `require('fs')`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/test-comprehensive.js
  - `require('fs')`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/env/environment.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/helpers/https-test-helper.ts
  - `import * as fs from 'fs'`
  - `import * as http from 'http'`
  - `import * as https from 'https'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/helpers/test-utils.ts
  - `import * as fs from 'fs/promises'`
  - `import { createServer, Server, IncomingMessage, ServerResponse } from 'http'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/integration/auth-integration.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/integration/coordinator-integration.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/system/coordinator-comprehensive-system.test.ts
  - `import * as fs from 'fs/promises'`
  - `require('fs')`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/system/coordinator-e2e.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/system/coordinator-integration-system.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/system/coordinator-realtime-system.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/claude-api-client.test.ts
  - `import * as http from 'http'`
  - `import * as https from 'https'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/claude-auth.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/coordinator.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/core/claude-api-client.test.ts
  - `import * as https from 'https'`
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/session-manager.test.ts
  - `import * as fs from 'fs/promises'`

**Mock Usage (5):**
- layer/themes/coordinator-claude-agent/tests/setup.ts
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/claude-api-client.test.ts
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/core/claude-api-client.test.ts
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/core/claude-api-client.test.ts
- layer/themes/coordinator-claude-agent/user-stories/010-coordinator-agent/tests/unit/core/claude-api-client.test.ts

### chat-space (32 violations)

**External Library Usage (31):**
- layer/themes/chat-space/user-stories/001-basic-server/server.ts
  - `import { createServer } from 'http'`
  - `import { Server } from 'socket.io'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/src/external/context-provider.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/src/external/file-storage.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/env/cli-interface-availability.envtest.ts
  - `import * as fs from 'fs'`
  - `require('fs')`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/env/parent-aidev-access.envtest.ts
  - `import * as fs from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/env/process-spawn-management.envtest.ts
  - `import * as fs from 'fs'`
  - `require('fs')`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/env/websocket-messaging-infrastructure.envtest.ts
  - `import * as fs from 'fs'`
  - `import * as http from 'http'`
  - `import { WebSocket } from 'ws'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/external/cli-interface-command-processing.etest.ts
  - `import * as fs from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/external/context-provider-aidev-access.etest.ts
  - `import * as fs from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/external/file-storage-operations.etest.ts
  - `import * as fs from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/helpers/test-file-system.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/integration/chat-room-platform-coordination.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/integration/pocketflow-context-provider-integration.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/integration/storage-messaging-broker-coordination.itest.ts
  - `import * as fs from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/system/complete-chat-room-lifecycle.stest.ts
  - `import { promises as fs } from 'fs'`
  - `require('fs')`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/system/context-access-workspace-integration.stest.ts
  - `import { promises as fs } from 'fs'`
  - `require('fs')`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/system/mockless-chat-room-lifecycle.stest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/system/mockless-pocketflow-integration.stest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/system/multi-room-navigation-switching.stest.ts
  - `import { promises as fs } from 'fs'`
  - `require('fs')`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/system/pocketflow-integration-workflow-notifications.stest.ts
  - `import { promises as fs } from 'fs'`
  - `require('fs')`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/unit/file-storage-additional.test.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/unit/file-storage-comprehensive.test.ts
  - `import * as fs from 'fs/promises'`

**Mock Usage (1):**
- layer/themes/chat-space/user-stories/007-chat-room-cli/tests/unit/message-broker-comprehensive.test.ts

### setup-folder (31 violations)

**External Library Usage (3):**
- layer/themes/setup-folder/children/src/setup/filesystem-mcp-integration.ts
  - `require('fs')`
- layer/themes/setup-folder/children/src/setup/mcp-setup.ts
  - `import * as fs from 'fs'`
- layer/themes/setup-folder/children/src/setup/release-setup.ts
  - `require('fs')`

**Mock Usage (28):**
- layer/themes/setup-folder/jest.setup.js
- layer/themes/setup-folder/jest.setup.js
- layer/themes/setup-folder/tests/unit/all-setup-coverage.test.js
- layer/themes/setup-folder/tests/unit/all-setup-coverage.test.js
- layer/themes/setup-folder/tests/unit/all-setup-coverage.test.ts
- layer/themes/setup-folder/tests/unit/all-setup-coverage.test.ts
- layer/themes/setup-folder/tests/unit/base-setup-complete.test.js
- layer/themes/setup-folder/tests/unit/base-setup-complete.test.js
- layer/themes/setup-folder/tests/unit/base-setup-complete.test.ts
- layer/themes/setup-folder/tests/unit/base-setup-complete.test.ts
- layer/themes/setup-folder/tests/unit/base-setup.test.js
- layer/themes/setup-folder/tests/unit/base-setup.test.js
- layer/themes/setup-folder/tests/unit/base-setup.test.ts
- layer/themes/setup-folder/tests/unit/base-setup.test.ts
- layer/themes/setup-folder/tests/unit/commands/theme.test.js
- layer/themes/setup-folder/tests/unit/commands/theme.test.js
- layer/themes/setup-folder/tests/unit/commands/theme.test.ts
- layer/themes/setup-folder/tests/unit/commands/theme.test.ts
- layer/themes/setup-folder/tests/unit/demo-setup.test.js
- layer/themes/setup-folder/tests/unit/demo-setup.test.js
- layer/themes/setup-folder/tests/unit/demo-setup.test.ts
- layer/themes/setup-folder/tests/unit/demo-setup.test.ts
- layer/themes/setup-folder/tests/unit/setup-classes-complete.test.js
- layer/themes/setup-folder/tests/unit/setup-classes-complete.test.ts
- layer/themes/setup-folder/tests/unit/story-setup.test.js
- layer/themes/setup-folder/tests/unit/story-setup.test.ts
- layer/themes/setup-folder/tests/unit/theme-setup.test.js
- layer/themes/setup-folder/tests/unit/theme-setup.test.ts

### coverage-aggregator (30 violations)

**External Library Usage (10):**
- layer/themes/coverage-aggregator/tests/unit/coverage-aggregator.test.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/scripts/analyze-coverage.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator-branch.test.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator.test.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-report-generator.test.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-report-generator.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service-unmocked.test.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service.test.ts
  - `import * as fs from 'fs'`
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service.ts
  - `import * as fs from 'fs'`

**Mock Usage (20):**
- layer/themes/coverage-aggregator/tests/unit/coverage-aggregator.test.ts
- layer/themes/coverage-aggregator/tests/unit/coverage-aggregator.test.ts
- layer/themes/coverage-aggregator/tests/unit/coverage-aggregator.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/index.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/index.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator-branch.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator-branch.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator-branch.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-aggregator.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-report-generator.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-report-generator.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-report-generator.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service-unmocked.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service-unmocked.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service-unmocked.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service.test.ts
- layer/themes/coverage-aggregator/user-stories/001-app-level-coverage/src/services/integrated-coverage-service.test.ts

### env-config (26 violations)

**External Library Usage (25):**
- layer/themes/env-config/tests/unit/config-manager.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/src/components/config-manager.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/src/components/file-generator.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/src/components/port-registry.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/env/file-system-operations.envtest.ts
  - `import * as fs from 'fs'`
  - `import { mkdtemp, rm } from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/integration/config-manager-port-allocator.itest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/integration/file-generator-config.itest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/integration/port-allocator-registry.itest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/system/theme-creation-workflow.systest.ts
  - `import * as fs from 'fs'`
  - `import { mkdtemp, rm } from 'fs/promises'`
  - `require('fs')`
- layer/themes/env-config/user-stories/025-env-config-system/tests/unit/config-manager-additional.utest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/unit/config-manager.utest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/unit/file-generator.utest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/unit/port-allocator.utest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/025-env-config-system/tests/unit/port-registry.utest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/026-auto-env-generation/src/implementations/env-generator-impl.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/env-config/user-stories/026-auto-env-generation/tests/env/service-discovery.envtest.ts
  - `import * as fs from 'fs'`
  - `import * as http from 'http'`
- layer/themes/env-config/user-stories/026-auto-env-generation/tests/external/env-generator.etest.ts
  - `import * as fs from 'fs'`
- layer/themes/env-config/user-stories/026-auto-env-generation/tests/external/service-discovery.etest.ts
  - `import * as fs from 'fs'`
  - `import * as http from 'http'`
- layer/themes/env-config/user-stories/026-auto-env-generation/tests/system/complete-env-generation.systest.ts
  - `import * as fs from 'fs'`
  - `require('fs')`

**Mock Usage (1):**
- layer/themes/env-config/tests/unit/config-manager.test.ts

### mcp-agent (21 violations)

**External Library Usage (3):**
- layer/themes/mcp-agent/children/src/server/mcp-connection.ts
  - `import WebSocket from 'ws'`
- layer/themes/mcp-agent/tests/unit/agents/core/coder-agent.test.ts
  - `import fs from "fs"`
- layer/themes/mcp-agent/tests/unit/mcp-connection.test.ts
  - `import WebSocket from 'ws'`

**Test Fraud (1):**
- layer/themes/mcp-agent/tests/unit/agents/core/coder-agent.test.ts

**Mock Usage (17):**
- layer/themes/mcp-agent/children/src/agents/core/coder-agent.ts
- layer/themes/mcp-agent/tests/unit/agent-orchestrator.test.ts
- layer/themes/mcp-agent/tests/unit/agents/core/coder-agent.test.ts
- layer/themes/mcp-agent/tests/unit/coder-agent.test.ts
- layer/themes/mcp-agent/tests/unit/mcp-connection.test.ts
- layer/themes/mcp-agent/tests/unit/mcp-connection.test.ts
- layer/themes/mcp-agent/tests/unit/mcp-connection.test.ts
- layer/themes/mcp-agent/tests/unit/mcp-server-manager.test.ts
- layer/themes/mcp-agent/tests/unit/mcp-server-manager.test.ts
- layer/themes/mcp-agent/tests/unit/mcp-server-manager.test.ts
- layer/themes/mcp-agent/tests/unit/session/session-manager.test.ts
- layer/themes/mcp-agent/tests/unit/session/session-manager.test.ts
- layer/themes/mcp-agent/tests/unit/session/session-manager.test.ts
- layer/themes/mcp-agent/tests/unit/session-manager.test.ts
- layer/themes/mcp-agent/tests/unit/session-manager.test.ts
- layer/themes/mcp-agent/tests/unit/session-manager.test.ts
- layer/themes/mcp-agent/tests/unit/tester-agent.test.ts

### test-as-manual (19 violations)

**External Library Usage (16):**
- layer/themes/test-as-manual/user-stories/001-mftod-converter/bin/test-as-manual.ts
  - `import * as fs from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/examples/bdd-demo.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/examples/executive-summary-demo.ts
  - `import * as fs from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/examples/hea-demo.ts
  - `import * as fs from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/examples/simple-values-demo.ts
  - `import * as fs from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/54.external/database/DatabaseAdapter.ts
  - `import { Database } from 'sqlite3'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/54.external/database/SqliteAdapter.ts
  - `import * as fs from 'fs'`
  - `import { Database } from 'sqlite3'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/54.external/services/FileReader.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/54.external/services/FileWriter.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/54.external/services/RealCaptureService.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/application/converter.ts
  - `import { promises as fs } from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/domain/capture-service.ts
  - `import { promises as fs, existsSync } from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/domain/external-log-service.ts
  - `require('fs')`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/src/plugins/playwright-capture/index.ts
  - `import * as fs from 'fs'`
- layer/themes/test-as-manual/user-stories/001-mftod-converter/tests/integration/converter.test.ts
  - `import * as fs from 'fs'`

**Test Fraud (2):**
- layer/themes/test-as-manual/user-stories/001-mftod-converter/tests/integration/converter.test.ts
- layer/themes/test-as-manual/user-stories/001-mftod-converter/tests/unit/test-parser.test.ts

**Mock Usage (1):**
- layer/themes/test-as-manual/user-stories/001-mftod-converter/tests/integration/converter.test.ts

### vllm-coordinator-agent (18 violations)

**External Library Usage (9):**
- layer/themes/vllm-coordinator-agent/tests/unit/vllm-coordinator-agent-core.test.ts
  - `import axios from 'axios'`
  - `import { Server } from 'socket.io'`
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/scripts/setup-vllm.ts
  - `import * as fs from 'fs'`
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/src/services/vllm-client.ts
  - `import * as http from 'http'`
  - `import * as https from 'https'`
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/src/services/vllm-installer.ts
  - `import * as fs from 'fs'`
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/services/vllm-client.test.ts
  - `import * as http from 'http'`
  - `import * as https from 'https'`
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/services/vllm-installer.test.ts
  - `import * as fs from 'fs'`

**Mock Usage (9):**
- layer/themes/vllm-coordinator-agent/tests/setup.ts
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/agents/vllm-coordinator.test.ts
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/agents/vllm-coordinator.test.ts
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/agents/vllm-coordinator.test.ts
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/services/vllm-client.test.ts
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/services/vllm-client.test.ts
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/services/vllm-installer.test.ts
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/services/vllm-installer.test.ts
- layer/themes/vllm-coordinator-agent/user-stories/027-vllm-coordinator/tests/unit/services/vllm-installer.test.ts

### lsp-mcp (17 violations)

**External Library Usage (7):**
- layer/themes/lsp-mcp/children/LSPClient.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/lsp-mcp/examples/verify-multi-instance.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/lsp-mcp/tests/coverage-report.ts
  - `import * as fs from 'fs'`
- layer/themes/lsp-mcp/tests/integration/lsp-mcp.integration.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/lsp-mcp/tests/integration/multi-instance.integration.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/lsp-mcp/tests/unit/LSPClient.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/lsp-mcp/tests/unit/LSPManager.test.ts
  - `import * as fs from 'fs/promises'`

**Mock Usage (10):**
- layer/themes/lsp-mcp/tests/integration/lsp-mcp.integration.test.ts
- layer/themes/lsp-mcp/tests/integration/lsp-mcp.integration.test.ts
- layer/themes/lsp-mcp/tests/integration/lsp-mcp.integration.test.ts
- layer/themes/lsp-mcp/tests/integration/multi-instance.integration.test.ts
- layer/themes/lsp-mcp/tests/integration/multi-instance.integration.test.ts
- layer/themes/lsp-mcp/tests/setup.ts
- layer/themes/lsp-mcp/tests/unit/LSPClient.test.ts
- layer/themes/lsp-mcp/tests/unit/LSPClient.test.ts
- layer/themes/lsp-mcp/tests/unit/LSPManager.test.ts
- layer/themes/lsp-mcp/tests/unit/LSPManager.test.ts

### react-native-base (17 violations)

**External Library Usage (3):**
- layer/themes/react-native-base/user-stories/001-basic-architecture/tests/unit/project-generator.utest.ts
  - `import * as fs from 'fs'`
- layer/themes/react-native-base/user-stories/001-basic-architecture/tests/unit/template-manager.utest.ts
  - `import * as fs from 'fs'`
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/infrastructure/api/client.ts
  - `import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'`

**Mock Usage (14):**
- layer/themes/react-native-base/user-stories/001-basic-architecture/tests/unit/project-generator.utest.ts
- layer/themes/react-native-base/user-stories/001-basic-architecture/tests/unit/project-generator.utest.ts
- layer/themes/react-native-base/user-stories/001-basic-architecture/tests/unit/template-manager.utest.ts
- layer/themes/react-native-base/user-stories/005-rn-project-structure/jest.setup.ts
- layer/themes/react-native-base/user-stories/005-rn-project-structure/jest.setup.ts
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/__tests__/App.test.tsx
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/application/hooks/__tests__/useAuth.test.tsx
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/application/hooks/__tests__/useAuth.test.tsx
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/application/hooks/__tests__/useAuth.test.tsx
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/application/services/__tests__/authService.test.ts
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/presentation/components/__tests__/ErrorBoundary.test.tsx
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/presentation/navigation/__tests__/AppNavigator.test.tsx
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/presentation/navigation/__tests__/AppNavigator.test.tsx
- layer/themes/react-native-base/user-stories/005-rn-project-structure/src/layers/presentation/screens/auth/__tests__/LoginScreen.test.tsx

### hea-architecture (13 violations)

**External Library Usage (10):**
- layer/themes/hea-architecture/user-stories/006-hea-implementation/scripts/scaffold.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/scripts/validate.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/src/core/layer-validator.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/src/utils/dependency-graph.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/src/utils/module-analyzer.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/tests/dependency-graph-system.test.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/tests/hea-real-world.test.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/tests/hea-system.test.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/tests/pipe-system.test.ts
  - `import * as fs from 'fs'`
- layer/themes/hea-architecture/user-stories/006-hea-implementation/tests/unit/layer-validator.test.ts
  - `import * as fs from 'fs'`

**Mock Usage (3):**
- layer/themes/hea-architecture/user-stories/006-hea-implementation/tests/unit/layer-validator.test.ts
- layer/themes/hea-architecture/user-stories/006-hea-implementation/tests/unit/layer-validator.test.ts
- layer/themes/hea-architecture/user-stories/006-hea-implementation/tests/unit/layer-validator.test.ts

### cli-framework (12 violations)

**External Library Usage (8):**
- layer/themes/cli-framework/user-stories/002-cli-base-structure/examples/plugin-example.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/cli-framework/user-stories/002-cli-base-structure/tests/system/command-registration-execution.stest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/cli-framework/user-stories/002-cli-base-structure/tests/system/error-handling.stest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/cli-framework/user-stories/002-cli-base-structure/tests/system/help-system.stest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/cli-framework/user-stories/002-cli-base-structure/tests/system/plugins-hooks.stest.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/cli-framework/user-stories/002-cli-base-structure/tests/system/process-console-interaction.stest.ts
  - `import * as fs from 'fs'`
  - `import * as fs from 'fs/promises'`
- layer/themes/cli-framework/user-stories/004-cli-development/tests/system/cli-full-application.stest.ts
  - `import * as fs from 'fs/promises'`

**Mock Usage (4):**
- layer/themes/cli-framework/tests/setup.ts
- layer/themes/cli-framework/tests/unit/cli.test.ts
- layer/themes/cli-framework/tests/unit/cli.test.ts
- layer/themes/cli-framework/user-stories/002-cli-base-structure/tests/integration/cli.test.ts

### llm-agent-epic (10 violations)

**External Library Usage (3):**
- layer/themes/llm-agent-epic/children/src/infrastructure/session-manager.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/llm-agent-epic/tests/unit/permission-manager.test.ts
  - `import * as fs from 'fs'`
- layer/themes/llm-agent-epic/tests/unit/session-manager.test.ts
  - `import * as fs from 'fs'`

**Mock Usage (7):**
- layer/themes/llm-agent-epic/tests/unit/auth-service.test.ts
- layer/themes/llm-agent-epic/tests/unit/permission-manager.test.ts
- layer/themes/llm-agent-epic/tests/unit/permission-manager.test.ts
- layer/themes/llm-agent-epic/tests/unit/permission-manager.test.ts
- layer/themes/llm-agent-epic/tests/unit/session-manager.test.ts
- layer/themes/llm-agent-epic/tests/unit/session-manager.test.ts
- layer/themes/llm-agent-epic/tests/unit/session-manager.test.ts

### shared (10 violations)

**External Library Usage (2):**
- layer/themes/shared/children/utils/file-generation.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/shared/children/utils/test-helpers.ts
  - `import * as fs from 'fs/promises'`

**Mock Usage (8):**
- layer/themes/shared/children/fraud-detection/tests/mock-detector.test.ts
- layer/themes/shared/children/fraud-detection/tests/mock-detector.test.ts
- layer/themes/shared/children/fraud-detection/tests/mock-detector.test.ts
- layer/themes/shared/children/utils/test-helpers.ts
- layer/themes/shared/children/utils/test-helpers.ts
- layer/themes/shared/tests/unit/port-management.test.ts
- layer/themes/shared/tests/unit/port-management.test.ts
- layer/themes/shared/tests/unit/port-management.test.ts

### vllm-mcp-agent (10 violations)

**External Library Usage (9):**
- layer/themes/vllm-mcp-agent/user-stories/012-vllm-mcp-integration/scripts/chat-cli.ts
  - `import * as fs from 'fs'`
- layer/themes/vllm-mcp-agent/user-stories/012-vllm-mcp-integration/scripts/setup-vllm.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/vllm-mcp-agent/user-stories/012-vllm-mcp-integration/src/application/VLLMPlatform.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/vllm-mcp-agent/user-stories/012-vllm-mcp-integration/src/domain/ModelManager.ts
  - `import * as fs from 'fs/promises'`
  - `import axios from 'axios'`
- layer/themes/vllm-mcp-agent/user-stories/012-vllm-mcp-integration/src/domain/VLLMServer.ts
  - `import * as fs from 'fs/promises'`
  - `import axios from 'axios'`
- layer/themes/vllm-mcp-agent/user-stories/012-vllm-mcp-integration/src/external/VLLMClient.ts
  - `import axios, { AxiosInstance } from 'axios'`
- layer/themes/vllm-mcp-agent/user-stories/012-vllm-mcp-integration/src/index.ts
  - `import * as fs from 'fs'`

**Mock Usage (1):**
- layer/themes/vllm-mcp-agent/user-stories/012-vllm-mcp-integration/tests/unit/VLLMPlatform.test.ts

### dev-environment (3 violations)

**External Library Usage (3):**
- layer/themes/dev-environment/tests/unit/setup-script.test.ts
  - `import * as fs from 'fs'`
- layer/themes/dev-environment/user-stories/001-setup-scripts/tests/integration/setup-workflow.test.ts
  - `import * as fs from 'fs/promises'`
- layer/themes/dev-environment/user-stories/001-setup-scripts/tests/unit/script-helpers.test.ts
  - `import * as fs from 'fs'`

### flow-validator (3 violations)

**External Library Usage (3):**
- layer/themes/flow-validator/user-stories/009-flow-validation/tests/system/flow-validation-system.stest.ts
  - `import * as fs from 'fs/promises'`
  - `import * as http from 'http'`
  - `import * as WebSocket from 'ws'`

### mock-free-test-oriented (2 violations)

**Mock Usage (2):**
- layer/themes/mock-free-test-oriented/user-stories/003-mock-free-testing/tests/unit/mock-free-validator.utest.ts
- layer/themes/mock-free-test-oriented/user-stories/003-mock-free-testing/tests/unit/mock-free-validator.utest.ts

### typescript-config (2 violations)

**External Library Usage (2):**
- layer/themes/typescript-config/tests/unit/typescript-config.test.ts
  - `import * as fs from 'fs'`
- layer/themes/typescript-config/user-stories/004-strict-typescript/scripts/migrate-to-strict.ts
  - `import * as fs from 'fs'`

### code-enhancer (1 violations)

**External Library Usage (1):**
- layer/themes/code-enhancer/user-stories/012-code-enhancement/tests/integration/code-enhancement-pipeline.itest.ts
  - `import * as fs from 'fs/promises'`

### docker-environment (1 violations)

**External Library Usage (1):**
- layer/themes/docker-environment/tests/unit/docker-compose.test.ts
  - `import * as fs from 'fs'`

### gui-generator (1 violations)

**External Library Usage (1):**
- layer/themes/gui-generator/user-stories/008-gui-generation/tests/integration/gui-generation-workflow.itest.ts
  - `import * as fs from 'fs/promises'`

### mate-dealer (1 violations)

**Test Fraud (1):**
- layer/themes/mate-dealer/tests/unit/sample.test.ts

