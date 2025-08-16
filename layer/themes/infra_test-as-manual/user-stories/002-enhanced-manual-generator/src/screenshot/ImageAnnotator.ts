/**
 * ImageAnnotator - Add annotations and highlights to screenshots
 * Provides visual annotations for better manual documentation
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface Annotation {
  type: 'box' | 'arrow' | 'text' | 'circle' | "highlight" | 'blur' | 'number';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  lineWidth?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  arrowEnd?: { x: number; y: number };
  number?: number;
}

export interface AnnotationStyle {
  defaultColor: string;
  highlightColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  lineWidth: number;
  arrowSize: number;
  numberCircleRadius: number;
}

export class ImageAnnotator {
  private defaultStyle: AnnotationStyle = {
    defaultColor: '#FF0000',
    highlightColor: 'rgba(255, 255, 0, 0.3)',
    textColor: '#000000',
    fontSize: 16,
    fontFamily: 'Arial, sans-serif',
    lineWidth: 2,
    arrowSize: 10,
    numberCircleRadius: 15
  };

  constructor(customStyle?: Partial<AnnotationStyle>) {
    if (customStyle) {
      this.defaultStyle = { ...this.defaultStyle, ...customStyle };
    }
  }

  /**
   * Annotate an image with multiple annotations
   */
  async annotate(
    imagePath: string,
    annotations: Annotation[],
    outputPath?: string
  ): Promise<string> {
    // Load the image
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Apply each annotation
    for (const annotation of annotations) {
      await this.applyAnnotation(ctx, annotation);
    }

    // Save the annotated image
    const output = outputPath || this.generateOutputPath(imagePath);
    const buffer = canvas.toBuffer('image/png');
    await fileAPI.createFile(output, buffer);

    return output;
  }

  /**
   * Apply a single annotation to the canvas
   */
  private async applyAnnotation(
    ctx: CanvasRenderingContext2D, { type: FileType.TEMPORARY });
    } else if (annotation.style === 'dotted') {
      ctx.setLineDash([2, 2]);
    }

    switch (annotation.type) {
      case 'box':
        this.drawBox(ctx, annotation);
        break;
      case 'circle':
        this.drawCircle(ctx, annotation);
        break;
      case 'arrow':
        this.drawArrow(ctx, annotation);
        break;
      case 'text':
        this.drawText(ctx, annotation);
        break;
      case "highlight":
        this.drawHighlight(ctx, annotation);
        break;
      case 'blur':
        this.drawBlur(ctx, annotation);
        break;
      case 'number':
        this.drawNumberedMarker(ctx, annotation);
        break;
    }

    ctx.restore();
  }

  /**
   * Draw a box annotation
   */
  private async drawBox(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
    if (!annotation.width || !annotation.height) return;

    ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
    
    // Add semi-transparent fill if specified
    if (annotation.backgroundColor) {
      ctx.globalAlpha = 0.2;
      ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
    }
  }

  /**
   * Draw a circle annotation
   */
  private async drawCircle(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
    const radius = annotation.radius || 20;
    
    ctx.beginPath();
    ctx.arc(annotation.x, annotation.y, radius, 0, 2 * Math.PI);
    ctx.stroke();

    if (annotation.backgroundColor) {
      ctx.globalAlpha = 0.2;
      ctx.fill();
    }
  }

  /**
   * Draw an arrow annotation
   */
  private async drawArrow(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
    if (!annotation.arrowEnd) return;

    const { x: startX, y: startY } = annotation;
    const { x: endX, y: endY } = annotation.arrowEnd;

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Calculate arrowhead
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowSize = this.defaultStyle.arrowSize;

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  /**
   * Draw text annotation
   */
  private async drawText(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
    if (!annotation.text) return;

    const fontSize = annotation.fontSize || this.defaultStyle.fontSize;
    const fontFamily = annotation.fontFamily || this.defaultStyle.fontFamily;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = annotation.color || this.defaultStyle.textColor;

    // Add background if specified
    if (annotation.backgroundColor) {
      const metrics = ctx.measureText(annotation.text);
      const padding = 4;
      
      ctx.fillStyle = annotation.backgroundColor;
      ctx.fillRect(
        annotation.x - padding,
        annotation.y - fontSize - padding,
        metrics.width + padding * 2,
        fontSize + padding * 2
      );
      
      ctx.fillStyle = annotation.color || this.defaultStyle.textColor;
    }

    ctx.fillText(annotation.text, annotation.x, annotation.y);
  }

  /**
   * Draw highlight overlay
   */
  private async drawHighlight(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
    if (!annotation.width || !annotation.height) return;

    ctx.fillStyle = annotation.color || this.defaultStyle.highlightColor;
    ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
  }

  /**
   * Draw blur effect (simplified - just overlay)
   */
  private async drawBlur(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
    if (!annotation.width || !annotation.height) return;

    // In production, use proper blur filter
    // This is a simplified version using semi-transparent overlay
    ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
    ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
  }

  /**
   * Draw numbered marker
   */
  private async drawNumberedMarker(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
    const number = annotation.number || 1;
    const radius = this.defaultStyle.numberCircleRadius;

    // Draw circle
    ctx.beginPath();
    ctx.arc(annotation.x, annotation.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = annotation.backgroundColor || '#FF0000';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw number
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${radius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), annotation.x, annotation.y);
  }

  /**
   * Create step-by-step annotations
   */
  async createStepByStep(
    imagePath: string,
    steps: Array<{
      annotation: Annotation;
      description?: string;
    }>,
    outputDir: string
  ): Promise<Array<{ path: string; description?: string }>> {
    const results: Array<{ path: string; description?: string }> = [];
    const annotations: Annotation[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Add number marker if not already numbered
      if (step.annotation.type !== 'number') {
        annotations.push({
          type: 'number',
          x: step.annotation.x,
          y: step.annotation.y,
          number: i + 1,
          backgroundColor: '#007BFF'
        });
      }
      
      annotations.push(step.annotation);

      const outputPath = path.join(outputDir, `step_${i + 1}.png`);
      await this.annotate(imagePath, annotations, outputPath);
      
      results.push({
        path: outputPath,
        description: step.description
      });
    }

    return results;
  }

  /**
   * Create comparison annotations (before/after)
   */
  async createComparison(
    beforePath: string,
    afterPath: string,
    annotations: {
      before: Annotation[];
      after: Annotation[];
    },
    outputPath: string
  ): Promise<string> {
    // Load both images
    const beforeImage = await loadImage(beforePath);
    const afterImage = await loadImage(afterPath);

    // Create canvas for side-by-side comparison
    const totalWidth = beforeImage.width + afterImage.width + 20; // 20px gap
    const maxHeight = Math.max(beforeImage.height, afterImage.height);
    const canvas = createCanvas(totalWidth, maxHeight + 40); // 40px for labels
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, maxHeight + 40);

    // Draw labels
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Before', beforeImage.width / 2, 30);
    ctx.fillText('After', beforeImage.width + 20 + afterImage.width / 2, 30);

    // Draw images
    ctx.drawImage(beforeImage, 0, 40);
    ctx.drawImage(afterImage, beforeImage.width + 20, 40);

    // Apply annotations to before image area
    ctx.save();
    ctx.translate(0, 40);
    for (const annotation of annotations.before) {
      await this.applyAnnotation(ctx, annotation);
    }
    ctx.restore();

    // Apply annotations to after image area
    ctx.save();
    ctx.translate(beforeImage.width + 20, 40);
    for (const annotation of annotations.after) {
      await this.applyAnnotation(ctx, annotation);
    }
    ctx.restore();

    // Save the comparison image
    const buffer = canvas.toBuffer('image/png');
    await fileAPI.createFile(outputPath, buffer);

    return outputPath;
  }

  /**
   * Generate output path for annotated image
   */
  private async generateOutputPath(imagePath: string): string {
    const dir = path.dirname(imagePath);
    const ext = path.extname(imagePath);
    const base = path.basename(imagePath, { type: FileType.TEMPORARY });
  }

  /**
   * Batch annotate multiple images
   */
  async batchAnnotate(
    tasks: Array<{
      imagePath: string;
      annotations: Annotation[];
      outputPath?: string;
    }>
  ): Promise<string[]> {
    const results: string[] = [];

    for (const task of tasks) {
      const result = await this.annotate(
        task.imagePath,
        task.annotations,
        task.outputPath
      );
      results.push(result);
    }

    return results;
  }
}