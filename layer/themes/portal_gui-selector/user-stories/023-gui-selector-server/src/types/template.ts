export interface PageTemplate {
  id: string;
  name: string;
  type: 'home' | 'dashboard' | 'form' | 'list' | 'detail' | 'settings' | 'profile' | 'login' | 'custom';
  html: string;
  css?: string;
  javascript?: string;
  customizable: {
    colors?: boolean;
    layout?: boolean;
    components?: boolean;
    content?: boolean;
  };
  previewUrl?: string;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'modern' | "professional" | "creative" | "accessible";
  previewUrl: string;
  thumbnailUrl: string;
  features: string[];
  pages?: PageTemplate[];
  defaultPages?: string[];
  maxPages?: number;
  metadata: {
    author: string;
    version: string;
    lastUpdated: string;
    tags: string[];
    supportsMultiPage?: boolean;
  };
}

export interface PreviewData {
  templateId: string;
  html: string;
  css: string;
  javascript?: string;
  assets: string[];
  pages?: PageTemplate[];
}

export interface PageCustomization {
  pageId: string;
  templateId: string;
  customizations: {
    colors?: {
      primary?: string;
      secondary?: string;
      background?: string;
      text?: string;
    };
    layout?: {
      sidebar?: 'left' | 'right' | 'none';
      header?: 'fixed' | 'static' | 'hidden';
      footer?: boolean;
    };
    components?: {
      [key: string]: any;
    };
    content?: {
      title?: string;
      description?: string;
      [key: string]: any;
    };
  };
}

export interface ProjectCustomization {
  templateId: string;
  globalSettings: {
    theme?: 'light' | 'dark' | 'auto';
    fontFamily?: string;
    borderRadius?: string;
    spacing?: 'compact' | 'normal' | 'relaxed';
  };
  pages: PageCustomization[];
}