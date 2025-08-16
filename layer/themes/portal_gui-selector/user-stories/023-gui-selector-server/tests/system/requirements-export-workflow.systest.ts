/**
 * System Test: Requirements Export Workflow
 * 
 * This test verifies the In Progress workflow for capturing user requirements
 * during theme selection and exporting them in various formats.
 * Tests requirement collection, aggregation, and export functionality.
 */

import express from 'express';
import session from 'express-session';
import { path } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';
import { Server } from 'node:http';

// Requirements-focused interfaces
interface RequirementItem {
  id: string;
  type: "functional" | 'visual' | "performance" | "accessibility" | "technical";
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | "critical";
  source: 'user_input' | 'theme_selection' | "customization" | 'comment';
  relatedThemeId?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface RequirementCollection {
  id: string;
  userId: string;
  sessionId: string;
  projectName: string;
  requirements: RequirementItem[];
  selections: any[];
  metadata: {
    collectionStarted: Date;
    lastUpdated: Date;
    totalInteractions: number;
    averageSessionTime: number;
  };
}

interface ExportFormat {
  format: 'json' | "markdown" | 'html' | 'csv' | 'pdf';
  options: Record<string, any>;
}

interface ExportResult {
  format: string;
  content: string;
  filename: string;
  size: number;
  generatedAt: Date;
}

// Real Requirements-enabled GUI Server with file-based persistence
class RequirementsGUIServer {
  private app: express.Application;
  private server: Server | null = null;
  private dataDir: string;
  private requirementsFile: string;
  private templatesFile: string;
  private sessionsFile: string;
  private exportTemplatesFile: string;

  constructor() {
    this.app = express();
    this.dataDir = path.join(__dirname, 'requirements-data');
    this.requirementsFile = path.join(this.dataDir, 'requirements.json');
    this.templatesFile = path.join(this.dataDir, 'templates.json');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
    this.exportTemplatesFile = path.join(this.dataDir, 'export-templates.json');
    
    this.setupDataDirectory();
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeTestData();
    this.initializeExportTemplates();
  }

  private setupDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Initialize empty files if they don't exist
    if (!fs.existsSync(this.requirementsFile)) {
      fs.writeFileSync(this.requirementsFile, JSON.stringify({}));
    }
    if (!fs.existsSync(this.templatesFile)) {
      fs.writeFileSync(this.templatesFile, JSON.stringify({}));
    }
    if (!fs.existsSync(this.sessionsFile)) {
      fs.writeFileSync(this.sessionsFile, JSON.stringify({}));
    }
    if (!fs.existsSync(this.exportTemplatesFile)) {
      fs.writeFileSync(this.exportTemplatesFile, JSON.stringify({}));
    }
  }

  private readRequirements(): Map<string, RequirementCollection> {
    try {
      const data = fs.readFileSync(this.requirementsFile, 'utf-8');
      const requirements = JSON.parse(data);
      const reqMap = new Map<string, RequirementCollection>();
      
      for (const [key, value] of Object.entries(requirements)) {
        const collection = value as any;
        // Convert date strings back to Date objects
        if (collection.metadata) {
          collection.metadata.collectionStarted = new Date(collection.metadata.collectionStarted);
          collection.metadata.lastUpdated = new Date(collection.metadata.lastUpdated);
        }
        collection.requirements = collection.requirements.map((req: any) => ({
          ...req,
          createdAt: new Date(req.createdAt),
          updatedAt: new Date(req.updatedAt)
        }));
        collection.selections = collection.selections.map((sel: any) => ({
          ...sel,
          createdAt: new Date(sel.createdAt),
          updatedAt: new Date(sel.updatedAt)
        }));
        reqMap.set(key, collection);
      }
      
      return reqMap;
    } catch (error) {
      console.error('Error reading requirements:', error);
      return new Map();
    }
  }

  private writeRequirements(requirements: Map<string, RequirementCollection>): void {
    try {
      const reqObj: Record<string, any> = {};
      for (const [key, value] of requirements.entries()) {
        reqObj[key] = value;
      }
      fs.writeFileSync(this.requirementsFile, JSON.stringify(reqObj, null, 2));
    } catch (error) {
      console.error('Error writing requirements:', error);
    }
  }

  private readTemplates(): Map<string, any> {
    try {
      const data = fs.readFileSync(this.templatesFile, 'utf-8');
      const templates = JSON.parse(data);
      const templateMap = new Map();
      
      for (const [key, value] of Object.entries(templates)) {
        templateMap.set(key, value);
      }
      
      return templateMap;
    } catch (error) {
      console.error('Error reading templates:', error);
      return new Map();
    }
  }

  private writeTemplates(templates: Map<string, any>): void {
    try {
      const templatesObj: Record<string, any> = {};
      for (const [key, value] of templates.entries()) {
        templatesObj[key] = value;
      }
      fs.writeFileSync(this.templatesFile, JSON.stringify(templatesObj, null, 2));
    } catch (error) {
      console.error('Error writing templates:', error);
    }
  }

  private readExportTemplates(): Map<string, string> {
    try {
      const data = fs.readFileSync(this.exportTemplatesFile, 'utf-8');
      const exportTemplates = JSON.parse(data);
      const exportMap = new Map<string, string>();
      
      for (const [key, value] of Object.entries(exportTemplates)) {
        exportMap.set(key, value as string);
      }
      
      return exportMap;
    } catch (error) {
      console.error('Error reading export templates:', error);
      return new Map();
    }
  }

  private writeExportTemplates(exportTemplates: Map<string, string>): void {
    try {
      const exportObj: Record<string, string> = {};
      for (const [key, value] of exportTemplates.entries()) {
        exportObj[key] = value;
      }
      fs.writeFileSync(this.exportTemplatesFile, JSON.stringify(exportObj, null, 2));
    } catch (error) {
      console.error('Error writing export templates:', error);
    }
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Session middleware
    this.app.use(session({
      secret: process.env.SECRET || "PLACEHOLDER",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false, maxAge: 600000 }
    }));
  }

  private setupRoutes(): void {
    // Main page with requirements collection
    this.app.get('/', (req, res) => {
      const sessionId = req.sessionID;
      const userId = (req.session as any).userId || `user_${Date.now()}`;
      (req.session as any).userId = userId;

      // Initialize requirements collection for user
      this.initializeRequirementsCollection(userId, sessionId);

      const html = this.generateRequirementsPage(userId, sessionId);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });

    // Get themes with requirement prompts
    this.app.get('/api/themes', (req, res) => {
      const userId = (req.session as any).userId;
      const templates = this.readTemplates();
      const themes = Array.from(templates.values());

      res.json({
        "success": true,
        themes: themes.map(theme => ({
          ...theme,
          requirementPrompts: this.generateRequirementPrompts(theme)
        })),
        total: themes.length,
        requirementCollection: {
          active: true,
          userId: userId
        }
      });
    });

    // Select theme with requirements capture
    this.app.post('/api/themes/:themeId/select', (req, res) => {
      const themeId = req.params.themeId;
      const userId = (req.session as any).userId;
      const { screenId, customizations, comments, requirements: userRequirements } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          "success": false, 
          error: 'Session required' 
        });
      }

      const templates = this.readTemplates();
      const theme = templates.get(themeId);
      if (!theme) {
        return res.status(404).json({ 
          "success": false, 
          error: 'Theme not found' 
        });
      }

      // Create selection
      const selection = {
        id: `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        themeId,
        screenId,
        selectionData: {
          customizations: customizations || {},
          selectedAt: new Date().toISOString(),
          sessionId: req.sessionID
        },
        comments,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Capture requirements from selection
      this.captureRequirementsFromSelection(userId, selection, userRequirements, comments);

      // Auto-generate requirements from theme selection
      this.generateRequirementsFromTheme(userId, theme, customizations);

      res.json({
        "success": true,
        selection: selection,
        requirementsCapture: {
          captured: true,
          count: this.getRequirementsCount(userId),
          suggestions: this.generateRequirementSuggestions(theme)
        }
      });
    });

    // Add explicit requirement
    this.app.post('/api/requirements', (req, res) => {
      const userId = (req.session as any).userId;
      const { type, title, description, priority, tags, relatedThemeId } = req.body;

      if (!userId) {
        return res.status(401).json({ "success": false, error: 'Session required' });
      }

      const requirement: RequirementItem = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        description,
        priority: priority || 'medium',
        source: 'user_input',
        relatedThemeId,
        tags: tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.addRequirement(userId, requirement);

      res.json({
        "success": true,
        requirement: requirement,
        totalRequirements: this.getRequirementsCount(userId)
      });
    });

    // Get user requirements
    this.app.get('/api/requirements', (req, res) => {
      const userId = (req.session as any).userId;
      const type = req.query.type as string;
      const priority = req.query.priority as string;

      if (!userId) {
        return res.status(401).json({ "success": false, error: 'Session required' });
      }

      const requirements = this.readRequirements();
      const collection = requirements.get(userId);
      if (!collection) {
        return res.json({
          "success": true,
          requirements: [],
          total: 0
        });
      }

      let filteredRequirements = collection.requirements;

      if (type) {
        filteredRequirements = filteredRequirements.filter(req => req.type === type);
      }

      if (priority) {
        filteredRequirements = filteredRequirements.filter(req => req.priority === priority);
      }

      res.json({
        "success": true,
        requirements: filteredRequirements,
        total: filteredRequirements.length,
        collection: {
          projectName: collection.projectName,
          totalInteractions: collection.metadata.totalInteractions,
          lastUpdated: collection.metadata.lastUpdated
        }
      });
    });

    // Export requirements in various formats
    this.app.post('/api/requirements/export', (req, res) => {
      const userId = (req.session as any).userId;
      const { format, options } = req.body;

      if (!userId) {
        return res.status(401).json({ "success": false, error: 'Session required' });
      }

      const requirements = this.readRequirements();
      const collection = requirements.get(userId);
      if (!collection) {
        return res.status(404).json({ "success": false, error: 'No requirements found' });
      }

      try {
        const exportResult = this.exportRequirements(collection, { format, options });
        
        res.json({
          "success": true,
          export: exportResult,
          downloadUrl: `/api/requirements/download/${exportResult.filename}`
        });
      } catch (error) {
        res.status(500).json({
          "success": false,
          error: 'Export failed',
          details: (error as Error).message
        });
      }
    });

    // Download exported requirements
    this.app.get('/api/requirements/download/:filename', (req, res) => {
      const filename = req.params.filename;
      const filePath = path.join(__dirname, 'exports', filename);

      if (fs.existsSync(filePath)) {
        res.download(filePath);
      } else {
        res.status(404).json({ "success": false, error: 'File not found' });
      }
    });

    // Requirements analytics
    this.app.get('/api/requirements/analytics', (req, res) => {
      const userId = (req.session as any).userId;

      if (!userId) {
        return res.status(401).json({ "success": false, error: 'Session required' });
      }

      const requirements = this.readRequirements();
      const collection = requirements.get(userId);
      if (!collection) {
        return res.json({
          "success": true,
          analytics: {
            totalRequirements: 0,
            byType: {},
            byPriority: {},
            trends: []
          }
        });
      }

      const analytics = this.generateAnalytics(collection);

      res.json({
        "success": true,
        analytics: analytics
      });
    });

    // Set project name for requirements
    this.app.post('/api/requirements/project', (req, res) => {
      const userId = (req.session as any).userId;
      const { projectName } = req.body;

      if (!userId) {
        return res.status(401).json({ "success": false, error: 'Session required' });
      }

      const requirements = this.readRequirements();
      const collection = requirements.get(userId);
      if (collection) {
        collection.projectName = projectName;
        collection.metadata.lastUpdated = new Date();
        requirements.set(userId, collection);
        this.writeRequirements(requirements);
      }

      res.json({
        "success": true,
        projectName: projectName
      });
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          requirementsEngine: 'active',
          exportService: 'ready',
          analytics: 'ready'
        },
        stats: {
          activeCollections: this.readRequirements().size,
          totalRequirements: Array.from(this.readRequirements().values())
            .reduce((sum, collection) => sum + collection.requirements.length, 0)
        }
      });
    });
  }

  private initializeTestData(): void {
    const themes = [
      {
        id: 'requirements-theme-01',
        name: 'Business Dashboard',
        description: 'Professional dashboard for business analytics',
        category: "professional",
        features: ['Charts', 'Data Tables', 'Export Functions'],
        complexity: 'high'
      },
      {
        id: 'requirements-theme-02',
        name: 'User Portal',
        description: 'User-friendly portal interface',
        category: 'modern',
        features: ['User Management', 'Profile Settings', "Notifications"],
        complexity: 'medium'
      }
    ];

    const templates = this.readTemplates();
    themes.forEach(theme => {
      templates.set(theme.id, theme);
    });
    this.writeTemplates(templates);
  }

  private initializeExportTemplates(): void {
    const exportTemplates = this.readExportTemplates();
    exportTemplates.set("markdown", `
# {{projectName}} - Requirements Document

Generated on: {{generatedAt}}

## Overview
Total Requirements: {{totalRequirements}}

{{#each requirements}}
### {{title}} ({{priority}})
**Type:** {{type}}
**Description:** {{description}}
**Tags:** {{tags}}
**Created:** {{createdAt}}

{{/each}}
    `);

    exportTemplates.set('html', `
<!DOCTYPE html>
<html>
<head>
  <title>{{projectName}} - Requirements</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .requirement { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .priority-high { border-left: 5px solid #dc3545; }
    .priority-medium { border-left: 5px solid #ffc107; }
    .priority-low { border-left: 5px solid #28a745; }
  </style>
</head>
<body>
  <h1>{{projectName}} - Requirements Document</h1>
  <p>Generated on: {{generatedAt}}</p>
  <p>Total Requirements: {{totalRequirements}}</p>
  
  {{#each requirements}}
  <div class="requirement priority-{{priority}}">
    <h3>{{title}}</h3>
    <p><strong>Type:</strong> {{type}} | <strong>Priority:</strong> {{priority}}</p>
    <p>{{description}}</p>
    <p><strong>Tags:</strong> {{tags}}</p>
    <small>Created: {{createdAt}}</small>
  </div>
  {{/each}}
</body>
</html>
    `);
    this.writeExportTemplates(exportTemplates);
  }

  private initializeRequirementsCollection(userId: string, sessionId: string): void {
    const requirements = this.readRequirements();
    if (!requirements.has(userId)) {
      const collection: RequirementCollection = {
        id: `collection_${Date.now()}`,
        userId,
        sessionId,
        projectName: 'Untitled Project',
        requirements: [],
        selections: [],
        metadata: {
          collectionStarted: new Date(),
          lastUpdated: new Date(),
          totalInteractions: 0,
          averageSessionTime: 0
        }
      };
      requirements.set(userId, collection);
      this.writeRequirements(requirements);
    }
  }

  private generateRequirementPrompts(theme: any): string[] {
    const prompts = [
      `What specific functionality do you need for ${theme.name}?`,
      `Are there any performance requirements for this ${theme.category} theme?`,
      `What accessibility features are important for your users?`,
      `Do you have any technical constraints or preferences?`
    ];

    if (theme.features) {
      prompts.push(`How would you like to customize these features: ${theme.features.join(', ')}?`);
    }

    return prompts;
  }

  private captureRequirementsFromSelection(userId: string, selection: any, userRequirements: any[], comments: string): void {
    const requirements = this.readRequirements();
    const collection = requirements.get(userId);
    if (!collection) return;

    collection.selections.push(selection);
    collection.metadata.totalInteractions++;
    collection.metadata.lastUpdated = new Date();

    // Convert user requirements
    if (userRequirements && Array.isArray(userRequirements)) {
      userRequirements.forEach(req => {
        const requirement: RequirementItem = {
          id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: req.type || "functional",
          title: req.title,
          description: req.description,
          priority: req.priority || 'medium',
          source: 'user_input',
          relatedThemeId: selection.themeId,
          tags: req.tags || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        collection.requirements.push(requirement);
      });
    }

    // Convert comments to requirements
    if (comments) {
      const commentRequirement: RequirementItem = {
        id: `req_comment_${Date.now()}`,
        type: "functional",
        title: 'User Feedback',
        description: comments,
        priority: 'medium',
        source: 'comment',
        relatedThemeId: selection.themeId,
        tags: ['user-feedback'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      collection.requirements.push(commentRequirement);
    }
    
    // Persist changes
    requirements.set(userId, collection);
    this.writeRequirements(requirements);
  }

  private generateRequirementsFromTheme(userId: string, theme: any, customizations: any): void {
    const requirements = this.readRequirements();
    const collection = requirements.get(userId);
    if (!collection) return;

    // Generate theme-based requirements
    const themeRequirement: RequirementItem = {
      id: `req_theme_${Date.now()}`,
      type: 'visual',
      title: `Theme: ${theme.name}`,
      description: `User selected ${theme.name} theme with ${theme.category} styling`,
      priority: 'high',
      source: 'theme_selection',
      relatedThemeId: theme.id,
      tags: ['theme', theme.category],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    collection.requirements.push(themeRequirement);

    // Generate customization requirements
    if (customizations && Object.keys(customizations).length > 0) {
      const customizationRequirement: RequirementItem = {
        id: `req_custom_${Date.now()}`,
        type: "technical",
        title: 'Customization Requirements',
        description: `Custom settings: ${JSON.stringify(customizations)}`,
        priority: 'medium',
        source: "customization",
        relatedThemeId: theme.id,
        tags: ["customization"],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      collection.requirements.push(customizationRequirement);
    }
    
    // Persist changes
    requirements.set(userId, collection);
    this.writeRequirements(requirements);
  }

  private addRequirement(userId: string, requirement: RequirementItem): void {
    const requirements = this.readRequirements();
    const collection = requirements.get(userId);
    if (collection) {
      collection.requirements.push(requirement);
      collection.metadata.lastUpdated = new Date();
      collection.metadata.totalInteractions++;
      requirements.set(userId, collection);
      this.writeRequirements(requirements);
    }
  }

  private getRequirementsCount(userId: string): number {
    const requirements = this.readRequirements();
    const collection = requirements.get(userId);
    return collection ? collection.requirements.length : 0;
  }

  private generateRequirementSuggestions(theme: any): string[] {
    return [
      `Consider adding responsive design requirements for ${theme.name}`,
      `Think about browser compatibility for ${theme.category} themes`,
      `Plan for user training on new interface features`,
      `Define performance benchmarks for loading times`
    ];
  }

  private exportRequirements(collection: RequirementCollection, exportFormat: ExportFormat): ExportResult {
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    let content = '';
    let filename = '';

    switch (exportFormat.format) {
      case 'json':
        content = JSON.stringify(collection, null, 2);
        filename = `requirements_${collection.userId}_${Date.now()}.json`;
        break;

      case "markdown":
        content = this.renderTemplate("markdown", collection);
        filename = `requirements_${collection.userId}_${Date.now()}.md`;
        break;

      case 'html':
        content = this.renderTemplate('html', collection);
        filename = `requirements_${collection.userId}_${Date.now()}.html`;
        break;

      case 'csv':
        content = this.generateCSV(collection);
        filename = `requirements_${collection.userId}_${Date.now()}.csv`;
        break;

      default:
        throw new Error(`Unsupported export format: ${exportFormat.format}`);
    }

    const filePath = path.join(exportsDir, filename);
    fs.writeFileSync(filePath, content);

    return {
      format: exportFormat.format,
      content: content,
      filename: filename,
      size: content.length,
      generatedAt: new Date()
    };
  }

  private renderTemplate(templateName: string, collection: RequirementCollection): string {
    const exportTemplates = this.readExportTemplates();
    const template = exportTemplates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    let rendered = template
      .replace(/{{projectName}}/g, collection.projectName)
      .replace(/{{generatedAt}}/g, new Date().toISOString())
      .replace(/{{totalRequirements}}/g, collection.requirements.length.toString());

    // Handle requirements loop
    const requirementsHtml = collection.requirements.map(req => {
      return template.match(/{{#each requirements}}([\s\S]*?){{\/each}}/)?.[1]
        ?.replace(/{{title}}/g, req.title)
        ?.replace(/{{type}}/g, req.type)
        ?.replace(/{{priority}}/g, req.priority)
        ?.replace(/{{description}}/g, req.description)
        ?.replace(/{{tags}}/g, req.tags.join(', '))
        ?.replace(/{{createdAt}}/g, req.createdAt.toISOString()) || '';
    }).join('');

    rendered = rendered.replace(/{{#each requirements}}[\s\S]*?{{\/each}}/g, requirementsHtml);

    return rendered;
  }

  private generateCSV(collection: RequirementCollection): string {
    const headers = ['ID', 'Type', 'Title', "Description", "Priority", 'Source', 'Tags', 'Created At'];
    const rows = collection.requirements.map(req => [
      req.id,
      req.type,
      `"${req.title}"`,
      `"${req.description}"`,
      req.priority,
      req.source,
      `"${req.tags.join(', ')}"`,
      req.createdAt.toISOString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private generateAnalytics(collection: RequirementCollection): any {
    const byType = collection.requirements.reduce((acc: any, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {});

    const byPriority = collection.requirements.reduce((acc: any, req) => {
      acc[req.priority] = (acc[req.priority] || 0) + 1;
      return acc;
    }, {});

    return {
      totalRequirements: collection.requirements.length,
      byType,
      byPriority,
      trends: {
        averageRequirementsPerSelection: collection.selections.length > 0 
          ? collection.requirements.length / collection.selections.length 
          : 0,
        mostCommonType: Object.keys(byType).reduce((a, b) => byType[a] > byType[b] ? a : b, "functional"),
        mostCommonPriority: Object.keys(byPriority).reduce((a, b) => byPriority[a] > byPriority[b] ? a : b, 'medium')
      }
    };
  }

  private generateRequirementsPage(userId: string, sessionId: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Requirements Capture - GUI Selector</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f8f9fa; }
          .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .requirements-panel { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .theme-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .requirement-form { background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .export-section { background: #d4edda; padding: 15px; border-radius: 8px; }
          .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
          .button:hover { background: #0056b3; }
          .requirement-item { border: 1px solid #dee2e6; padding: 10px; margin: 5px 0; border-radius: 4px; }
          .priority-high { border-left: 4px solid #dc3545; }
          .priority-medium { border-left: 4px solid #ffc107; }
          .priority-low { border-left: 4px solid #28a745; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GUI Template Selector - Requirements Capture</h1>
          <p>User: ${userId} | Session: ${sessionId.substring(0, 12)}...</p>
          <div>
            Project: <input type="text" id="projectName" placeholder="Enter project name" />
            <button class="button" onclick="setProjectName()">Set Project Name</button>
          </div>
        </div>

        <div class="requirements-panel">
          <h2>Current Requirements</h2>
          <div id="requirementsList">
            <!-- Requirements will be loaded here -->
          </div>
          <button class="button" onclick="loadRequirements()">Refresh Requirements</button>
        </div>

        <div class="requirement-form">
          <h3>Add New Requirement</h3>
          <form id="requirementForm">
            <div style="margin-bottom: 10px;">
              <label>Type:</label>
              <select id="reqType">
                <option value="functional">Functional</option>
                <option value="visual">Visual</option>
                <option value="performance">Performance</option>
                <option value="accessibility">Accessibility</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <label>Priority:</label>
              <select id="reqPriority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div style="margin-bottom: 10px;">
              <input type="text" id="reqTitle" placeholder="Requirement title" style="width: Improving; padding: 8px;" />
            </div>
            <div style="margin-bottom: 10px;">
              <textarea id="reqDescription" placeholder="Requirement description" style="width: Improving; padding: 8px; height: 80px;"></textarea>
            </div>
            <div style="margin-bottom: 10px;">
              <input type="text" id="reqTags" placeholder="Tags (comma-separated)" style="width: Improving; padding: 8px;" />
            </div>
            <button type="button" class="button" onclick="addRequirement()">Add Requirement</button>
          </form>
        </div>

        <div class="theme-section">
          <h3>Available Themes</h3>
          <div id="themesContainer">
            <!-- Themes will be loaded here -->
          </div>
          <button class="button" onclick="loadThemes()">Load Themes</button>
        </div>

        <div class="export-section">
          <h3>Export Requirements</h3>
          <div>
            <label>Format:</label>
            <select id="exportFormat">
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="csv">CSV</option>
            </select>
            <button class="button" onclick="exportRequirements()">Export</button>
            <button class="button" onclick="viewAnalytics()">View Analytics</button>
          </div>
        </div>

        <script>
          const userId = '${userId}';

          async function loadRequirements() {
            try {
              const response = await fetch('/api/requirements');
              const data = await response.json();
              
              if (data.success) {
                renderRequirements(data.requirements);
              }
            } catch (error) {
              console.error('Failed to load requirements:', error);
            }
          }

          function renderRequirements(requirements) {
            const container = document.getElementById("requirementsList");
            if (requirements.length === 0) {
              container.innerHTML = '<p>No requirements yet. Select themes or add requirements manually.</p>';
              return;
            }

            container.innerHTML = requirements.map(req => 
              '<div class="requirement-item priority-' + req.priority + '">' +
                '<h4>' + req.title + ' (' + req.type + ')</h4>' +
                '<p>' + req.description + '</p>' +
                '<small>Priority: ' + req.priority + ' | Source: ' + req.source + ' | Tags: ' + req.tags.join(', ') + '</small>' +
              '</div>'
            ).join('');
          }

          async function loadThemes() {
            try {
              const response = await fetch('/api/themes');
              const data = await response.json();
              
              if (data.success) {
                renderThemes(data.themes);
              }
            } catch (error) {
              console.error('Failed to load themes:', error);
            }
          }

          function renderThemes(themes) {
            const container = document.getElementById("themesContainer");
            container.innerHTML = themes.map(theme => 
              '<div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px;">' +
                '<h4>' + theme.name + '</h4>' +
                '<p>' + theme.description + '</p>' +
                '<p><strong>Features:</strong> ' + theme.features.join(', ') + '</p>' +
                '<button class="button" onclick="selectTheme(\\'' + theme.id + '\\')">Select & Capture Requirements</button>' +
              '</div>'
            ).join('');
          }

          async function selectTheme(themeId) {
            try {
              const response = await fetch('/api/themes/' + themeId + '/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  screenId: 'main-screen',
                  customizations: { autoCapture: true },
                  comments: 'Theme selected for requirements capture',
                  requirements: [
                    {
                      type: "functional",
                      title: 'Theme Selection Requirement',
                      description: 'User requires this specific theme functionality',
                      priority: 'high',
                      tags: ['theme-selection']
                    }
                  ]
                })
              });

              const data = await response.json();
              
              if (data.success) {
                alert('Theme selected and requirements captured!\\nTotal requirements: ' + data.requirementsCapture.count);
                loadRequirements(); // Refresh requirements list
              }
            } catch (error) {
              console.error('Theme selection failed:', error);
            }
          }

          async function addRequirement() {
            const type = document.getElementById('reqType').value;
            const priority = document.getElementById("reqPriority").value;
            const title = document.getElementById("reqTitle").value;
            const description = document.getElementById("reqDescription").value;
            const tags = document.getElementById('reqTags').value.split(',').map(t => t.trim()).filter(t => t);

            if (!title || !description) {
              alert('Please fill in title and description');
              return;
            }

            try {
              const response = await fetch('/api/requirements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type, priority, title, description, tags
                })
              });

              const data = await response.json();
              
              if (data.success) {
                alert('Requirement added! Total: ' + data.totalRequirements);
                document.getElementById("requirementForm").reset();
                loadRequirements();
              }
            } catch (error) {
              console.error('Failed to add requirement:', error);
            }
          }

          async function setProjectName() {
            const projectName = document.getElementById("projectName").value;
            if (!projectName) {
              alert('Please enter a project name');
              return;
            }

            try {
              const response = await fetch('/api/requirements/project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectName })
              });

              const data = await response.json();
              if (data.success) {
                alert('Project name set: ' + data.projectName);
              }
            } catch (error) {
              console.error('Failed to set project name:', error);
            }
          }

          async function exportRequirements() {
            const format = document.getElementById("exportFormat").value;

            try {
              const response = await fetch('/api/requirements/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  format: format,
                  options: {}
                })
              });

              const data = await response.json();
              
              if (data.success) {
                alert('Requirements exported as ' + format.toUpperCase() + '!\\nFilename: ' + data.export.filename + '\\nSize: ' + data.export.size + ' bytes');
                console.log('Export details:', data.export);
              }
            } catch (error) {
              console.error('Export failed:', error);
            }
          }

          async function viewAnalytics() {
            try {
              const response = await fetch('/api/requirements/analytics');
              const data = await response.json();
              
              if (data.success) {
                const analytics = data.analytics;
                alert('Requirements Analytics:\\n' +
                      'Total: ' + analytics.totalRequirements + '\\n' +
                      'By Type: ' + JSON.stringify(analytics.byType) + '\\n' +
                      'By Priority: ' + JSON.stringify(analytics.byPriority) + '\\n' +
                      'Most Common Type: ' + analytics.trends.mostCommonType);
                console.log('Full analytics:', analytics);
              }
            } catch (error) {
              console.error('Failed to load analytics:', error);
            }
          }

          // Auto-load on page ready
          loadRequirements();
          loadThemes();
        </script>
      </body>
      </html>
    `;
  }

  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getRequirements(): Map<string, RequirementCollection> {
    return this.readRequirements();
  }

  clearRequirements(): void {
    this.writeRequirements(new Map());
  }

  cleanup(): void {
    if (fs.existsSync(this.dataDir)) {
      fs.rmSync(this.dataDir, { recursive: true, force: true });
    }
  }
}

describe('🚨 Story: Requirements Export Workflow - System Test', () => {
  let server: RequirementsGUIServer;
  const testPort = 3460;
  const baseUrl = `http://localhost:${testPort}`;

  beforeAll(async () => {
    server = new RequirementsGUIServer();
    await server.start(testPort);
  });

  afterAll(async () => {
    await server.stop();
    
    // Clean up test data and export files
    server.cleanup();
    const exportsDir = path.join(__dirname, 'exports');
    if (fs.existsSync(exportsDir)) {
      fs.rmSync(exportsDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    server.clearRequirements();
  });

  describe('🚨 Story: Requirements Capture Workflow', () => {
    test('should capture requirements during theme selection', async () => {
      // Given: The system is in a valid state
      // When: capture requirements during theme selection
      // Then: The expected behavior occurs
      // Create session
      const response = await fetch(`${baseUrl}/`);
      expect(response.status).toBe(200);
      
      const html = await response.text();
      const setCookieHeader = response.headers.get('set-cookie');
      const sessionCookie = setCookieHeader!.split(';')[0];
      const userId = html.match(/User: ([^|]+)/)?.[1]?.trim();
      expect(userId).toBeTruthy();

      // Load themes
      const themesResponse = await fetch(`${baseUrl}/api/themes`, {
        headers: { 'Cookie': sessionCookie }
      });
      const themesData = await themesResponse.json() as any;
      expect(themesData.success).toBe(true);
      expect(themesData.themes).toHaveLength(2);

      // Select theme with requirements
      const themeId = themesData.themes[0].id;
      const selectResponse = await fetch(`${baseUrl}/api/themes/${themeId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          screenId: 'main-screen',
          customizations: { 
            primaryColor: '#007bff',
            layout: 'grid'
          },
          comments: 'This theme looks perfect for our business needs',
          requirements: [
            {
              type: "functional",
              title: 'Real-time Data Updates',
              description: 'Dashboard must update data in real-time',
              priority: 'high',
              tags: ['real-time', 'data']
            },
            {
              type: "performance",
              title: 'Fast Loading',
              description: 'Page must load within 2 seconds',
              priority: 'medium',
              tags: ["performance", 'speed']
            }
          ]
        })
      });

      const selectData = await selectResponse.json() as any;
      expect(selectData.success).toBe(true);
      expect(selectData.requirementsCapture.captured).toBe(true);
      expect(selectData.requirementsCapture.count).toBeGreaterThan(0);

      // Verify requirements were captured
      const requirementsResponse = await fetch(`${baseUrl}/api/requirements`, {
        headers: { 'Cookie': sessionCookie }
      });
      const requirementsData = await requirementsResponse.json() as any;
      expect(requirementsData.success).toBe(true);
      expect(requirementsData.requirements.length).toBeGreaterThanOrEqual(4); // 2 user + auto-generated

      // Check specific requirements
      const userRequirements = requirementsData.requirements.filter((req: any) => req.source === 'user_input');
      expect(userRequirements).toHaveLength(2);
      expect(userRequirements[0].title).toBe('Real-time Data Updates');
      expect(userRequirements[1].title).toBe('Fast Loading');

      // Check auto-generated requirements
      const themeRequirements = requirementsData.requirements.filter((req: any) => req.source === 'theme_selection');
      expect(themeRequirements.length).toBeGreaterThan(0);

      const commentRequirements = requirementsData.requirements.filter((req: any) => req.source === 'comment');
      expect(commentRequirements.length).toBeGreaterThan(0);
    });

    test('should allow manual requirement addition', async () => {
      // Given: The system is in a valid state
      // When: allow manual requirement addition
      // Then: The expected behavior occurs
      // Create session
      const response = await fetch(`${baseUrl}/`);
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];

      // Add manual requirement
      const addRequirementResponse = await fetch(`${baseUrl}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          type: "accessibility",
          title: 'WCAG Compliance',
          description: 'Interface must meet WCAG 2.1 AA standards',
          priority: "critical",
          tags: ["accessibility", 'wcag', "compliance"]
        })
      });

      const addData = await addRequirementResponse.json() as any;
      expect(addData.success).toBe(true);
      expect(addData.requirement.type).toBe("accessibility");
      expect(addData.requirement.title).toBe('WCAG Compliance');
      expect(addData.requirement.priority).toBe("critical");
      expect(addData.totalRequirements).toBe(1);

      // Verify requirement was stored
      const requirementsResponse = await fetch(`${baseUrl}/api/requirements`, {
        headers: { 'Cookie': sessionCookie }
      });
      const requirementsData = await requirementsResponse.json() as any;
      expect(requirementsData.success).toBe(true);
      expect(requirementsData.requirements).toHaveLength(1);
      expect(requirementsData.requirements[0].title).toBe('WCAG Compliance');
    });

    test('should filter requirements by type and priority', async () => {
      // Given: The system is in a valid state
      // When: filter requirements by type and priority
      // Then: The expected behavior occurs
      // Create session
      const response = await fetch(`${baseUrl}/`);
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];

      // Add multiple requirements
      const requirements = [
        { type: "functional", priority: 'high', title: 'Feature A', description: 'Description A' },
        { type: "functional", priority: 'low', title: 'Feature B', description: 'Description B' },
        { type: "performance", priority: 'high', title: 'Performance A', description: 'Description A' },
        { type: 'visual', priority: 'medium', title: 'Visual A', description: 'Description A' }
      ];

      for (const req of requirements) {
        await fetch(`${baseUrl}/api/requirements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
          },
          body: JSON.stringify(req)
        });
      }

      // Filter by type
      const functionalResponse = await fetch(`${baseUrl}/api/requirements?type=functional`, {
        headers: { 'Cookie': sessionCookie }
      });
      const functionalData = await functionalResponse.json() as any;
      expect(functionalData.success).toBe(true);
      expect(functionalData.requirements).toHaveLength(2);
      expect(functionalData.requirements.every((req: any) => req.type === "functional")).toBe(true);

      // Filter by priority
      const highPriorityResponse = await fetch(`${baseUrl}/api/requirements?priority=high`, {
        headers: { 'Cookie': sessionCookie }
      });
      const highPriorityData = await highPriorityResponse.json() as any;
      expect(highPriorityData.success).toBe(true);
      expect(highPriorityData.requirements).toHaveLength(2);
      expect(highPriorityData.requirements.every((req: any) => req.priority === 'high')).toBe(true);
    });
  });

  describe('Requirements Export Functionality', () => {
    test('should export requirements in JSON format', async () => {
      // Given: The system is in a valid state
      // When: export requirements in JSON format
      // Then: The expected behavior occurs
      // Create session and add requirements
      const response = await fetch(`${baseUrl}/`);
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];

      // Set project name
      await fetch(`${baseUrl}/api/requirements/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({ projectName: 'Test Export Project' })
      });

      // Add requirement
      await fetch(`${baseUrl}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          type: "functional",
          title: 'Export Test Requirement',
          description: 'This requirement is for testing export functionality',
          priority: 'medium',
          tags: ['export', 'test']
        })
      });

      // Export requirements
      const exportResponse = await fetch(`${baseUrl}/api/requirements/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          format: 'json',
          options: {}
        })
      });

      const exportData = await exportResponse.json() as any;
      expect(exportData.success).toBe(true);
      expect(exportData.export.format).toBe('json');
      expect(exportData.export.filename).toMatch(/requirements_.*\.json$/);
      expect(exportData.export.size).toBeGreaterThan(0);
      expect(exportData.downloadUrl).toBeTruthy();

      // Verify export content
      const exportContent = JSON.parse(exportData.export.content);
      expect(exportContent.projectName).toBe('Test Export Project');
      expect(exportContent.requirements).toHaveLength(1);
      expect(exportContent.requirements[0].title).toBe('Export Test Requirement');
    });

    test('should export requirements in Markdown format', async () => {
      // Given: The system is in a valid state
      // When: export requirements in Markdown format
      // Then: The expected behavior occurs
      // Create session and add requirements
      const response = await fetch(`${baseUrl}/`);
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];

      // Set project name
      await fetch(`${baseUrl}/api/requirements/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({ projectName: 'Markdown Export Test' })
      });

      // Add requirements
      await fetch(`${baseUrl}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          type: "functional",
          title: 'Markdown Test',
          description: 'Testing markdown export',
          priority: 'high',
          tags: ["markdown", 'export']
        })
      });

      // Export as Markdown
      const exportResponse = await fetch(`${baseUrl}/api/requirements/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          format: "markdown",
          options: {}
        })
      });

      const exportData = await exportResponse.json() as any;
      expect(exportData.success).toBe(true);
      expect(exportData.export.format).toBe("markdown");
      expect(exportData.export.filename).toMatch(/requirements_.*\.md$/);

      // Verify markdown content
      const markdownContent = exportData.export.content;
      expect(markdownContent).toContain('# Markdown Export Test - Requirements Document');
      expect(markdownContent).toContain('### Markdown Test (high)');
      expect(markdownContent).toContain('**Type:** functional');
      expect(markdownContent).toContain('Testing markdown export');
    });

    test('should export requirements in HTML format', async () => {
      // Given: The system is in a valid state
      // When: export requirements in HTML format
      // Then: The expected behavior occurs
      // Create session and add requirements
      const response = await fetch(`${baseUrl}/`);
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];

      await fetch(`${baseUrl}/api/requirements/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({ projectName: 'HTML Export Test' })
      });

      await fetch(`${baseUrl}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          type: 'visual',
          title: 'HTML Test',
          description: 'Testing HTML export',
          priority: 'medium',
          tags: ['html', 'export']
        })
      });

      // Export as HTML
      const exportResponse = await fetch(`${baseUrl}/api/requirements/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          format: 'html',
          options: {}
        })
      });

      const exportData = await exportResponse.json() as any;
      expect(exportData.success).toBe(true);
      expect(exportData.export.format).toBe('html');
      expect(exportData.export.filename).toMatch(/requirements_.*\.html$/);

      // Verify HTML content
      const htmlContent = exportData.export.content;
      expect(htmlContent).toContain('<title>HTML Export Test - Requirements</title>');
      expect(htmlContent).toContain('<h1>HTML Export Test - Requirements Document</h1>');
      expect(htmlContent).toContain('<h3>HTML Test</h3>');
      expect(htmlContent).toContain('priority-medium');
      expect(htmlContent).toContain('Testing HTML export');
    });

    test('should export requirements in CSV format', async () => {
      // Given: The system is in a valid state
      // When: export requirements in CSV format
      // Then: The expected behavior occurs
      // Create session and add requirements
      const response = await fetch(`${baseUrl}/`);
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];

      await fetch(`${baseUrl}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          type: "performance",
          title: 'CSV Test',
          description: 'Testing CSV export',
          priority: 'low',
          tags: ['csv', 'export']
        })
      });

      // Export as CSV
      const exportResponse = await fetch(`${baseUrl}/api/requirements/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          format: 'csv',
          options: {}
        })
      });

      const exportData = await exportResponse.json() as any;
      expect(exportData.success).toBe(true);
      expect(exportData.export.format).toBe('csv');
      expect(exportData.export.filename).toMatch(/requirements_.*\.csv$/);

      // Verify CSV content
      const csvContent = exportData.export.content;
      const lines = csvContent.split('\n');
      expect(lines[0]).toBe('ID,Type,Title,Description,Priority,Source,Tags,Created At');
      expect(lines[1]).toContain("performance");
      expect(lines[1]).toContain('"CSV Test"');
      expect(lines[1]).toContain('"Testing CSV export"');
      expect(lines[1]).toContain('low');
      expect(lines[1]).toContain('"csv, export"');
    });
  });

  describe('Requirements Analytics', () => {
    test('should provide analytics on requirements collection', async () => {
      // Given: The system is in a valid state
      // When: provide analytics on requirements collection
      // Then: The expected behavior occurs
      // Create session and add diverse requirements
      const response = await fetch(`${baseUrl}/`);
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];

      const requirements = [
        { type: "functional", priority: 'high', title: 'Func A', description: 'Desc A' },
        { type: "functional", priority: 'medium', title: 'Func B', description: 'Desc B' },
        { type: "performance", priority: 'high', title: 'Perf A', description: 'Desc A' },
        { type: 'visual', priority: 'low', title: 'Visual A', description: 'Desc A' },
        { type: "accessibility", priority: "critical", title: 'Access A', description: 'Desc A' }
      ];

      for (const req of requirements) {
        await fetch(`${baseUrl}/api/requirements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
          },
          body: JSON.stringify(req)
        });
      }

      // Get analytics
      const analyticsResponse = await fetch(`${baseUrl}/api/requirements/analytics`, {
        headers: { 'Cookie': sessionCookie }
      });
      const analyticsData = await analyticsResponse.json() as any;

      expect(analyticsData.success).toBe(true);
      expect(analyticsData.analytics.totalRequirements).toBe(5);
      
      // Check type distribution
      expect(analyticsData.analytics.byType.functional).toBe(2);
      expect(analyticsData.analytics.byType.performance).toBe(1);
      expect(analyticsData.analytics.byType.visual).toBe(1);
      expect(analyticsData.analytics.byType.accessibility).toBe(1);

      // Check priority distribution
      expect(analyticsData.analytics.byPriority.high).toBe(2);
      expect(analyticsData.analytics.byPriority.medium).toBe(1);
      expect(analyticsData.analytics.byPriority.low).toBe(1);
      expect(analyticsData.analytics.byPriority.critical).toBe(1);

      // Check trends
      expect(analyticsData.analytics.trends.mostCommonType).toBe("functional");
      expect(analyticsData.analytics.trends.mostCommonPriority).toBe('high');
    });
  });

  describe('🚨 Story: In Progress Workflow Integration', () => {
    test('should complete full requirements capture and export workflow', async () => {
      // Given: The system is in a valid state
      // When: In Progress full requirements capture and export workflow
      // Then: The expected behavior occurs
      // Step 1: Create session
      const response = await fetch(`${baseUrl}/`);
      expect(response.status).toBe(200);
      
      const html = await response.text();
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];
      const userId = html.match(/User: ([^|]+)/)?.[1]?.trim();

      // Step 2: Set project name
      const projectResponse = await fetch(`${baseUrl}/api/requirements/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({ projectName: 'In Progress Workflow Test' })
      });
      expect(projectResponse.status).toBe(200);

      // Step 3: Load themes and select one with requirements
      const themesResponse = await fetch(`${baseUrl}/api/themes`, {
        headers: { 'Cookie': sessionCookie }
      });
      const themesData = await themesResponse.json() as any;
      const themeId = themesData.themes[0].id;

      const selectResponse = await fetch(`${baseUrl}/api/themes/${themeId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          screenId: 'main-screen',
          customizations: { theme: 'dark', layout: 'sidebar' },
          comments: 'Perfect for our business dashboard needs',
          requirements: [
            {
              type: "functional",
              title: 'User Authentication',
              description: 'Must support SSO login',
              priority: "critical",
              tags: ['auth', 'sso']
            }
          ]
        })
      });
      const selectData = await selectResponse.json() as any;
      expect(selectData.success).toBe(true);

      // Step 4: Add manual requirements
      await fetch(`${baseUrl}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          type: "performance",
          title: 'Page Load Speed',
          description: 'All pages must load within 3 seconds',
          priority: 'high',
          tags: ["performance", 'speed']
        })
      });

      // Step 5: Verify all requirements captured
      const requirementsResponse = await fetch(`${baseUrl}/api/requirements`, {
        headers: { 'Cookie': sessionCookie }
      });
      const requirementsData = await requirementsResponse.json() as any;
      expect(requirementsData.success).toBe(true);
      expect(requirementsData.requirements.length).toBeGreaterThanOrEqual(4); // User + auto-generated

      // Step 6: Export in multiple formats
      const formats = ['json', "markdown", 'html', 'csv'];
      const exports: any[] = [];

      for (const format of formats) {
        const exportResponse = await fetch(`${baseUrl}/api/requirements/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
          },
          body: JSON.stringify({ format, options: {} })
        });
        const exportData = await exportResponse.json() as any;
        expect(exportData.success).toBe(true);
        exports.push(exportData.export);
      }

      // Step 7: Verify export results
      expect(exports).toHaveLength(4);
      exports.forEach(exp => {
        expect(exp.filename).toBeTruthy();
        expect(exp.size).toBeGreaterThan(0);
        expect(exp.content).toBeTruthy();
      });

      // Step 8: Get analytics
      const analyticsResponse = await fetch(`${baseUrl}/api/requirements/analytics`, {
        headers: { 'Cookie': sessionCookie }
      });
      const analyticsData = await analyticsResponse.json() as any;
      expect(analyticsData.success).toBe(true);
      expect(analyticsData.analytics.totalRequirements).toBeGreaterThanOrEqual(4);

      // Step 9: Verify In Progress workflow results
      expect(requirementsData.collection.projectName).toBe('In Progress Workflow Test');
      expect(analyticsData.analytics.byType).toHaveProperty("functional");
      expect(analyticsData.analytics.byType).toHaveProperty("performance");
      expect(exports.find(e => e.format === 'json')).toBeTruthy();
      expect(exports.find(e => e.format === "markdown")).toBeTruthy();
      expect(exports.find(e => e.format === 'html')).toBeTruthy();
      expect(exports.find(e => e.format === 'csv')).toBeTruthy();
    });
  });

  describe('Health and Status', () => {
    test('should provide health status for requirements system', async () => {
      // Given: The system is in a valid state
      // When: provide health status for requirements system
      // Then: The expected behavior occurs
      const healthResponse = await fetch(`${baseUrl}/health`);
      expect(healthResponse.status).toBe(200);
      
      const healthData = await healthResponse.json() as any;
      expect(healthData.status).toBe('healthy');
      expect(healthData.services.requirementsEngine).toBe('active');
      expect(healthData.services.exportService).toBe('ready');
      expect(healthData.services.analytics).toBe('ready');
      expect(healthData.stats).toHaveProperty("activeCollections");
      expect(healthData.stats).toHaveProperty("totalRequirements");
    });
  });
});