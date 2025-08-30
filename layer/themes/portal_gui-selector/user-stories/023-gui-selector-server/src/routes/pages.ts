import { Router, Request, Response } from 'express';
import { PageManagementService } from '../services/PageManagementService';

const router = Router();
const pageService = new PageManagementService();

router.get('/templates/:templateId/pages', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId } = req.params;
    
    const pages = await pageService.listPages(userId, templateId);
    res.json({ pages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list pages' });
  }
});

router.get('/page-templates', async (req: Request, res: Response) => {
  try {
    const templates = await pageService.getAvailablePageTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get page templates' });
  }
});

router.post('/templates/:templateId/pages', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId } = req.params;
    const pageData = req.body;
    
    const newPage = await pageService.createPage(userId, templateId, pageData);
    res.status(201).json({ page: newPage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create page' });
  }
});

router.post('/templates/:templateId/pages/from-template', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId } = req.params;
    const { pageTemplateId, customName } = req.body;
    
    const newPage = await pageService.addPageFromTemplate(
      userId,
      templateId,
      pageTemplateId,
      customName
    );
    res.status(201).json({ page: newPage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add page from template' });
  }
});

router.put('/templates/:templateId/pages/:pageId', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId, pageId } = req.params;
    const updates = req.body;
    
    const updatedPage = await pageService.updatePage(userId, templateId, pageId, updates);
    res.json({ page: updatedPage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update page' });
  }
});

router.delete('/templates/:templateId/pages/:pageId', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId, pageId } = req.params;
    
    const deleted = await pageService.deletePage(userId, templateId, pageId);
    if (deleted) {
      res.json({ message: 'Page deleted successfully' });
    } else {
      res.status(404).json({ error: 'Page not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

router.put('/templates/:templateId/pages/reorder', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId } = req.params;
    const { pageIds } = req.body;
    
    const reorderedPages = await pageService.reorderPages(userId, templateId, pageIds);
    res.json({ pages: reorderedPages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder pages' });
  }
});

router.post('/templates/:templateId/pages/:pageId/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId, pageId } = req.params;
    const { newName } = req.body;
    
    const duplicatedPage = await pageService.duplicatePage(
      userId,
      templateId,
      pageId,
      newName || 'Duplicated Page'
    );
    res.status(201).json({ page: duplicatedPage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate page' });
  }
});

router.post('/templates/:templateId/pages/:pageId/customize', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId, pageId } = req.params;
    const { customizations } = req.body;
    
    const customization = await pageService.customizePage(
      userId,
      templateId,
      pageId,
      customizations
    );
    res.json({ customization });
  } catch (error) {
    res.status(500).json({ error: 'Failed to customize page' });
  }
});

router.get('/templates/:templateId/pages/:pageId/customization', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId, pageId } = req.params;
    
    const customization = await pageService.getPageCustomization(userId, templateId, pageId);
    res.json({ customization });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get page customization' });
  }
});

router.get('/templates/:templateId/pages/:pageId/preview', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId, pageId } = req.params;
    
    // Get the page data
    const pages = await pageService.listPages(userId, templateId);
    const page = pages.find(p => p.id === pageId);
    
    if (!page) {
      // Return a default preview if page not found
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Page Preview</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
            }
            .preview-message {
              text-align: center;
              padding: 50px;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="preview-message">
            <h1>No Preview Available</h1>
            <p>Please add pages to see the preview</p>
          </div>
        </body>
        </html>
      `;
      return res.send(html);
    }
    
    // Get customizations if any
    const customization = await pageService.getPageCustomization(userId, templateId, pageId);
    const projectCustomization = await pageService.getProjectCustomization(userId, templateId);
    
    // Generate preview HTML with customizations
    let html = page.html || '<div>Page content</div>';
    let css = page.css || '';
    
    // Apply customizations
    if (customization?.customizations) {
      const { colors, layout } = customization.customizations as any;
      
      if (colors) {
        css += `
          :root {
            --primary-color: ${colors.primary || '#667eea'};
            --secondary-color: ${colors.secondary || '#764ba2'};
            --background-color: ${colors.background || '#ffffff'};
            --text-color: ${colors.text || '#333333'};
          }
          body {
            background-color: var(--background-color);
            color: var(--text-color);
          }
          .primary { color: var(--primary-color); }
          .secondary { color: var(--secondary-color); }
        `;
      }
      
      if (layout) {
        if (layout.sidebar === 'none') {
          css += '.sidebar { display: none; }';
        } else if (layout.sidebar === 'right') {
          css += '.page-dashboard { flex-direction: row-reverse; }';
        }
        
        if (layout.header === 'hidden') {
          css += 'header { display: none; }';
        } else if (layout.header === 'fixed') {
          css += 'header { position: fixed; top: 0; width: 100%; z-index: 100; }';
        }
        
        if (!layout.footer) {
          css += 'footer { display: none; }';
        }
      }
    }
    
    // Apply global customizations
    if (projectCustomization?.globalSettings) {
      const theme = (projectCustomization.globalSettings as any).theme;
      if (theme === 'dark') {
        css += `
          body {
            background-color: #1a1a1a;
            color: #ffffff;
          }
        `;
      }
    }
    
    // Create complete HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${page.name || 'Page Preview'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
          }
          .page-home, .page-dashboard, .page-form, .page-list, .page-profile {
            padding: 20px;
            min-height: 100vh;
          }
          header {
            background: linear-gradient(135deg, var(--primary-color, #667eea), var(--secondary-color, #764ba2));
            color: white;
            padding: 20px;
            margin-bottom: 20px;
          }
          nav {
            display: flex;
            gap: 20px;
          }
          .hero {
            padding: 60px 20px;
            text-align: center;
            background: #f9f9f9;
            border-radius: 10px;
            margin-bottom: 30px;
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 20px;
          }
          .sidebar {
            background: #f5f5f5;
            padding: 20px;
            min-width: 250px;
          }
          .main-content {
            flex: 1;
            padding: 20px;
          }
          .page-dashboard {
            display: flex;
            gap: 20px;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          form {
            max-width: 500px;
            margin: 0 auto;
          }
          input, textarea, select {
            width: 100%;
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          button {
            background: var(--primary-color, #667eea);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          ${css}
        </style>
        ${page.javascript ? `<script>${page.javascript}</script>` : ''}
      </head>
      <body>
        ${html.replace(/\{\{(\w+)\}\}/g, (match, placeholder) => {
          // Replace placeholders with sample content
          const placeholders: { [key: string]: string } = {
            title: page.name || 'Welcome',
            navigation: '<nav><a href="#">Home</a><a href="#">About</a><a href="#">Contact</a></nav>',
            hero_content: '<h2>Welcome to Your Site</h2><p>This is a preview of your page</p>',
            features: '<div class="feature">Feature 1</div><div class="feature">Feature 2</div><div class="feature">Feature 3</div>',
            sidebar: '<h3>Sidebar</h3><ul><li>Menu Item 1</li><li>Menu Item 2</li><li>Menu Item 3</li></ul>',
            stats: '<div class="stat-card"><h3>1,234</h3><p>Total Users</p></div><div class="stat-card"><h3>5,678</h3><p>Page Views</p></div>',
            charts: '<div style="background:#f0f0f0;padding:40px;text-align:center;border-radius:10px;">Chart Placeholder</div>',
            form_title: 'Contact Form',
            form_fields: '<input type="text" placeholder="Name"><input type="email" placeholder="Email"><textarea placeholder="Message"></textarea><button type="submit">Submit</button>',
            filters: '<select><option>All Categories</option></select>',
            list_items: '<div>Item 1</div><div>Item 2</div><div>Item 3</div>',
            pagination: '<div>← Previous | Page 1 of 5 | Next →</div>',
            profile_header: '<h2>User Profile</h2>',
            profile_content: '<p>Profile information goes here</p>'
          };
          return placeholders[placeholder] || `[${placeholder}]`;
        })}
      </body>
      </html>
    `;
    
    res.send(fullHtml);
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body>
        <h1>Preview Error</h1>
        <p>Failed to generate preview</p>
      </body>
      </html>
    `);
  }
});

router.post('/templates/:templateId/customize-global', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId } = req.params;
    const { globalSettings } = req.body;
    
    const projectCustomization = await pageService.applyGlobalCustomization(
      userId,
      templateId,
      globalSettings
    );
    res.json({ customization: projectCustomization });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply global customization' });
  }
});

router.get('/templates/:templateId/project-customization', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId } = req.params;
    
    const customization = await pageService.getProjectCustomization(userId, templateId);
    res.json({ customization });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get project customization' });
  }
});

router.get('/templates/:templateId/export', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId } = req.params;
    
    const configuration = await pageService.exportPageConfiguration(userId, templateId);
    res.json({ configuration });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export page configuration' });
  }
});

router.post('/templates/:templateId/import', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId || 'anonymous';
    const { templateId } = req.params;
    const { configuration } = req.body;
    
    const success = await pageService.importPageConfiguration(userId, templateId, configuration);
    if (success) {
      res.json({ message: 'Configuration imported successfully' });
    } else {
      res.status(400).json({ error: 'Failed to import configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to import page configuration' });
  }
});

export default router;