# Production Code File Access Violations
Generated: 2025-08-15T02:48:28.990Z

*Excludes: test files, demos, node_modules*

## Summary
- Production files scanned: 993
- Files with violations: 166
- Total violations: 666

## Violations by Component

### scripts
Files: 3 | Violations: 15

#### scripts/restore-and-refactor-docs.js
- Line 45: `fs.writeFile`
- Line 317: `fs.writeFile`
- Line 334: `fs.mkdir`
- Line 337: `fs.writeFile`
- Line 763: `fs.writeFile`
- Line 795: `fs.writeFile`
- Line 912: `fs.writeFile`

#### scripts/fix-documentation.js
- Line 507: `fs.writeFile`
- Line 771: `fs.writeFile`
- Line 967: `fs.mkdir`
- Line 968: `fs.writeFile`
- Line 978: `fs.writeFile`

#### scripts/check-duplication.ts
- Line 464: `fs.mkdir`
- Line 468: `fs.writeFile`
- Line 473: `fs.writeFile`

### tool_web-scraper
Files: 2 | Violations: 9

#### layer/themes/tool_web-scraper/src/cli.ts
- Line 367: `fs.mkdir`
- Line 387: `fs.writeFile`
- Line 391: `fs.mkdir`
- Line 415: `fs.writeFile`
- Line 598: `fs.mkdir`
- Line 599: `fs.writeFile`

#### layer/themes/tool_web-scraper/children/exporter/index.ts
- Line 289: `fs.mkdir`
- Line 307: `fs.writeFile`
- Line 309: `fs.writeFile`

### tool_coverage-aggregator
Files: 1 | Violations: 4

#### layer/themes/tool_coverage-aggregator/user-stories/001-app-level-coverage/src/services/coverage-report-generator.ts
- Line 20: `fs.mkdirSync`
- Line 62: `fs.writeFileSync`
- Line 276: `fs.writeFileSync`
- Line 390: `fs.writeFileSync`

### shared
Files: 2 | Violations: 9

#### layer/themes/shared/children/utils/test-helpers.ts
- Line 15: `fs.mkdir`
- Line 151: `fs.mkdir`
- Line 152: `fs.writeFile`

#### layer/themes/shared/children/utils/file-generation.ts
- Line 62: `fs.writeFile`
- Line 131: `fs.writeFile`
- Line 160: `fs.writeFile`
- Line 210: `fs.writeFile`
- Line 222: `fs.mkdir`
- Line 285: `fs.writeFile`

### research
Files: 3 | Violations: 7

#### layer/themes/research/user-stories/circular-dependency-detection/src/cli/visualization-generator.ts
- Line 85: `fs.writeFile`
- Line 101: `fs.writeFile`
- Line 365: `fs.writeFile`

#### layer/themes/research/user-stories/circular-dependency-detection/src/cli/report-generator.ts
- Line 38: `fs.writeFile`
- Line 112: `fs.writeFile`
- Line 349: `fs.writeFile`

#### layer/themes/research/user-stories/circular-dependency-detection/src/cli/config-manager.ts
- Line 103: `fs.writeFile`

### portal_security
Files: 16 | Violations: 64

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/theme-setup.ts
- Line 135: `fs.writeFile`
- Line 237: `fs.writeFile`
- Line 275: `fs.writeFile`

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/theme-root-connector.ts
- Line 94: `fs.writeFile`
- Line 180: `fs.writeFile`
- Line 189: `fs.writeFile`
- Line 226: `fs.writeFile`

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/test-setup.ts
- Line 208: `fs.writeFile`
- Line 245: `fs.writeFile`
- Line 296: `fs.writeFile`
- Line 345: `fs.writeFile`
- Line 395: `fs.writeFile`
- Line 433: `fs.writeFile`
- Line 470: `fs.writeFile`
- Line 544: `fs.writeFile`

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/story-setup.ts
- Line 148: `fs.writeFile`
- Line 251: `fs.writeFile`
- Line 276: `fs.writeFile`
- Line 315: `fs.writeFile`
- Line 355: `fs.writeFile`

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/release-setup.ts
- Line 202: `fs.writeFile`
- Line 497: `fs.writeFile`
- Line 549: `fs.writeFile`
- Line 667: `fs.writeFile`
- Line 712: `fs.writeFile`
- Line 771: `fs.writeFile`
- Line 801: `fs.writeFile`
- Line 843: `fs.writeFile`
- Line 849: `fs.writeFile`

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/mcp-setup.ts
- Line 97: `fs.promises.mkdir`
- Line 102: `fs.promises.writeFile`
- Line 121: `fs.promises.mkdir`
- Line 134: `fs.promises.writeFile`

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/epic-setup.ts
- Line 137: `fs.writeFile`
- Line 238: `fs.writeFile`

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/demo-setup.ts
- Line 166: `fs.writeFile`
- Line 182: `fs.writeFile`
- Line 186: `fs.writeFile`
- Line 191: `fs.writeFile`
- Line 210: `fs.writeFile`
- Line 243: `fs.writeFile`
- Line 308: `fs.writeFile`
- Line 406: `fs.writeFile`

#### layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/base-setup.ts
- Line 152: `fs.writeFile`
- Line 207: `fs.writeFile`
- Line 219: `fs.writeFile`
- Line 311: `fs.writeFile`

#### layer/themes/portal_security/children/ServiceDiscovery.ts
- Line 408: `fs.mkdirSync`
- Line 417: `fs.writeFileSync`

#### layer/themes/portal_security/children/PortEnforcer.ts
- Line 152: `fs.mkdirSync`
- Line 158: `fs.appendFileSync`

#### layer/themes/portal_security/children/EnvGenerator.ts
- Line 243: `fs.mkdirSync`
- Line 247: `fs.writeFileSync`

#### layer/themes/portal_security/children/EnhancedPortManager.ts
- Line 378: `fs.mkdirSync`
- Line 382: `fs.appendFileSync`
- Line 397: `fs.mkdirSync`
- Line 400: `fs.writeFileSync`

#### layer/themes/portal_security/children/CredentialStore.ts
- Line 274: `fs.mkdir`
- Line 275: `fs.writeFile`

#### layer/themes/portal_security/children/ConfigManager.ts
- Line 437: `fs.mkdirSync`
- Line 440: `fs.writeFileSync`

#### layer/themes/portal_security/children/AuditLogger.ts
- Line 256: `fs.writeFile`
- Line 285: `fs.mkdir`
- Line 315: `fs.appendFile`

### portal_gui-selector
Files: 4 | Violations: 17

#### layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/deploy.ts
- Line 87: `fs.writeFileSync`

#### layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/src/services/VFThemeStorageWrapper.ts
- Line 86: `fs.mkdirSync`
- Line 117: `fs.appendFileSync`
- Line 134: `fs.mkdirSync`
- Line 138: `fs.mkdirSync`
- Line 142: `fs.writeFileSync`
- Line 183: `fs.mkdirSync`
- Line 187: `fs.mkdirSync`
- Line 191: `fs.writeFileSync`
- Line 211: `fs.mkdirSync`
- Line 215: `fs.mkdirSync`
- Line 219: `fs.writeFileSync`
- Line 242: `fs.mkdirSync`
- Line 248: `fs.writeFileSync`

#### layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/src/services/ExternalLogService.ts
- Line 83: `fs.mkdirSync`
- Line 406: `fs.createWriteStream`

#### layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/src/services/DatabaseService.ts
- Line 18: `fs.mkdirSync`

### portal_aidev
Files: 1 | Violations: 1

#### layer/themes/portal_aidev/user-stories/024-aidev-portal/src/server.ts
- Line 29: `fs.mkdirSync`

### mcp_lsp
Files: 1 | Violations: 7

#### layer/themes/mcp_lsp/examples/verify-multi-instance.ts
- Line 22: `fs.mkdir`
- Line 23: `fs.mkdir`
- Line 24: `fs.mkdir`
- Line 27: `fs.writeFile`
- Line 34: `fs.writeFile`
- Line 45: `fs.writeFile`
- Line 55: `fs.writeFile`

### llm-agent_pocketflow
Files: 2 | Violations: 4

#### layer/themes/llm-agent_pocketflow/user-stories/001-pocket-task-manager/src/external/task-storage.ts
- Line 215: `fs.writeFileSync`
- Line 252: `fs.mkdirSync`

#### layer/themes/llm-agent_pocketflow/user-stories/001-pocket-task-manager/src/external/logger.ts
- Line 33: `fs.appendFileSync`
- Line 44: `fs.mkdirSync`

### llm-agent_coordinator-ollama
Files: 1 | Violations: 3

#### layer/themes/llm-agent_coordinator-ollama/src/cli.ts
- Line 89: `fs.writeFileSync`
- Line 116: `fs.writeFileSync`
- Line 581: `fs.writeFileSync`

### llm-agent_coordinator-claude
Files: 3 | Violations: 5

#### layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/src/index.ts
- Line 137: `fs.writeFileSync`

#### layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/src/integration/task-queue-manager.ts
- Line 134: `fs.writeFile`

#### layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/src/core/session-manager.ts
- Line 109: `fs.mkdir`
- Line 222: `fs.writeFile`
- Line 224: `fs.writeFile`

### llm-agent_chat-space
Files: 2 | Violations: 6

#### layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/src/cli.ts
- Line 50: `fs.mkdirSync`

#### layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/src/external/file-storage.ts
- Line 57: `fs.mkdir`
- Line 67: `fs.writeFile`
- Line 95: `fs.writeFile`
- Line 150: `fs.writeFile`
- Line 155: `fs.appendFile`

### init_setup-folder
Files: 13 | Violations: 127

#### layer/themes/init_setup-folder/src/services/unified-quality-setup.ts
- Line 259: `fs.mkdir`
- Line 265: `fs.writeFile`
- Line 311: `fs.writeFile`
- Line 326: `fs.writeFile`
- Line 341: `fs.writeFile`
- Line 392: `fs.writeFile`
- Line 431: `fs.writeFile`
- Line 493: `fs.writeFile`
- Line 533: `fs.writeFile`
- Line 616: `fs.mkdir`
- Line 617: `fs.writeFile`
- Line 641: `fs.mkdir`
- Line 643: `fs.writeFile`
- Line 916: `fs.writeFile`
- Line 956: `fs.writeFile`
- Line 1251: `fs.writeFile`
- Line 1270: `fs.writeFile`

#### layer/themes/init_setup-folder/src/services/qemu-setup.ts
- Line 68: `fs.mkdirSync`
- Line 86: `fs.writeFileSync`
- Line 96: `fs.mkdirSync`
- Line 111: `fs.writeFileSync`
- Line 255: `fs.writeFileSync`

#### layer/themes/init_setup-folder/src/services/docker-setup.ts
- Line 65: `fs.mkdirSync`
- Line 89: `fs.writeFileSync`
- Line 254: `fs.writeFileSync`
- Line 360: `fs.writeFileSync`
- Line 379: `fs.writeFileSync`
- Line 405: `fs.writeFileSync`
- Line 498: `fs.mkdirSync`
- Line 502: `fs.writeFileSync`

#### layer/themes/init_setup-folder/src/services/cpp-threshold-config.ts
- Line 149: `fs.mkdir`
- Line 152: `fs.writeFile`
- Line 231: `fs.mkdir`
- Line 232: `fs.writeFile`
- Line 263: `fs.writeFile`
- Line 291: `fs.writeFile`
- Line 306: `fs.writeFile`
- Line 344: `fs.writeFile`

#### layer/themes/init_setup-folder/src/services/cpp-report-setup.ts
- Line 98: `fs.mkdir`
- Line 104: `fs.writeFile`
- Line 139: `fs.writeFile`
- Line 200: `fs.writeFileSync`
- Line 352: `fs.writeFile`
- Line 396: `fs.writeFileSync`
- Line 406: `fs.writeFile`
- Line 427: `fs.writeFile`
- Line 552: `fs.writeFile`
- Line 589: `fs.writeFile`
- Line 620: `fs.writeFile`

#### layer/themes/init_setup-folder/src/services/cpp-duplication-setup.ts
- Line 84: `fs.mkdir`
- Line 104: `fs.writeFile`
- Line 144: `fs.writeFile`
- Line 180: `fs.writeFile`
- Line 205: `fs.writeFile`
- Line 250: `fs.writeFileSync`
- Line 258: `fs.writeFile`
- Line 292: `fs.writeFile`
- Line 333: `fs.writeFile`
- Line 392: `fs.writeFile`
- Line 419: `fs.writeFile`
- Line 463: `fs.writeFile`
- Line 662: `fs.writeFile`
- Line 665: `fs.writeFile`

#### layer/themes/init_setup-folder/src/services/cpp-coverage-setup.ts
- Line 51: `fs.mkdir`
- Line 71: `fs.writeFile`
- Line 77: `fs.writeFile`
- Line 164: `fs.writeFile`
- Line 186: `fs.appendFile`
- Line 189: `fs.writeFile`

#### layer/themes/init_setup-folder/src/services/cpp-build-setup.ts
- Line 178: `fs.writeFile`
- Line 204: `fs.writeFile`
- Line 227: `fs.writeFile`
- Line 283: `fs.writeFile`
- Line 306: `fs.writeFile`
- Line 352: `fs.mkdir`
- Line 398: `fs.writeFile`
- Line 427: `fs.writeFile`

#### layer/themes/init_setup-folder/src/services/container-orchestrator.ts
- Line 59: `fs.mkdirSync`
- Line 76: `fs.writeFileSync`
- Line 306: `fs.writeFileSync`
- Line 386: `fs.writeFileSync`

#### layer/themes/init_setup-folder/src/services/EnvironmentSetupService.ts
- Line 91: `fs.mkdir`
- Line 92: `fs.mkdir`
- Line 93: `fs.mkdir`
- Line 94: `fs.mkdir`
- Line 95: `fs.mkdir`
- Line 207: `fs.mkdir`
- Line 321: `fs.mkdir`
- Line 377: `fs.mkdir`
- Line 409: `fs.mkdir`
- Line 419: `fs.writeFile`
- Line 426: `fs.writeFile`
- Line 433: `fs.writeFile`
- Line 440: `fs.writeFile`
- Line 456: `fs.mkdir`
- Line 530: `fs.mkdir`
- Line 566: `fs.writeFile`
- Line 588: `fs.writeFile`
- Line 605: `fs.writeFile`
- Line 624: `fs.writeFile`
- Line 633: `fs.writeFile`
- Line 648: `fs.writeFile`
- Line 694: `fs.writeFile`
- Line 699: `fs.writeFile`
- Line 836: `fs.writeFile`
- Line 894: `fs.mkdir`
- Line 895: `fs.writeFile`
- Line 909: `fs.writeFile`
- Line 938: `fs.writeFile`
- Line 963: `fs.writeFile`

#### layer/themes/init_setup-folder/src/managers/QEMURuntimeManager.ts
- Line 393: `fs.mkdir`
- Line 400: `fs.writeFile`
- Line 407: `fs.mkdir`

#### layer/themes/init_setup-folder/src/cli/setup-env.ts
- Line 57: `fs.writeFile`

#### layer/themes/init_setup-folder/src/cli/setup-container.ts
- Line 610: `fs.mkdirSync`
- Line 657: `fs.writeFileSync`
- Line 663: `fs.mkdirSync`
- Line 681: `fs.writeFileSync`
- Line 686: `fs.mkdirSync`
- Line 687: `fs.mkdirSync`
- Line 688: `fs.mkdirSync`
- Line 704: `fs.writeFileSync`
- Line 715: `fs.writeFileSync`
- Line 720: `fs.writeFileSync`
- Line 735: `fs.writeFileSync`
- Line 740: `fs.writeFileSync`
- Line 762: `fs.writeFileSync`

### init_qemu
Files: 7 | Violations: 76

#### layer/themes/init_qemu/src/services/SimpleImageBuilder.ts
- Line 31: `fs.mkdir`
- Line 32: `fs.mkdir`
- Line 33: `fs.mkdir`
- Line 77: `fs.writeFile`
- Line 184: `fs.writeFile`
- Line 231: `fs.mkdir`
- Line 232: `fs.writeFile`

#### layer/themes/init_qemu/src/services/QEMUImageBuilder.ts
- Line 102: `fs.mkdir`
- Line 103: `fs.mkdir`
- Line 104: `fs.mkdir`
- Line 105: `fs.mkdir`
- Line 106: `fs.mkdir`
- Line 107: `fs.mkdir`
- Line 408: `fs.mkdir`
- Line 460: `fs.writeFile`
- Line 510: `fs.writeFile`
- Line 537: `fs.writeFile`
- Line 597: `fs.writeFile`
- Line 616: `fs.writeFile`
- Line 663: `fs.writeFile`

#### layer/themes/init_qemu/src/services/MockImageBuilder.ts
- Line 30: `fs.mkdir`
- Line 31: `fs.mkdir`
- Line 32: `fs.mkdir`
- Line 72: `fs.writeFile`
- Line 107: `fs.writeFile`
- Line 193: `fs.writeFile`
- Line 240: `fs.writeFile`
- Line 265: `fs.writeFile`
- Line 330: `fs.writeFile`

#### layer/themes/init_qemu/src/managers/VolumeManager.ts
- Line 85: `fs.mkdir`
- Line 86: `fs.mkdir`
- Line 201: `fs.mkdir`
- Line 500: `fs.mkdir`
- Line 555: `fs.mkdir`
- Line 601: `fs.writeFile`
- Line 647: `fs.mkdir`
- Line 652: `fs.mkdir`

#### layer/themes/init_qemu/src/core/QEMUManager.ts
- Line 140: `fs.mkdir`
- Line 141: `fs.mkdir`
- Line 142: `fs.mkdir`
- Line 143: `fs.mkdir`
- Line 167: `fs.mkdir`
- Line 667: `fs.mkdir`
- Line 781: `fs.writeFile`

#### layer/themes/init_qemu/src/cli/build-image.ts
- Line 269: `fs.writeFile`

#### layer/themes/init_qemu/src/builders/ImageBuilder.ts
- Line 114: `fs.mkdir`
- Line 115: `fs.mkdir`
- Line 116: `fs.mkdir`
- Line 127: `fs.mkdir`
- Line 301: `fs.mkdir`
- Line 413: `fs.mkdir`
- Line 436: `fs.writeFile`
- Line 448: `fs.mkdir`
- Line 460: `fs.mkdir`
- Line 461: `fs.writeFile`
- Line 472: `fs.mkdir`
- Line 473: `fs.writeFile`
- Line 484: `fs.mkdir`
- Line 485: `fs.writeFile`
- Line 496: `fs.mkdir`
- Line 497: `fs.writeFile`
- Line 508: `fs.mkdir`
- Line 509: `fs.writeFile`
- Line 526: `fs.mkdir`
- Line 527: `fs.writeFile`
- Line 558: `fs.mkdir`
- Line 563: `fs.mkdir`
- Line 585: `fs.mkdir`
- Line 634: `fs.mkdir`
- Line 744: `fs.mkdir`
- Line 745: `fs.writeFile`
- Line 760: `fs.mkdir`
- Line 761: `fs.writeFile`
- Line 782: `fs.mkdir`
- Line 819: `fs.writeFile`
- Line 843: `fs.writeFile`

### init_env-config
Files: 4 | Violations: 16

#### layer/themes/init_env-config/user-stories/026-auto-env-generation/src/implementations/env-generator-impl.ts
- Line 276: `fs.writeFile`

#### layer/themes/init_env-config/user-stories/025-env-config-system/src/components/port-registry.ts
- Line 47: `fs.mkdir`
- Line 49: `fs.writeFile`
- Line 92: `fs.writeFile`
- Line 106: `fs.writeFile`
- Line 148: `fs.writeFile`
- Line 161: `fs.writeFile`

#### layer/themes/init_env-config/user-stories/025-env-config-system/src/components/file-generator.ts
- Line 19: `fs.mkdir`
- Line 24: `fs.writeFile`
- Line 28: `fs.writeFile`
- Line 31: `fs.writeFile`
- Line 39: `fs.mkdir`
- Line 48: `fs.writeFile`
- Line 84: `fs.writeFile`
- Line 140: `fs.writeFile`

#### layer/themes/init_env-config/user-stories/025-env-config-system/src/components/config-manager.ts
- Line 108: `fs.writeFile`

### init_docker
Files: 8 | Violations: 14

#### layer/themes/init_docker/examples/compose-platform.ts
- Line 39: `fs.promises.writeFile`

#### layer/themes/init_docker/children/ReleaseEnvironmentOrchestrator.ts
- Line 162: `fs.promises.mkdir`
- Line 308: `fs.promises.writeFile`
- Line 650: `fs.promises.mkdir`
- Line 660: `fs.promises.mkdir`
- Line 663: `fs.promises.writeFile`

#### layer/themes/init_docker/children/FolderMountManager.ts
- Line 465: `fs.promises.mkdir`
- Line 469: `fs.promises.mkdir`
- Line 477: `fs.promises.writeFile`

#### layer/themes/init_docker/children/EnvironmentManager.ts
- Line 267: `fs.promises.writeFile`

#### layer/themes/init_docker/children/DockerBuilder.ts
- Line 500: `fs.promises.writeFile`

#### layer/themes/init_docker/children/CppBuildManager.ts
- Line 190: `fs.promises.mkdir`

#### layer/themes/init_docker/children/ComposeManager.ts
- Line 284: `fs.promises.writeFile`

#### layer/themes/init_docker/children/volume/index.ts
- Line 118: `fs.promises.mkdir`

### init_build-environment
Files: 2 | Violations: 14

#### layer/themes/init_build-environment/src/core/BuildEnvironmentManager.ts
- Line 134: `fs.mkdir`
- Line 135: `fs.mkdir`
- Line 247: `fs.mkdir`
- Line 291: `fs.writeFile`
- Line 704: `fs.writeFile`
- Line 873: `fs.writeFile`

#### layer/themes/init_build-environment/src/builders/QEMUEnvironmentBuilder.ts
- Line 99: `fs.mkdir`
- Line 100: `fs.mkdir`
- Line 432: `fs.mkdir`
- Line 492: `fs.mkdir`
- Line 494: `fs.writeFile`
- Line 499: `fs.mkdir`
- Line 501: `fs.writeFile`
- Line 671: `fs.writeFile`

### infra_test-as-manual
Files: 24 | Violations: 88

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/src/screenshot/ScreenshotCapture.ts
- Line 98: `fs.mkdir`
- Line 332: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/src/screenshot/ImageAnnotator.ts
- Line 82: `fs.writeFile`
- Line 375: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/src/screenshot/GalleryGenerator.ts
- Line 73: `fs.writeFile`
- Line 88: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/src/scanner/ThemeRegistry.ts
- Line 337: `fs.mkdir`
- Line 338: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/src/batch/PartialGenerator.ts
- Line 228: `fs.mkdir`
- Line 290: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/src/batch/ErrorHandler.ts
- Line 219: `fs.writeFile`
- Line 417: `fs.appendFile`

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/examples/test-processors.ts
- Line 62: `fs.mkdir`
- Line 72: `fs.writeFile`
- Line 91: `fs.writeFile`
- Line 119: `fs.writeFile`
- Line 151: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/examples/demo2.ts
- Line 63: `fs.mkdir`
- Line 64: `fs.writeFile`
- Line 121: `fs.writeFile`
- Line 137: `fs.writeFile`
- Line 149: `fs.writeFile`
- Line 155: `fs.writeFile`
- Line 161: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/examples/demo.ts
- Line 39: `fs.writeFile`
- Line 91: `fs.writeFile`
- Line 115: `fs.writeFile`
- Line 171: `fs.mkdir`
- Line 172: `fs.mkdir`
- Line 173: `fs.mkdir`
- Line 294: `fs.writeFile`
- Line 295: `fs.writeFile`
- Line 296: `fs.writeFile`
- Line 297: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/src/plugins/playwright-capture/index.ts
- Line 53: `fs.mkdirSync`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/src/external/services/RealCaptureService.ts
- Line 55: `fs.mkdir`
- Line 177: `fs.writeFile`
- Line 279: `fs.mkdir`
- Line 280: `fs.appendFile`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/src/external/services/FileWriter.ts
- Line 20: `fs.mkdir`
- Line 40: `fs.writeFile`
- Line 57: `fs.mkdir`
- Line 62: `fs.mkdir`
- Line 69: `fs.writeFile`
- Line 76: `fs.mkdir`
- Line 82: `fs.writeFile`
- Line 88: `fs.mkdir`
- Line 95: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/src/domain/external-log-service.ts
- Line 71: `fs.appendFileSync`
- Line 248: `fs.appendFileSync`
- Line 311: `fs.appendFileSync`
- Line 322: `fs.appendFileSync`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/src/domain/capture-service.ts
- Line 52: `fs.mkdir`
- Line 54: `fs.mkdir`
- Line 121: `fs.writeFile`
- Line 135: `fs.writeFile`
- Line 157: `fs.writeFile`
- Line 334: `fs.mkdir`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/src/application/converter.ts
- Line 254: `fs.mkdir`
- Line 255: `fs.writeFile`
- Line 351: `fs.mkdir`
- Line 352: `fs.writeFile`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/examples/simple-values-demo.ts
- Line 43: `fs.mkdirSync`
- Line 47: `fs.writeFileSync`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/examples/hea-demo.ts
- Line 63: `fs.mkdirSync`
- Line 67: `fs.writeFileSync`
- Line 120: `fs.writeFileSync`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/examples/executive-summary-demo.ts
- Line 95: `fs.mkdirSync`
- Line 99: `fs.writeFileSync`
- Line 280: `fs.writeFileSync`

#### layer/themes/infra_test-as-manual/user-stories/001-mftod-converter/examples/bdd-demo.ts
- Line 30: `fs.mkdir`
- Line 31: `fs.mkdir`
- Line 191: `fs.mkdir`
- Line 192: `fs.writeFile`

#### layer/themes/infra_test-as-manual/scripts/run-deployment-tests.ts
- Line 275: `fs.mkdirSync`
- Line 280: `fs.writeFileSync`
- Line 285: `fs.writeFileSync`

#### layer/themes/infra_test-as-manual/children/WebAppDeploymentTester.ts
- Line 853: `fs.mkdirSync`
- Line 859: `fs.writeFileSync`
- Line 883: `fs.mkdirSync`
- Line 891: `fs.writeFileSync`

#### layer/themes/infra_test-as-manual/children/TestPortManager.ts
- Line 329: `fs.mkdirSync`
- Line 332: `fs.writeFileSync`

#### layer/themes/infra_test-as-manual/children/PlaywrightIntegration.ts
- Line 297: `fs.mkdirSync`
- Line 300: `fs.writeFileSync`
- Line 330: `fs.writeFileSync`

#### layer/themes/infra_test-as-manual/children/DeploymentTestManager.ts
- Line 388: `fs.mkdirSync`
- Line 396: `fs.writeFileSync`

### infra_story-reporter
Files: 9 | Violations: 37

#### layer/themes/infra_story-reporter/user-stories/007-story-reporter/src/services/unified-report-generator.ts
- Line 1289: `fs.mkdir`
- Line 1290: `fs.writeFile`

#### layer/themes/infra_story-reporter/user-stories/007-story-reporter/src/services/story-service.ts
- Line 39: `fs.mkdir`
- Line 334: `fs.writeFile`

#### layer/themes/infra_story-reporter/user-stories/007-story-reporter/src/services/build-artifact-collector.ts
- Line 36: `fs.mkdir`
- Line 137: `fs.mkdir`
- Line 251: `fs.writeFile`
- Line 333: `fs.mkdir`
- Line 353: `fs.mkdir`
- Line 397: `fs.writeFile`
- Line 452: `fs.writeFile`
- Line 664: `fs.mkdir`

#### layer/themes/infra_story-reporter/user-stories/007-story-reporter/src/external/story-report-generator.ts
- Line 46: `fs.mkdir`
- Line 53: `fs.writeFile`
- Line 58: `fs.writeFile`

#### layer/themes/infra_story-reporter/user-stories/007-story-reporter/src/external/report-generator.ts
- Line 340: `fs.mkdir`
- Line 348: `fs.writeFile`

#### layer/themes/infra_story-reporter/user-stories/007-story-reporter/src/external/mock-free-test-runner.ts
- Line 199: `fs.mkdir`

#### layer/themes/infra_story-reporter/user-stories/007-story-reporter/src/cli/story-reporter-cli.ts
- Line 55: `fs.writeFile`
- Line 516: `fs.writeFile`
- Line 974: `fs.mkdir`
- Line 975: `fs.writeFile`
- Line 981: `fs.mkdir`
- Line 982: `fs.writeFile`
- Line 1137: `fs.mkdir`
- Line 1141: `fs.writeFile`
- Line 1144: `fs.writeFile`

#### layer/themes/infra_story-reporter/src/services/coverage-report-generator.ts
- Line 55: `fs.mkdir`
- Line 59: `fs.writeFile`
- Line 63: `fs.writeFile`
- Line 67: `fs.writeFile`
- Line 103: `fs.mkdir`
- Line 107: `fs.writeFile`
- Line 111: `fs.writeFile`

#### layer/themes/infra_story-reporter/src/cli/rule-suggestion-analyzer.ts
- Line 97: `fs.mkdir`
- Line 101: `fs.writeFile`
- Line 105: `fs.writeFile`

### infra_scripts
Files: 1 | Violations: 4

#### layer/themes/infra_scripts/scripts/setup/test-env/report-generator.ts
- Line 26: `fs.mkdir`
- Line 32: `fs.writeFile`
- Line 36: `fs.writeFile`
- Line 201: `fs.writeFile`

### infra_python-support
Files: 2 | Violations: 5

#### layer/themes/infra_python-support/children/UVEnvironmentManager.ts
- Line 235: `fs.writeFile`

#### layer/themes/infra_python-support/children/PythonProjectManager.ts
- Line 378: `fs.writeFile`
- Line 695: `fs.writeFile`
- Line 717: `fs.writeFile`
- Line 738: `fs.writeFile`

### infra_python-coverage
Files: 1 | Violations: 2

#### layer/themes/infra_python-coverage/children/CoverageReporter.ts
- Line 48: `fs.writeFile`
- Line 93: `fs.writeFile`

### infra_fraud-checker
Files: 9 | Violations: 31

#### layer/themes/infra_fraud-checker/scripts/validate-structure.ts
- Line 49: `fs.mkdirSync`
- Line 54: `fs.writeFileSync`
- Line 60: `fs.writeFileSync`

#### layer/themes/infra_fraud-checker/scripts/scan-themes-web-ui.ts
- Line 250: `fs.promises.mkdir`
- Line 255: `fs.promises.writeFile`
- Line 261: `fs.promises.writeFile`

#### layer/themes/infra_fraud-checker/scripts/detect-direct-file-access.ts
- Line 473: `fs.writeFileSync`
- Line 549: `fs.promises.mkdir`
- Line 550: `fs.promises.writeFile`
- Line 555: `fs.promises.mkdir`
- Line 556: `fs.promises.writeFile`

#### layer/themes/infra_fraud-checker/scripts/check-unauthorized-files.ts
- Line 115: `fs.mkdirSync`
- Line 118: `fs.writeFileSync`

#### layer/themes/infra_fraud-checker/scripts/check-external-lib-usage.ts
- Line 258: `fs.writeFileSync`
- Line 276: `fs.mkdirSync`
- Line 279: `fs.writeFileSync`

#### layer/themes/infra_fraud-checker/scripts/check-all-themes-comprehensive.ts
- Line 397: `fs.mkdirSync`
- Line 402: `fs.writeFileSync`
- Line 408: `fs.writeFileSync`
- Line 416: `fs.writeFileSync`

#### layer/themes/infra_fraud-checker/scripts/scripts/validate-structure.js
- Line 41: `fs.mkdirSync`
- Line 45: `fs.writeFileSync`
- Line 50: `fs.writeFileSync`

#### layer/themes/infra_fraud-checker/external/FileSystemWrapper.ts
- Line 54: `fs.mkdir`
- Line 55: `fs.writeFile`

#### layer/themes/infra_fraud-checker/examples/example.ts
- Line 67: `fs.mkdir`
- Line 70: `fs.writeFile`
- Line 98: `fs.writeFile`
- Line 125: `fs.writeFile`
- Line 145: `fs.writeFile`
- Line 183: `fs.writeFile`

### infra_filesystem-mcp
Files: 21 | Violations: 53

#### layer/themes/infra_filesystem-mcp/mcp-server.js
- Line 208: `fs.mkdir`
- Line 211: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/mcp-server-strict.js
- Line 267: `fs.writeFile`
- Line 570: `fs.mkdir`
- Line 587: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/mcp-server-enhanced.js
- Line 368: `fs.mkdir`
- Line 371: `fs.writeFile`
- Line 546: `fs.writeFile`
- Line 606: `fs.writeFile`
- Line 710: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/utils/JsonDocumentHandler.ts
- Line 71: `fs.mkdir`
- Line 75: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/src/ProtectedMCPServer.ts
- Line 390: `fs.mkdir`
- Line 391: `fs.appendFile`

#### layer/themes/infra_filesystem-mcp/src/scripts/insert-task-with-children.ts
- Line 39: `fs.writeFileSync`

#### layer/themes/infra_filesystem-mcp/scripts/fix-all-tests.ts
- Line 95: `fs.writeFileSync`

#### layer/themes/infra_filesystem-mcp/scripts/runnable/runnable-generate-test-manual.js
- Line 284: `fs.mkdir`
- Line 287: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/docker-test/src/violation-detector.js
- Line 415: `fs.writeFile`
- Line 440: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/docker-test/src/prompt-injector.js
- Line 275: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/docker-test/src/mcp-test-runner.js
- Line 48: `fs.mkdir`
- Line 347: `fs.writeFile`
- Line 390: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/docker-test/src/claude-launcher.js
- Line 381: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/children/VFValidatedFileWrapper.ts
- Line 55: `fs.mkdir`
- Line 66: `fs.mkdir`
- Line 78: `fs.mkdir`

#### layer/themes/infra_filesystem-mcp/children/VFScenarioEntityManager.ts
- Line 100: `fs.mkdir`
- Line 104: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/children/VFProtectedFileWrapper.ts
- Line 108: `fs.mkdir`
- Line 109: `fs.appendFile`
- Line 339: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/children/VFFileWrapper.ts
- Line 103: `fs.mkdir`
- Line 107: `fs.writeFile`
- Line 133: `fs.mkdir`
- Line 135: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/children/VFFileStructureWrapper.ts
- Line 544: `fs.mkdir`
- Line 558: `fs.mkdir`
- Line 565: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/children/FeatureTaskManager.ts
- Line 90: `fs.writeFile`

#### layer/themes/infra_filesystem-mcp/children/DefaultTaskExecutor.ts
- Line 134: `fs.promises.writeFile`
- Line 166: `fs.promises.mkdir`
- Line 287: `fs.promises.writeFile`

#### layer/themes/infra_filesystem-mcp/children/CommentTaskExecutor.ts
- Line 177: `fs.promises.writeFile`

#### layer/themes/infra_filesystem-mcp/children/ArtifactManager.ts
- Line 194: `fs.writeFile`
- Line 218: `fs.mkdir`
- Line 222: `fs.writeFile`
- Line 406: `fs.mkdir`
- Line 412: `fs.writeFile`
- Line 443: `fs.mkdir`
- Line 449: `fs.writeFile`
- Line 531: `fs.mkdir`

### infra_external-log-lib
Files: 11 | Violations: 24

#### layer/themes/infra_external-log-lib/user-stories/002-python-process-logging/src/application/python-log-platform.ts
- Line 85: `fs.promises.writeFile`

#### layer/themes/infra_external-log-lib/user-stories/001-basic-log-capture/src/domain/file-manager.ts
- Line 11: `fs.mkdirSync`
- Line 33: `fs.promises.writeFile`

#### layer/themes/infra_external-log-lib/user-stories/001-basic-log-capture/src/application/aidev-platform.ts
- Line 62: `fs.promises.writeFile`

#### layer/themes/infra_external-log-lib/src/validators/FileViolationPreventer.ts
- Line 366: `fs.writeFileSync`
- Line 374: `fs.writeFileSync`
- Line 382: `fs.mkdirSync`

#### layer/themes/infra_external-log-lib/src/utils/safe-file-operations.ts
- Line 44: `fs.writeFileSync`
- Line 67: `fs.writeFileSync`
- Line 89: `fs.mkdirSync`
- Line 110: `fs.mkdirSync`
- Line 133: `fs.appendFileSync`

#### layer/themes/infra_external-log-lib/src/loggers/RejectionTracker.ts
- Line 545: `fs.mkdirSync`
- Line 554: `fs.writeFileSync`

#### layer/themes/infra_external-log-lib/src/loggers/EventLogger.ts
- Line 387: `fs.mkdirSync`
- Line 415: `fs.createWriteStream`

#### layer/themes/infra_external-log-lib/examples/file-api-demo.ts
- Line 115: `fs.writeFileSync`
- Line 116: `fs.promises.writeFile`
- Line 117: `fs.mkdirSync`
- Line 121: `fs.writeFileSync`

#### layer/themes/infra_external-log-lib/children/streamer/index.ts
- Line 265: `fs.createWriteStream`

#### layer/themes/infra_external-log-lib/children/file-access-auditor/index.ts
- Line 477: `fs.promises.mkdir`

#### layer/themes/infra_external-log-lib/children/audited-fs/index.ts
- Line 145: `fs.writeFileSync`
- Line 502: `fs.createWriteStream`

### check_hea-architecture
Files: 4 | Violations: 7

#### layer/themes/check_hea-architecture/user-stories/006-hea-implementation/src/utils/dependency-graph.ts
- Line 141: `fs.writeFileSync`

#### layer/themes/check_hea-architecture/user-stories/006-hea-implementation/scripts/scaffold.ts
- Line 343: `fs.mkdirSync`
- Line 349: `fs.writeFileSync`

#### layer/themes/check_hea-architecture/children/reporter/index.ts
- Line 796: `fs.promises.mkdir`
- Line 799: `fs.promises.writeFile`

#### layer/themes/check_hea-architecture/children/fixer/index.ts
- Line 223: `fs.promises.writeFile`
- Line 371: `fs.promises.writeFile`

### root
Files: 9 | Violations: 17

#### layer/shared/test/fixtures.ts
- Line 22: `fs.writeFile`
- Line 410: `fs.writeFile`
- Line 445: `fs.writeFile`
- Line 454: `fs.writeFile`

#### layer/epics/llm-agent/children/src/infrastructure/session-manager.ts
- Line 129: `fs.mkdir`
- Line 228: `fs.mkdir`
- Line 231: `fs.writeFile`
- Line 240: `fs.mkdir`

#### layer/epics/lib/cli-framework/user-stories/002-cli-base-structure/examples/plugin-example.ts
- Line 202: `fs.mkdir`
- Line 218: `fs.writeFile`

#### layer/epics/infra/monitoring-dashboard/src/alerts/alert-manager.ts
- Line 205: `fs.mkdirSync`

#### gen/temp/test-portal-gui-selector-simple.ts
- Line 16: `fs.mkdir`

#### gen/temp/test-portal-gui-selector-e2e.ts
- Line 16: `fs.mkdir`
- Line 207: `fs.writeFile`

#### gen/temp/test-mobile-preview.ts
- Line 16: `fs.mkdir`

#### gen/temp/browse-gui-selector.ts
- Line 16: `fs.mkdir`

#### config/ConfigManager.ts
- Line 174: `fs.writeFileSync`
