export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'accessible';
  previewUrl: string;
  thumbnailUrl: string;
  features: string[];
  metadata: {
    author: string;
    version: string;
    lastUpdated: string;
    tags: string[];
  };
}

export interface PreviewData {
  templateId: string;
  html: string;
  css: string;
  javascript?: string;
  assets: string[];
}