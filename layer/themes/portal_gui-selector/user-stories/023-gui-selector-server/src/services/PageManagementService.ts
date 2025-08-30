import { PageTemplate, PageCustomization, ProjectCustomization } from '../types/template';

export class PageManagementService {
  private userPages: Map<string, PageTemplate[]> = new Map();
  private pageCustomizations: Map<string, PageCustomization[]> = new Map();
  private projectCustomizations: Map<string, ProjectCustomization> = new Map();

  private pageTemplates: PageTemplate[] = [
    {
      id: 'home-default',
      name: 'Home Page',
      type: 'home',
      html: `
        <div class="page-home">
          <header>
            <h1>{{title}}</h1>
            <nav>{{navigation}}</nav>
          </header>
          <main>
            <section class="hero">{{hero_content}}</section>
            <section class="features">{{features}}</section>
          </main>
        </div>
      `,
      customizable: {
        colors: true,
        layout: true,
        components: true,
        content: true
      }
    },
    {
      id: 'dashboard-default',
      name: 'Dashboard',
      type: 'dashboard',
      html: `
        <div class="page-dashboard">
          <div class="sidebar">{{sidebar}}</div>
          <div class="main-content">
            <div class="stats">{{stats}}</div>
            <div class="charts">{{charts}}</div>
          </div>
        </div>
      `,
      customizable: {
        colors: true,
        layout: true,
        components: true,
        content: true
      }
    },
    {
      id: 'form-default',
      name: 'Form Page',
      type: 'form',
      html: `
        <div class="page-form">
          <h2>{{form_title}}</h2>
          <form>{{form_fields}}</form>
        </div>
      `,
      customizable: {
        colors: true,
        layout: false,
        components: true,
        content: true
      }
    },
    {
      id: 'list-default',
      name: 'List View',
      type: 'list',
      html: `
        <div class="page-list">
          <div class="filters">{{filters}}</div>
          <div class="list-container">{{list_items}}</div>
          <div class="pagination">{{pagination}}</div>
        </div>
      `,
      customizable: {
        colors: true,
        layout: true,
        components: true,
        content: true
      }
    },
    {
      id: 'profile-default',
      name: 'Profile Page',
      type: 'profile',
      html: `
        <div class="page-profile">
          <div class="profile-header">{{profile_header}}</div>
          <div class="profile-content">{{profile_content}}</div>
        </div>
      `,
      customizable: {
        colors: true,
        layout: true,
        components: true,
        content: true
      }
    }
  ];

  async createPage(
    userId: string,
    templateId: string,
    pageData: Partial<PageTemplate>
  ): Promise<PageTemplate> {
    const newPage: PageTemplate = {
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: pageData.name || 'New Page',
      type: pageData.type || 'custom',
      html: pageData.html || '<div>New Page Content</div>',
      css: pageData.css,
      javascript: pageData.javascript,
      customizable: pageData.customizable || {
        colors: true,
        layout: true,
        components: true,
        content: true
      },
      previewUrl: pageData.previewUrl
    };

    const userKey = `${userId}-${templateId}`;
    const existingPages = this.userPages.get(userKey) || [];
    existingPages.push(newPage);
    this.userPages.set(userKey, existingPages);

    return newPage;
  }

  async listPages(userId: string, templateId: string): Promise<PageTemplate[]> {
    const userKey = `${userId}-${templateId}`;
    return this.userPages.get(userKey) || [];
  }

  async getAvailablePageTemplates(): Promise<PageTemplate[]> {
    return [...this.pageTemplates];
  }

  async addPageFromTemplate(
    userId: string,
    templateId: string,
    pageTemplateId: string,
    customName?: string
  ): Promise<PageTemplate> {
    const template = this.pageTemplates.find(t => t.id === pageTemplateId);
    if (!template) {
      throw new Error(`Page template ${pageTemplateId} not found`);
    }

    const newPage: PageTemplate = {
      ...template,
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: customName || template.name
    };

    const userKey = `${userId}-${templateId}`;
    const existingPages = this.userPages.get(userKey) || [];
    existingPages.push(newPage);
    this.userPages.set(userKey, existingPages);

    return newPage;
  }

  async updatePage(
    userId: string,
    templateId: string,
    pageId: string,
    updates: Partial<PageTemplate>
  ): Promise<PageTemplate> {
    const userKey = `${userId}-${templateId}`;
    const pages = this.userPages.get(userKey) || [];
    const pageIndex = pages.findIndex(p => p.id === pageId);

    if (pageIndex === -1) {
      throw new Error(`Page ${pageId} not found`);
    }

    pages[pageIndex] = {
      ...pages[pageIndex],
      ...updates,
      id: pages[pageIndex].id
    };

    this.userPages.set(userKey, pages);
    return pages[pageIndex];
  }

  async deletePage(
    userId: string,
    templateId: string,
    pageId: string
  ): Promise<boolean> {
    const userKey = `${userId}-${templateId}`;
    const pages = this.userPages.get(userKey) || [];
    const filteredPages = pages.filter(p => p.id !== pageId);

    if (filteredPages.length === pages.length) {
      return false;
    }

    this.userPages.set(userKey, filteredPages);
    return true;
  }

  async reorderPages(
    userId: string,
    templateId: string,
    pageIds: string[]
  ): Promise<PageTemplate[]> {
    const userKey = `${userId}-${templateId}`;
    const pages = this.userPages.get(userKey) || [];
    
    const reorderedPages = pageIds
      .map(id => pages.find(p => p.id === id))
      .filter(p => p !== undefined) as PageTemplate[];

    this.userPages.set(userKey, reorderedPages);
    return reorderedPages;
  }

  async customizePage(
    userId: string,
    templateId: string,
    pageId: string,
    customization: PageCustomization['customizations']
  ): Promise<PageCustomization> {
    const userKey = `${userId}-${templateId}`;
    const customizations = this.pageCustomizations.get(userKey) || [];
    
    const existingIndex = customizations.findIndex(c => c.pageId === pageId);
    const pageCustomization: PageCustomization = {
      pageId,
      templateId,
      customizations: customization
    };

    if (existingIndex >= 0) {
      customizations[existingIndex] = pageCustomization;
    } else {
      customizations.push(pageCustomization);
    }

    this.pageCustomizations.set(userKey, customizations);
    return pageCustomization;
  }

  async getPageCustomization(
    userId: string,
    templateId: string,
    pageId: string
  ): Promise<PageCustomization | null> {
    const userKey = `${userId}-${templateId}`;
    const customizations = this.pageCustomizations.get(userKey) || [];
    return customizations.find(c => c.pageId === pageId) || null;
  }

  async applyGlobalCustomization(
    userId: string,
    templateId: string,
    globalSettings: ProjectCustomization['globalSettings']
  ): Promise<ProjectCustomization> {
    const userKey = `${userId}-${templateId}`;
    const pageCustomizations = this.pageCustomizations.get(userKey) || [];
    
    const projectCustomization: ProjectCustomization = {
      templateId,
      globalSettings,
      pages: pageCustomizations
    };

    this.projectCustomizations.set(userKey, projectCustomization);
    return projectCustomization;
  }

  async getProjectCustomization(
    userId: string,
    templateId: string
  ): Promise<ProjectCustomization | null> {
    const userKey = `${userId}-${templateId}`;
    return this.projectCustomizations.get(userKey) || null;
  }

  async duplicatePage(
    userId: string,
    templateId: string,
    pageId: string,
    newName: string
  ): Promise<PageTemplate> {
    const userKey = `${userId}-${templateId}`;
    const pages = this.userPages.get(userKey) || [];
    const originalPage = pages.find(p => p.id === pageId);

    if (!originalPage) {
      throw new Error(`Page ${pageId} not found`);
    }

    const duplicatedPage: PageTemplate = {
      ...originalPage,
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName
    };

    pages.push(duplicatedPage);
    this.userPages.set(userKey, pages);

    return duplicatedPage;
  }

  async exportPageConfiguration(
    userId: string,
    templateId: string
  ): Promise<{
    pages: PageTemplate[];
    customizations: PageCustomization[];
    projectSettings: ProjectCustomization | null;
  }> {
    const userKey = `${userId}-${templateId}`;
    
    return {
      pages: this.userPages.get(userKey) || [],
      customizations: this.pageCustomizations.get(userKey) || [],
      projectSettings: this.projectCustomizations.get(userKey) || null
    };
  }

  async importPageConfiguration(
    userId: string,
    templateId: string,
    config: {
      pages: PageTemplate[];
      customizations?: PageCustomization[];
      projectSettings?: ProjectCustomization;
    }
  ): Promise<boolean> {
    const userKey = `${userId}-${templateId}`;
    
    this.userPages.set(userKey, config.pages);
    
    if (config.customizations) {
      this.pageCustomizations.set(userKey, config.customizations);
    }
    
    if (config.projectSettings) {
      this.projectCustomizations.set(userKey, config.projectSettings);
    }
    
    return true;
  }
}