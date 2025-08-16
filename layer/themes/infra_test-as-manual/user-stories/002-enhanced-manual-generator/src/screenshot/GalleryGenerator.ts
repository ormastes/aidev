/**
 * GalleryGenerator - Create image galleries for documentation
 * Generates HTML/Markdown galleries from screenshot collections
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { CaptureResult } from './ScreenshotCapture';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface GalleryOptions {
  title?: string;
  description?: string;
  layout?: 'grid' | "carousel" | 'list' | "comparison";
  columns?: number;
  thumbnailSize?: number;
  showCaptions?: boolean;
  showMetadata?: boolean;
  enableLightbox?: boolean;
  enableZoom?: boolean;
  sortBy?: 'name' | 'date' | 'size';
  sortOrder?: 'asc' | 'desc';
  theme?: 'light' | 'dark' | 'auto';
}

export interface GalleryImage {
  path: string;
  thumbnailPath?: string;
  caption?: string;
  description?: string;
  metadata?: Record<string, any>;
  group?: string;
  order?: number;
}

export interface GallerySection {
  title: string;
  description?: string;
  images: GalleryImage[];
}

export class GalleryGenerator {
  private defaultOptions: GalleryOptions = {
    layout: 'grid',
    columns: 3,
    thumbnailSize: 300,
    showCaptions: true,
    showMetadata: false,
    enableLightbox: true,
    enableZoom: true,
    sortBy: 'name',
    sortOrder: 'asc',
    theme: 'light'
  };

  constructor(defaultOptions?: Partial<GalleryOptions>) {
    if (defaultOptions) {
      this.defaultOptions = { ...this.defaultOptions, ...defaultOptions };
    }
  }

  /**
   * Generate HTML gallery
   */
  async generateHTML(
    images: GalleryImage[],
    outputPath: string,
    options?: GalleryOptions
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    const sortedImages = this.sortImages(images, opts);
    
    const html = this.buildHTMLGallery(sortedImages, opts);
    await fileAPI.createFile(outputPath, html);
  }

  /**
   * Generate Markdown gallery
   */
  async generateMarkdown(
    images: GalleryImage[], { type: FileType.TEMPORARY }): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    const sortedImages = this.sortImages(images, opts);
    
    const markdown = this.buildMarkdownGallery(sortedImages, opts);
    await fileAPI.createFile(outputPath, markdown);
  }

  /**
   * Generate gallery from capture results
   */
  async generateFromCaptures(
    captures: CaptureResult[], { type: FileType.TEMPORARY }): Promise<void> {
    const images: GalleryImage[] = captures.map(capture => ({
      path: capture.path,
      caption: capture.metadata.title || capture.metadata.testName || "Screenshot",
      description: capture.metadata.stepName,
      metadata: {
        timestamp: capture.timestamp,
        url: capture.metadata.url,
        browser: capture.metadata.browser,
        viewport: capture.metadata.viewport
      }
    }));

    if (format === 'html') {
      await this.generateHTML(images, outputPath, options);
    } else {
      await this.generateMarkdown(images, outputPath, options);
    }
  }

  /**
   * Build HTML gallery
   */
  private async buildHTMLGallery(images: GalleryImage[], options: GalleryOptions): string {
    const title = options.title || 'Screenshot Gallery';
    const description = options.description || '';
    
    const styles = this.getHTMLStyles(options);
    const scripts = options.enableLightbox ? this.getLightboxScript() : '';
    const galleryHTML = this.buildGalleryHTML(images, options);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${styles}</style>
</head>
<body class="theme-${options.theme}">
    <div class="gallery-container">
        <h1>${title}</h1>
        ${description ? `<p class="gallery-description">${description}</p>` : ''}
        ${galleryHTML}
    </div>
    ${scripts}
</body>
</html>`;
  }

  /**
   * Build gallery HTML content
   */
  private async buildGalleryHTML(images: GalleryImage[], options: GalleryOptions): string {
    switch (options.layout) {
      case 'grid':
        return this.buildGridLayout(images, options);
      case "carousel":
        return this.buildCarouselLayout(images, options);
      case 'list':
        return this.buildListLayout(images, options);
      case "comparison":
        return this.buildComparisonLayout(images, options);
      default:
        return this.buildGridLayout(images, options);
    }
  }

  /**
   * Build grid layout
   */
  private async buildGridLayout(images: GalleryImage[], options: GalleryOptions): string {
    const columns = options.columns || 3;
    const items = images.map((image, index) => `
        <div class="gallery-item">
            <div class="image-wrapper">
                <img src="${this.getRelativePath(image.path)}" 
                     alt="${image.caption || ''}"
                     loading="lazy"
                     ${options.enableLightbox ? `onclick="openLightbox(${index})"` : ''}>
            </div>
            ${options.showCaptions && image.caption ? `
                <div class="caption">${image.caption}</div>
            ` : ''}
            ${options.showMetadata && image.metadata ? `
                <div class="metadata">
                    ${this.formatMetadata(image.metadata)}
                </div>
            ` : ''}
        </div>
    `).join('');

    return `<div class="gallery-grid" style="grid-template-columns: repeat(${columns}, 1fr);">${items}</div>`;
  }

  /**
   * Build carousel layout
   */
  private async buildCarouselLayout(images: GalleryImage[], options: GalleryOptions): string {
    const slides = images.map((image, index) => `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}">
            <img src="${this.getRelativePath(image.path)}" alt="${image.caption || ''}">
            ${image.caption ? `<div class="carousel-caption">${image.caption}</div>` : ''}
        </div>
    `).join('');

    return `
        <div class="carousel-container">
            <div class="carousel-slides">${slides}</div>
            <button class="carousel-prev" onclick="changeSlide(-1)">&#10094;</button>
            <button class="carousel-next" onclick="changeSlide(1)">&#10095;</button>
            <div class="carousel-indicators">
                ${images.map((_, i) => `
                    <span class="indicator ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></span>
                `).join('')}
            </div>
        </div>
    `;
  }

  /**
   * Build list layout
   */
  private async buildListLayout(images: GalleryImage[], options: GalleryOptions): string {
    const items = images.map(image => `
        <div class="list-item">
            <div class="list-image">
                <img src="${this.getRelativePath(image.path)}" alt="${image.caption || ''}">
            </div>
            <div class="list-content">
                ${image.caption ? `<h3>${image.caption}</h3>` : ''}
                ${image.description ? `<p>${image.description}</p>` : ''}
                ${options.showMetadata && image.metadata ? `
                    <div class="metadata">${this.formatMetadata(image.metadata)}</div>
                ` : ''}
            </div>
        </div>
    `).join('');

    return `<div class="gallery-list">${items}</div>`;
  }

  /**
   * Build comparison layout
   */
  private async buildComparisonLayout(images: GalleryImage[], options: GalleryOptions): string {
    const pairs: Array<[GalleryImage, GalleryImage | null]> = [];
    for (let i = 0; i < images.length; i += 2) {
      pairs.push([images[i], images[i + 1] || null]);
    }

    const comparisons = pairs.map(([before, after]) => `
        <div class="comparison-item">
            <div class="comparison-before">
                <h4>Before</h4>
                <img src="${this.getRelativePath(before.path)}" alt="${before.caption || 'Before'}">
                ${before.caption ? `<p>${before.caption}</p>` : ''}
            </div>
            ${after ? `
                <div class="comparison-after">
                    <h4>After</h4>
                    <img src="${this.getRelativePath(after.path)}" alt="${after.caption || 'After'}">
                    ${after.caption ? `<p>${after.caption}</p>` : ''}
                </div>
            ` : '<div class="comparison-after empty"></div>'}
        </div>
    `).join('');

    return `<div class="gallery-comparison">${comparisons}</div>`;
  }

  /**
   * Build Markdown gallery
   */
  private async buildMarkdownGallery(images: GalleryImage[], options: GalleryOptions): string {
    const title = options.title || 'Screenshot Gallery';
    const description = options.description || '';
    
    let markdown = `# ${title}\n\n`;
    
    if (description) {
      markdown += `${description}\n\n`;
    }

    if (options.layout === 'grid' || options.layout === 'list') {
      images.forEach(image => {
        markdown += `## ${image.caption || "Screenshot"}\n\n`;
        markdown += `![${image.caption || ''}](${this.getRelativePath(image.path)})\n\n`;
        
        if (image.description) {
          markdown += `${image.description}\n\n`;
        }
        
        if (options.showMetadata && image.metadata) {
          markdown += `**Metadata:**\n`;
          markdown += this.formatMetadataMarkdown(image.metadata);
          markdown += '\n\n';
        }
      });
    } else if (options.layout === "comparison") {
      for (let i = 0; i < images.length; i += 2) {
        const before = images[i];
        const after = images[i + 1];
        
        markdown += `## Comparison ${Math.floor(i / 2) + 1}\n\n`;
        markdown += `| Before | After |\n`;
        markdown += `|--------|-------|\n`;
        markdown += `| ![${before.caption || 'Before'}](${this.getRelativePath(before.path)}) | `;
        
        if (after) {
          markdown += `![${after.caption || 'After'}](${this.getRelativePath(after.path)}) |\n\n`;
        } else {
          markdown += `*No after image* |\n\n`;
        }
      }
    }

    return markdown;
  }

  /**
   * Get HTML styles
   */
  private async getHTMLStyles(options: GalleryOptions): string {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .theme-dark {
            background: #1a1a1a;
            color: #e0e0e0;
        }
        
        .gallery-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .theme-dark .gallery-container {
            background: #2a2a2a;
        }
        
        h1 {
            margin-bottom: 20px;
            color: #2c3e50;
        }
        
        .theme-dark h1 {
            color: #ecf0f1;
        }
        
        .gallery-description {
            margin-bottom: 30px;
            color: #666;
        }
        
        .gallery-grid {
            display: grid;
            gap: 20px;
            margin-top: 20px;
        }
        
        .gallery-item {
            background: #fff;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        
        .gallery-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .image-wrapper {
            position: relative;
            padding-bottom: 75%;
            overflow: hidden;
        }
        
        .image-wrapper img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            cursor: ${options.enableLightbox ? 'zoom-in' : 'default'};
        }
        
        .caption {
            padding: 10px;
            font-weight: 500;
            border-top: 1px solid #eee;
        }
        
        .metadata {
            padding: 10px;
            font-size: 0.85em;
            color: #888;
            background: #f9f9f9;
        }
        
        .gallery-list .list-item {
            display: flex;
            margin-bottom: 20px;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .list-image {
            width: 300px;
            flex-shrink: 0;
        }
        
        .list-image img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        
        .list-content {
            padding: 20px;
            flex: 1;
        }
        
        .comparison-item {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .comparison-before, .comparison-after {
            text-align: center;
        }
        
        .comparison-before img, .comparison-after img {
            width: 100%;
            height: auto;
            border-radius: 4px;
        }
        
        .carousel-container {
            position: relative;
            max-width: 100%;
            margin: 20px auto;
        }
        
        .carousel-slides {
            position: relative;
            height: 500px;
        }
        
        .carousel-slide {
            display: none;
            position: absolute;
            width: 100%;
            height: 100%;
        }
        
        .carousel-slide.active {
            display: block;
        }
        
        .carousel-slide img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .carousel-prev, .carousel-next {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0,0,0,0.5);
            color: white;
            border: none;
            padding: 16px;
            cursor: pointer;
            font-size: 18px;
        }
        
        .carousel-prev { left: 10px; }
        .carousel-next { right: 10px; }
        
        .carousel-indicators {
            text-align: center;
            padding: 20px;
        }
        
        .indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #ccc;
            border-radius: 50%;
            margin: 0 5px;
            cursor: pointer;
        }
        
        .indicator.active {
            background: #333;
        }
    `;
  }

  /**
   * Get lightbox script
   */
  private async getLightboxScript(): string {
    return `
    <script>
        let currentSlide = 0;
        const images = ${JSON.stringify(this.images || [])};
        
        async function openLightbox(index) {
            // Lightbox implementation
        }
        
        async function changeSlide(direction) {
            const slides = document.querySelectorAll('.carousel-slide');
            const indicators = document.querySelectorAll('.indicator');
            
            slides[currentSlide].classList.remove('active');
            indicators[currentSlide].classList.remove('active');
            
            currentSlide = (currentSlide + direction + slides.length) % slides.length;
            
            slides[currentSlide].classList.add('active');
            indicators[currentSlide].classList.add('active');
        }
        
        async function goToSlide(index) {
            const slides = document.querySelectorAll('.carousel-slide');
            const indicators = document.querySelectorAll('.indicator');
            
            slides[currentSlide].classList.remove('active');
            indicators[currentSlide].classList.remove('active');
            
            currentSlide = index;
            
            slides[currentSlide].classList.add('active');
            indicators[currentSlide].classList.add('active');
        }
    </script>
    `;
  }

  /**
   * Sort images
   */
  private async sortImages(images: GalleryImage[], options: GalleryOptions): GalleryImage[] {
    const sorted = [...images];
    
    switch (options.sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.caption || '').localeCompare(b.caption || ''));
        break;
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.metadata?.timestamp || 0;
          const dateB = b.metadata?.timestamp || 0;
          return dateA - dateB;
        });
        break;
      case 'size':
        sorted.sort((a, b) => {
          const sizeA = a.metadata?.size || 0;
          const sizeB = b.metadata?.size || 0;
          return sizeA - sizeB;
        });
        break;
    }
    
    if (options.sortOrder === 'desc') {
      sorted.reverse();
    }
    
    return sorted;
  }

  /**
   * Format metadata for display
   */
  private formatMetadata(metadata: Record<string, any>): string {
    return Object.entries(metadata)
      .map(([key, value]) => `<div><strong>${key}:</strong> ${JSON.stringify(value)}</div>`)
      .join('');
  }

  /**
   * Format metadata for Markdown
   */
  private formatMetadataMarkdown(metadata: Record<string, any>): string {
    return Object.entries(metadata)
      .map(([key, value]) => `- **${key}:** ${JSON.stringify(value)}`)
      .join('\n');
  }

  /**
   * Get relative path
   */
  private async getRelativePath(imagePath: string): string {
    return path.relative(process.cwd(), imagePath);
  }

  private images: GalleryImage[] = [];
}