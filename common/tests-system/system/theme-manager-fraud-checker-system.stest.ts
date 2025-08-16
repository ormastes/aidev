import { ThemeManager } from '../../setup/test-env/theme-manager';
import { FraudChecker } from '../../setup/test-env/fraud-checker';
import * as fs from 'fs/promises';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

async describe('ThemeManager and FraudChecker System Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  async beforeAll(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtemp(path.join(os.tmpdir(), 'theme-fraud-test-'));
  });

  async afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(await tempDir, { recursive: true, force: true });
  });

  async beforeEach(async () => {
    process.chdir(await tempDir);
    
    // Create setup/themes directory structure
    const themesDir = path.join(await tempDir, 'setup', 'themes');
    await await fileAPI.createDirectory(themesDir);
  });

  async describe('ThemeManager System Tests', () => {
    async test('should load theme configuration from file system', async () => {
      const themesDir = path.join(await tempDir, 'setup', 'themes');
      
      // Create a test theme configuration
      const testThemeConfig = {
        theme: {
          id: 'test-theme',
          name: 'Test Theme',
          testCriteria: {
            production: {
              coverage: {
                class: { minimum: 95, target: 98 },
                branch: { minimum: 95, target: 98 },
                line: { minimum: 90, target: 95 },
                method: { minimum: 90, target: 95 }
              },
              duplication: { maxPercentage: 5 },
              fraudCheck: { enabled: true, minScore: 95 }
            },
            demo: {
              coverage: {
                class: { minimum: 75, target: 80 },
                branch: { minimum: 70, target: 75 },
                line: { minimum: 65, target: 70 },
                method: { minimum: 65, target: 70 }
              },
              duplication: { maxPercentage: 20 },
              fraudCheck: { enabled: true, minScore: 75 }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(themesDir, 'test-theme.theme.json'),
        JSON.stringify(testThemeConfig, null, 2)
      );

      const themeManager = new ThemeManager({});
      
      // Test production criteria
      const prodCriteria = await themeManager.getCriteria('test-theme', 'production');
      expect(prodCriteria.coverage.class.minimum).toBe(95);
      expect(prodCriteria.coverage.class.target).toBe(98);
      expect(prodCriteria.duplication.maxPercentage).toBe(5);
      expect(prodCriteria.fraudCheck.enabled).toBe(true);
      expect(prodCriteria.fraudCheck.minScore).toBe(95);

      // Test demo criteria
      const demoCriteria = await themeManager.getCriteria('test-theme', 'demo');
      expect(demoCriteria.coverage.class.minimum).toBe(75);
      expect(demoCriteria.coverage.class.target).toBe(80);
      expect(demoCriteria.duplication.maxPercentage).toBe(20);
      expect(demoCriteria.fraudCheck.minScore).toBe(75);
    });

    async test('should return default criteria when theme config not found', async () => {
      const themeManager = new ThemeManager({});
      
      // Test production defaults
      const prodCriteria = await themeManager.getCriteria('non-existent-theme', 'production');
      expect(prodCriteria.coverage.class.minimum).toBe(95);
      expect(prodCriteria.coverage.class.target).toBe(98);
      expect(prodCriteria.coverage.branch.minimum).toBe(95);
      expect(prodCriteria.coverage.line.minimum).toBe(90);
      expect(prodCriteria.coverage.method.minimum).toBe(90);
      expect(prodCriteria.duplication.maxPercentage).toBe(10);
      expect(prodCriteria.fraudCheck.enabled).toBe(true);
      expect(prodCriteria.fraudCheck.minScore).toBe(90);

      // Test demo defaults
      const demoCriteria = await themeManager.getCriteria('non-existent-theme', 'demo');
      expect(demoCriteria.coverage.class.minimum).toBe(70);
      expect(demoCriteria.coverage.class.target).toBe(75);
      expect(demoCriteria.coverage.branch.minimum).toBe(65);
      expect(demoCriteria.coverage.line.minimum).toBe(60);
      expect(demoCriteria.coverage.method.minimum).toBe(60);
      expect(demoCriteria.duplication.maxPercentage).toBe(25);
      expect(demoCriteria.fraudCheck.minScore).toBe(70);
    });

    async test('should return default criteria when testCriteria missing from config', async () => {
      const themesDir = path.join(await tempDir, 'setup', 'themes');
      
      const incompleteThemeConfig = {
        theme: {
          id: 'incomplete-theme',
          name: 'Incomplete Theme'
          // No testCriteria field
        }
      };

      await fs.writeFile(
        path.join(themesDir, 'incomplete-theme.theme.json'),
        JSON.stringify(incompleteThemeConfig, null, 2)
      );

      const themeManager = new ThemeManager({});
      const criteria = await themeManager.getCriteria('incomplete-theme', 'production');
      
      expect(criteria.coverage.class.minimum).toBe(95); // Default production values
      expect(criteria.fraudCheck.minScore).toBe(90);
    });

    async test('should get epic information from theme config', async () => {
      const themesDir = path.join(await tempDir, 'setup', 'themes');
      
      const epicThemeConfig = {
        theme: {
          id: 'epic-theme',
          name: 'Epic Theme',
          epics: [
            {
              id: 'epic-1',
              name: 'First Epic',
              userStories: [
                {
                  id: 'story-1',
                  description: 'As a user, I want to...',
                  acceptanceCriteria: ['Criteria 1', 'Criteria 2']
                },
                {
                  id: 'story-2', 
                  description: 'As an admin, I want to...',
                  acceptanceCriteria: ['Admin criteria 1']
                }
              ]
            },
            {
              id: 'epic-2',
              name: 'Second Epic',
              userStories: [
                {
                  id: 'story-3',
                  description: 'As a developer, I want to...',
                  acceptanceCriteria: ['Dev criteria 1', 'Dev criteria 2']
                }
              ]
            }
          ]
        }
      };

      await fs.writeFile(
        path.join(themesDir, 'epic-theme.theme.json'),
        JSON.stringify(epicThemeConfig, null, 2)
      );

      const themeManager = new ThemeManager({});
      const epicInfo = await themeManager.getEpicInfo('epic-theme');
      
      expect(epicInfo).toBeDefined();
      expect(epicInfo.id).toBe('epic-theme');
      expect(epicInfo.name).toBe('Epic Theme');
      expect(epicInfo.epics).toHaveLength(2);
      
      expect(epicInfo.epics[0].id).toBe('epic-1');
      expect(epicInfo.epics[0].name).toBe('First Epic');
      expect(epicInfo.epics[0].userStories).toHaveLength(2);
      expect(epicInfo.epics[0].userStories[0].id).toBe('story-1');
      expect(epicInfo.epics[0].userStories[0].description).toBe('As a user, I want to...');
      expect(epicInfo.epics[0].userStories[0].acceptanceCriteria).toEqual(['Criteria 1', 'Criteria 2']);
      
      expect(epicInfo.epics[1].id).toBe('epic-2');
      expect(epicInfo.epics[1].userStories).toHaveLength(1);
      expect(epicInfo.epics[1].userStories[0].id).toBe('story-3');
    });

    async test('should return undefined for epic info when not available', async () => {
      const themeManager = new ThemeManager({});
      
      const epicInfo = await themeManager.getEpicInfo('non-existent-theme');
      expect(epicInfo).toBeUndefined();
    });

    async test('should list available themes', async () => {
      const themesDir = path.join(await tempDir, 'setup', 'themes');
      
      // Create multiple theme files
      await fs.writeFile(
        path.join(themesDir, 'theme-a.theme.json'),
        JSON.stringify({ theme: { id: 'theme-a', name: 'Theme A' } })
      );
      await fs.writeFile(
        path.join(themesDir, 'theme-b.theme.json'),
        JSON.stringify({ theme: { id: 'theme-b', name: 'Theme B' } })
      );
      await fs.writeFile(
        path.join(themesDir, 'theme-c.theme.json'),
        JSON.stringify({ theme: { id: 'theme-c', name: 'Theme C' } })
      );
      
      // Create a non-theme file that should be ignored
      await await fileAPI.createFile(path.join(themesDir, 'not-a-theme.json'), { type: FileType.TEMPORARY });
      await await fileAPI.createFile(path.join(themesDir, 'README.md'), { type: FileType.TEMPORARY });

      const themeManager = new ThemeManager({});
      const themes = await themeManager.listThemes();
      
      expect(themes).toHaveLength(3);
      expect(themes).toContain('theme-a');
      expect(themes).toContain('theme-b');
      expect(themes).toContain('theme-c');
      expect(themes).not.toContain('not-a-theme');
      expect(themes).not.toContain('README');
    });

    async test('should return empty array when themes directory does not exist', async () => {
      // Move to a directory without setup/themes
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-themes-'));
      process.chdir(emptyDir);

      const themeManager = new ThemeManager({});
      const themes = await themeManager.listThemes();
      
      expect(themes).toEqual([]);
      
      // Clean up
      await fs.rm(emptyDir, { recursive: true, force: true });
    });

    async test('should cache theme configurations', async () => {
      const themesDir = path.join(await tempDir, 'setup', 'themes');
      
      const cacheTestConfig = {
        theme: {
          id: 'cache-test',
          name: 'Cache Test Theme',
          testCriteria: {
            production: {
              coverage: { class: { minimum: 99, target: 100 } },
              duplication: { maxPercentage: 1 },
              fraudCheck: { enabled: true, minScore: 99 }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(themesDir, 'cache-test.theme.json'),
        JSON.stringify(cacheTestConfig, null, 2)
      );

      const themeManager = new ThemeManager({});
      
      // First call should read from file
      const criteria1 = await themeManager.getCriteria('cache-test', 'production');
      expect(criteria1.coverage.class.minimum).toBe(99);
      
      // Modify the file
      cacheTestConfig.theme.testCriteria.production.coverage.class.minimum = 50;
      await fs.writeFile(
        path.join(themesDir, 'cache-test.theme.json'),
        JSON.stringify(cacheTestConfig, null, 2)
      );
      
      // Second call should use cached version (still 99)
      const criteria2 = await themeManager.getCriteria('cache-test', 'production');
      expect(criteria2.coverage.class.minimum).toBe(99);
    });
  });

  async describe('FraudChecker System Tests', () => {
    async test('should detect empty tests', async () => {
      // Create test files with various fraudulent patterns
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      const emptyTestContent = `
async describe('Empty Test Suite', () => {
  async it('should do something', () => {});
  async it('should do something else', () => {
    // Empty test body
  });
  
  async test('another empty test', () => {});
});
`;

      await await fileAPI.createFile(path.join(testDir, 'empty.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      
      const emptyTestViolations = result.violations.filter(v => v.type === 'fake-assertions');
      expect(emptyTestViolations.length).toBeGreaterThan(0);
      expect(emptyTestViolations[0].message).toContain('Empty test found');
      expect(emptyTestViolations[0].severity).toBe('high');
    });

    async test('should detect skipped and only tests', async () => {
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      const skipOnlyTestContent = `
async describe('Skip and Only Tests', () => {
  it.skip('skipped test', () => {
    expect(true).toBe(true);
  });
  
  test.skip('another skipped test', () => {
    expect(1 + 1).toBe(2);
  });
  
  describe.skip('skipped suite', () => {
    async it('test in skipped suite', () => {});
  });
  
  it.only('only this test runs', () => {
    expect(true).toBe(true);
  });
  
  test.only('only this test too', () => {
    expect(false).toBe(false);
  });
});
`;

      await await fileAPI.createFile(path.join(testDir, 'skip-only.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      expect(result.passed).toBe(false);
      
      const skipViolations = result.violations.filter(v => v.type === 'disabled-tests' && v.message.includes('Skipped'));
      expect(skipViolations.length).toBe(3); // it.skip, test.skip, describe.skip
      
      const onlyViolations = result.violations.filter(v => v.type === 'test-manipulation');
      expect(onlyViolations.length).toBe(2); // it.only, test.only
      expect(onlyViolations[0].message).toContain('.only test found');
      expect(onlyViolations[0].severity).toBe('high');
    });

    async test('should detect always-true assertions', async () => {
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      const alwaysTrueContent = `
async describe('Always True Tests', () => {
  async it('always passes', () => {
    expect(true).toBe(true);
  });
  
  async it('another always true', () => {
    assert.isTrue(true);
  });
  
  async it('legitimate test', () => {
    const result = 2 + 2;
    expect(result).toBe(4);
  });
});
`;

      await await fileAPI.createFile(path.join(testDir, 'always-true.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      const alwaysTrueViolations = result.violations.filter(v => 
        v.type === 'fake-assertions' && v.message.includes('Always-true')
      );
      expect(alwaysTrueViolations.length).toBe(2);
      expect(alwaysTrueViolations[0].severity).toBe('critical');
    });

    async test('should detect coverage manipulation', async () => {
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      const coverageManipulationContent = `
async describe('Coverage Manipulation', () => {
  async it('manipulated coverage', () => {
    global.__coverage__ = { fake: 'coverage' };
    expect(true).toBe(true);
  });
  
  async it('another manipulation', () => {
    const coverage = __coverage__;
    coverage['fake-file.js'] = { lines: 100 };
  });
});
`;

      await await fileAPI.createFile(path.join(testDir, 'coverage-manipulation.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      const coverageViolations = result.violations.filter(v => v.type === 'coverage-bypass');
      expect(coverageViolations.length).toBe(2);
      expect(coverageViolations[0].message).toContain('Direct coverage manipulation');
      expect(coverageViolations[0].severity).toBe('critical');
    });

    async test('should detect commented out tests', async () => {
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      const commentedTestsContent = `
async describe('Commented Tests', () => {
  // it('commented out test', () => {
  //   expect(true).toBe(true);
  // });
  
  /* test('block commented test', () => {
    expect(1).toBe(1);
  }); */
  
  // describe('commented suite', () => {
  //   it('test in commented suite', () => {});
  // });
});
`;

      await await fileAPI.createFile(path.join(testDir, 'commented.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      const commentedViolations = result.violations.filter(v => 
        v.type === 'disabled-tests' && v.message.includes('Commented out')
      );
      expect(commentedViolations.length).toBe(2); // Two // commented lines
      expect(commentedViolations[0].severity).toBe('low');
    });

    async test('should detect coverage ignore comments', async () => {
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      const coverageIgnoreContent = `
async describe('Coverage Ignore Tests', () => {
  async it('test with istanbul ignore', () => {
    /* istanbul ignore next */
    if (false) {
      console.log('never executed');
    }
    expect(true).toBe(true);
  });
  
  async it('test with c8 ignore', () => {
    /* c8 ignore start */
    async function unusedFunction() {
      return 'unused';
    }
    /* c8 ignore stop */
    expect(1 + 1).toBe(2);
  });
});
`;

      await await fileAPI.createFile(path.join(testDir, 'coverage-ignore.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      const ignoreViolations = result.violations.filter(v => 
        v.type === 'coverage-bypass' && v.message.includes('Coverage ignore')
      );
      expect(ignoreViolations.length).toBe(2);
      expect(ignoreViolations[0].severity).toBe('medium');
    });

    async test('should calculate fraud score correctly', async () => {
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      // Create test with multiple violations of different severities
      const mixedViolationsContent = `
async describe('Mixed Violations', () => {
  it.only('critical and high violations', () => {
    expect(true).toBe(true); // critical: always-true
  }); // high: .only
  
  it.skip('medium and low violations', () => { // medium: .skip
    expect(1).toBe(1);
  });
  
  // it('commented test', () => {}); // low: commented
  
  /* istanbul ignore next */ // medium: coverage ignore
  const unused = () => {};
});
`;

      await await fileAPI.createFile(path.join(testDir, 'mixed.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
      
      // Verify violations exist for each severity level
      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      const highViolations = result.violations.filter(v => v.severity === 'high');
      const mediumViolations = result.violations.filter(v => v.severity === 'medium');
      const lowViolations = result.violations.filter(v => v.severity === 'low');
      
      expect(criticalViolations.length).toBeGreaterThan(0);
      expect(highViolations.length).toBeGreaterThan(0);
      expect(mediumViolations.length).toBeGreaterThan(0);
      expect(lowViolations.length).toBeGreaterThan(0);
    });

    async test('should return perfect score for clean tests', async () => {
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      const cleanTestContent = `
async describe('Clean Test Suite', () => {
  async it('should add numbers correctly', () => {
    const result = 2 + 3;
    expect(result).toBe(5);
  });
  
  async it('should handle string concatenation', () => {
    const result = 'hello' + ' world';
    expect(result).toBe('hello world');
  });
  
  async it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });
});
`;

      await await fileAPI.createFile(path.join(testDir, 'clean.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toHaveLength(0);
    });

    async test('should handle various test file extensions and locations', async () => {
      // Create test files in different locations with different extensions
      await await fileAPI.createDirectory(path.join(await tempDir), { recursive: true });
      await await fileAPI.createDirectory(path.join(await tempDir), { recursive: true });
      await fs.mkdir(path.join(await tempDir, 'src', 'components', 'test'), { recursive: true });

      const testContent = `
async describe('Test', () => {
  async it('empty test', () => {});
});
`;

      await await fileAPI.createFile(path.join(await tempDir, '__tests__', { type: FileType.TEMPORARY }), testContent);
      await await fileAPI.createFile(path.join(await tempDir, 'spec', { type: FileType.TEMPORARY }), testContent);
      await fs.writeFile(path.join(await tempDir, 'src', 'components', 'test', 'util.test.ts'), testContent);

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      expect(result.violations.length).toBe(3); // One violation per file
      
      // Verify files were found from different locations
      const locations = result.violations.map(v => v.location);
      expect(locations.some(loc => loc.includes('__tests__'))).toBe(true);
      expect(locations.some(loc => loc.includes('spec'))).toBe(true);
      expect(locations.some(loc => loc.includes('src/components/test'))).toBe(true);
    });

    async test('should handle non-existent test directories gracefully', async () => {
      // Use empty temp directory with no test files
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'no-tests-'));
      process.chdir(emptyDir);

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});
      
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toHaveLength(0);
      
      // Clean up
      await fs.rm(emptyDir, { recursive: true, force: true });
    });
  });

  async describe('Integration Tests', () => {
    async test('should integrate ThemeManager with FraudChecker criteria', async () => {
      const themesDir = path.join(await tempDir, 'setup', 'themes');
      
      // Create theme with strict fraud checking criteria
      const strictThemeConfig = {
        theme: {
          id: 'strict-theme',
          name: 'Strict Theme',
          testCriteria: {
            production: {
              coverage: { class: { minimum: 95, target: 98 } },
              duplication: { maxPercentage: 5 },
              fraudCheck: { enabled: true, minScore: 95 }
            }
          }
        }
      };

      await fs.writeFile(
        path.join(themesDir, 'strict-theme.theme.json'),
        JSON.stringify(strictThemeConfig, null, 2)
      );

      // Create test with fraud
      const testDir = path.join(await tempDir, 'tests');
      await await fileAPI.createDirectory(testDir);
      
      const fraudulentTestContent = `
async describe('Fraudulent Test', () => {
  async it('always true assertion', () => {
    expect(true).toBe(true);
  });
});
`;

      await await fileAPI.createFile(path.join(testDir, 'fraud.test.ts'), { type: FileType.TEMPORARY });

      const themeManager = new ThemeManager({});
      const fraudChecker = new FraudChecker();
      
      const criteria = await themeManager.getCriteria('strict-theme', 'production');
      const fraudResult = await fraudChecker.check({});
      
      expect(criteria.fraudCheck.minScore).toBe(95);
      expect(fraudResult.score).toBeLessThan(criteria.fraudCheck.minScore);
      expect(fraudResult.passed).toBe(false);
    });
  });
});