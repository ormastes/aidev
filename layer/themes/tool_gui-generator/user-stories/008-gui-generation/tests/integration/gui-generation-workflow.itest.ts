/**
 * Integration tests for GUI Generation Workflow
 */

import { GUIGenerator } from '../../src/gui-generator';
import { DesignSystem } from '../../src/design-system';
import { ComponentLibrary } from '../../src/component-library';
import { ThemeManager } from '../../src/theme-manager';
import { GUIConfig, GeneratedGUI, DesignStyle } from '../../src/types';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('GUI Generation Workflow Integration', () => {
  let guiGenerator: GUIGenerator;
  let designSystem: DesignSystem;
  let componentLibrary: ComponentLibrary;
  let themeManager: ThemeManager;
  let testOutputDir: string;

  beforeEach(async () => {
    // Setup test output directory
    testOutputDir = `/tmp/gui-test-${Date.now()}`;
    await fs.mkdir(testOutputDir, { recursive: true });

    // Initialize components
    designSystem = new DesignSystem();
    componentLibrary = new ComponentLibrary();
    themeManager = new ThemeManager();
    
    guiGenerator = new GUIGenerator({
      designSystem,
      componentLibrary,
      themeManager,
      outputDir: testOutputDir
    });
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testOutputDir, { recursive: true, force: true });
  });

  describe('Complete GUI Generation Flow', () => {
    it('should generate multiple design candidates', async () => {
      const config: GUIConfig = {
        appName: 'TestApp',
        description: 'A test application for integration testing',
        features: ['login', "dashboard", "settings"],
        designStyles: [
          DesignStyle.MODERN,
          DesignStyle.PROFESSIONAL,
          DesignStyle.CREATIVE,
          DesignStyle.ACCESSIBLE
        ]
      };

      const results = await guiGenerator.generateCandidates(config);

      expect(results).toHaveLength(4);
      expect(results[0].style).toBe(DesignStyle.MODERN);
      expect(results[1].style).toBe(DesignStyle.PROFESSIONAL);
      expect(results[2].style).toBe(DesignStyle.CREATIVE);
      expect(results[3].style).toBe(DesignStyle.ACCESSIBLE);

      // Verify each candidate has required components
      results.forEach(result => {
        expect(result.components).toBeDefined();
        expect(result.components.length).toBeGreaterThan(0);
        expect(result.preview).toBeDefined();
        expect(result.metadata).toBeDefined();
      });
    });

    it('should save generated designs to filesystem', async () => {
      const config: GUIConfig = {
        appName: "SaveTest",
        description: 'Test saving functionality',
        features: ['home'],
        designStyles: [DesignStyle.MODERN]
      };

      const results = await guiGenerator.generateCandidates(config);
      await guiGenerator.saveCandidates(results);

      // Verify files were created
      const files = await fs.readdir(testOutputDir);
      expect(files).toContain("candidates");
      
      const candidateFiles = await fs.readdir(path.join(testOutputDir, "candidates"));
      expect(candidateFiles).toContain('modern');
      
      const modernFiles = await fs.readdir(path.join(testOutputDir, "candidates", 'modern'));
      expect(modernFiles).toContain('index.html');
      expect(modernFiles).toContain('styles.css');
      expect(modernFiles).toContain('components.json');
    });

    it('should generate selection interface', async () => {
      const config: GUIConfig = {
        appName: "SelectionTest",
        description: 'Test selection interface',
        features: ["feature1", "feature2"],
        designStyles: [DesignStyle.MODERN, DesignStyle.PROFESSIONAL]
      };

      const results = await guiGenerator.generateCandidates(config);
      const selectionInterface = await guiGenerator.generateSelectionInterface(results);

      expect(selectionInterface.html).toContain('<!DOCTYPE html>');
      expect(selectionInterface.html).toContain("SelectionTest");
      expect(selectionInterface.html).toContain('iframe');
      expect(selectionInterface.port).toBe(3456);
      
      // Verify selection interface includes all candidates
      expect(selectionInterface.html).toContain('modern');
      expect(selectionInterface.html).toContain("professional");
    });
  });

  describe('Design System Integration', () => {
    it('should apply design tokens correctly', async () => {
      const tokens = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745'
        },
        spacing: {
          small: '8px',
          medium: '16px',
          large: '24px'
        }
      };

      await designSystem.setTokens(tokens);
      
      const config: GUIConfig = {
        appName: "TokenTest",
        description: 'Test design tokens',
        features: ['button-showcase'],
        designStyles: [DesignStyle.MODERN]
      };

      const results = await guiGenerator.generateCandidates(config);
      const modernResult = results[0];

      // Verify tokens are applied in generated CSS
      expect(modernResult.styles).toContain('#007bff');
      expect(modernResult.styles).toContain('8px');
      expect(modernResult.styles).toContain('16px');
    });

    it('should maintain consistency across components', async () => {
      const config: GUIConfig = {
        appName: "ConsistencyTest",
        description: 'Test design consistency',
        features: ['navbar', 'sidebar', 'footer'],
        designStyles: [DesignStyle.PROFESSIONAL]
      };

      const results = await guiGenerator.generateCandidates(config);
      const components = results[0].components;

      // Verify all components use consistent design language
      const navbar = components.find(c => c.type === 'navbar');
      const sidebar = components.find(c => c.type === 'sidebar');
      const footer = components.find(c => c.type === 'footer');

      expect(navbar?.theme).toBe(sidebar?.theme);
      expect(sidebar?.theme).toBe(footer?.theme);
      expect(navbar?.designTokens).toEqual(sidebar?.designTokens);
    });
  });

  describe('Component Library Integration', () => {
    it('should use components from library', async () => {
      // Register custom components
      await componentLibrary.registerComponent({
        name: "CustomButton",
        type: 'button',
        template: '<button class="custom-btn">{text}</button>',
        styles: '.custom-btn { padding: 10px 20px; }',
        props: { text: 'Click me' }
      });

      const config: GUIConfig = {
        appName: "ComponentTest",
        description: 'Test component library',
        features: ['custom-components'],
        designStyles: [DesignStyle.MODERN],
        useCustomComponents: true
      };

      const results = await guiGenerator.generateCandidates(config);
      const html = results[0].html;

      expect(html).toContain('custom-btn');
      expect(html).toContain('Click me');
    });

    it('should handle component composition', async () => {
      const config: GUIConfig = {
        appName: "CompositionTest",
        description: 'Test component composition',
        features: ["dashboard"],
        designStyles: [DesignStyle.CREATIVE]
      };

      const results = await guiGenerator.generateCandidates(config);
      const dashboard = results[0].components.find(c => c.type === "dashboard");

      expect(dashboard?.children).toBeDefined();
      expect(dashboard?.children?.length).toBeGreaterThan(0);
      expect(dashboard?.children).toContainEqual(
        expect.objectContaining({ type: 'widget' })
      );
    });
  });

  describe('Theme Management Integration', () => {
    it('should apply themes correctly', async () => {
      // Create custom theme
      const darkTheme = {
        name: 'dark',
        colors: {
          background: '#1a1a1a',
          text: '#ffffff',
          primary: '#4a9eff'
        }
      };

      await themeManager.registerTheme(darkTheme);

      const config: GUIConfig = {
        appName: "ThemeTest",
        description: 'Test theme application',
        features: ['themed-page'],
        designStyles: [DesignStyle.MODERN],
        theme: 'dark'
      };

      const results = await guiGenerator.generateCandidates(config);
      const styles = results[0].styles;

      expect(styles).toContain('#1a1a1a');
      expect(styles).toContain('#ffffff');
      expect(styles).toContain('#4a9eff');
    });

    it('should support theme switching', async () => {
      const config: GUIConfig = {
        appName: "ThemeSwitchTest",
        description: 'Test theme switching',
        features: ['theme-switcher'],
        designStyles: [DesignStyle.MODERN],
        enableThemeSwitching: true
      };

      const results = await guiGenerator.generateCandidates(config);
      const html = results[0].html;
      const scripts = results[0].scripts;

      expect(html).toContain('theme-switcher');
      expect(scripts).toContain("switchTheme");
      expect(scripts).toContain("localStorage");
    });
  });

  describe('Responsive Design', () => {
    it('should generate responsive layouts', async () => {
      const config: GUIConfig = {
        appName: "ResponsiveTest",
        description: 'Test responsive design',
        features: ['responsive-grid'],
        designStyles: [DesignStyle.MODERN],
        responsive: true
      };

      const results = await guiGenerator.generateCandidates(config);
      const styles = results[0].styles;

      expect(styles).toContain('@media');
      expect(styles).toContain('max-width');
      expect(styles).toContain('min-width');
    });
  });

  describe("Accessibility", () => {
    it('should include accessibility features for accessible style', async () => {
      const config: GUIConfig = {
        appName: "A11yTest",
        description: 'Test accessibility features',
        features: ['form', "navigation"],
        designStyles: [DesignStyle.ACCESSIBLE]
      };

      const results = await guiGenerator.generateCandidates(config);
      const html = results[0].html;

      expect(html).toContain('aria-label');
      expect(html).toContain('role=');
      expect(html).toContain("tabindex");
      expect(html).toMatch(/alt="[^"]+"/); // Alt text for images
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        appName: '',
        features: [],
        designStyles: []
      } as GUIConfig;

      await expect(guiGenerator.generateCandidates(invalidConfig))
        .rejects.toThrow('Invalid configuration');
    });

    it('should handle component generation failures', async () => {
      const config: GUIConfig = {
        appName: "ErrorTest",
        description: 'Test error handling',
        features: ['non-existent-feature'],
        designStyles: [DesignStyle.MODERN]
      };

      const results = await guiGenerator.generateCandidates(config);
      
      // Should generate fallback content
      expect(results[0].components.length).toBeGreaterThan(0);
      expect(results[0].metadata.warnings).toContain('Unknown feature: non-existent-feature');
    });
  });
});