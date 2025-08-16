/**
 * ImageOptimizer - Optimize images for file size and quality
 * Reduces file sizes while maintaining visual quality for documentation
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import sharp from 'sharp';

export interface OptimizationOptions {
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  maxWidth?: number;
  maxHeight?: number;
  compressionLevel?: number;
  progressive?: boolean;
  mozjpeg?: boolean;
  effort?: number;
  lossless?: boolean;
}

export interface OptimizationResult {
  originalPath: string;
  optimizedPath: string;
  originalSize: number;
  optimizedSize: number;
  reduction: number;
  reductionPercentage: number;
  format: string;
  dimensions: {
    original: { width: number; height: number };
    optimized: { width: number; height: number };
  };
}

export interface BatchOptimizationOptions extends OptimizationOptions {
  outputDir?: string;
  prefix?: string;
  suffix?: string;
  preserveOriginal?: boolean;
}

export class ImageOptimizer {
  private defaultOptions: OptimizationOptions = {
    quality: 85,
    format: 'jpeg',
    maxWidth: 1920,
    maxHeight: 1080,
    compressionLevel: 9,
    progressive: true,
    mozjpeg: true,
    effort: 4,
    lossless: false
  };

  constructor(defaultOptions?: Partial<OptimizationOptions>) {
    if (defaultOptions) {
      this.defaultOptions = { ...this.defaultOptions, ...defaultOptions };
    }
  }

  /**
   * Optimize a single image
   */
  async optimize(
    imagePath: string,
    outputPath?: string,
    options?: OptimizationOptions
  ): Promise<OptimizationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const output = outputPath || this.generateOutputPath(imagePath, opts.format);

    // Get original file size
    const originalStats = await fs.stat(imagePath);
    const originalSize = originalStats.size;

    // Get original image metadata
    const metadata = await sharp(imagePath).metadata();
    const originalDimensions = {
      width: metadata.width || 0,
      height: metadata.height || 0
    };

    // Create sharp instance
    let pipeline = sharp(imagePath);

    // Resize if needed
    if (opts.maxWidth || opts.maxHeight) {
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Apply format-specific optimizations
    switch (opts.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality: opts.quality,
          progressive: opts.progressive,
          mozjpeg: opts.mozjpeg
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          compressionLevel: opts.compressionLevel,
          progressive: opts.progressive,
          effort: opts.effort
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({
          quality: opts.quality,
          lossless: opts.lossless,
          effort: opts.effort
        });
        break;
      case 'avif':
        pipeline = pipeline.avif({
          quality: opts.quality,
          lossless: opts.lossless,
          effort: opts.effort
        });
        break;
    }

    // Save optimized image
    await pipeline.toFile(output);

    // Get optimized file size and dimensions
    const optimizedStats = await fs.stat(output);
    const optimizedSize = optimizedStats.size;
    const optimizedMetadata = await sharp(output).metadata();
    const optimizedDimensions = {
      width: optimizedMetadata.width || 0,
      height: optimizedMetadata.height || 0
    };

    // Calculate reduction
    const reduction = originalSize - optimizedSize;
    const reductionPercentage = (reduction / originalSize) * 100;

    return {
      originalPath: imagePath,
      optimizedPath: output,
      originalSize,
      optimizedSize,
      reduction,
      reductionPercentage,
      format: opts.format!,
      dimensions: {
        original: originalDimensions,
        optimized: optimizedDimensions
      }
    };
  }

  /**
   * Optimize multiple images in batch
   */
  async batchOptimize(
    imagePaths: string[],
    options?: BatchOptimizationOptions
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    for (const imagePath of imagePaths) {
      try {
        let outputPath: string | undefined;
        
        if (options?.outputDir) {
          const basename = path.basename(imagePath, path.extname(imagePath));
          const prefix = options.prefix || '';
          const suffix = options.suffix || '';
          const ext = `.${options.format || this.defaultOptions.format}`;
          outputPath = path.join(options.outputDir, `${prefix}${basename}${suffix}${ext}`);
        }

        const result = await this.optimize(imagePath, outputPath, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to optimize ${imagePath}:`, error);
      }
    }

    return results;
  }

  /**
   * Auto-optimize based on image characteristics
   */
  async autoOptimize(imagePath: string, outputPath?: string): Promise<OptimizationResult> {
    const metadata = await sharp(imagePath).metadata();
    const options: OptimizationOptions = {};

    // Choose format based on image characteristics
    if (metadata.channels === 4 || metadata.density) {
      // Has alpha channel or is vector - use PNG
      options.format = 'png';
      options.compressionLevel = 9;
    } else if ((metadata.width || 0) > 2000 || (metadata.height || 0) > 2000) {
      // Large image - use progressive JPEG with more compression
      options.format = 'jpeg';
      options.quality = 75;
      options.progressive = true;
      options.mozjpeg = true;
    } else {
      // Standard image - use WebP for better compression
      options.format = 'webp';
      options.quality = 85;
    }

    // Limit dimensions for very large images
    if ((metadata.width || 0) > 3000) {
      options.maxWidth = 2560;
    }
    if ((metadata.height || 0) > 3000) {
      options.maxHeight = 1440;
    }

    return this.optimize(imagePath, outputPath, options);
  }

  /**
   * Create responsive image variants
   */
  async createResponsiveVariants(
    imagePath: string,
    outputDir: string,
    sizes: number[] = [320, 640, 1024, 1920]
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    const basename = path.basename(imagePath, path.extname(imagePath));

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `${basename}-${size}w.jpg`);
      const result = await this.optimize(imagePath, outputPath, {
        maxWidth: size,
        format: 'jpeg',
        quality: 85,
        progressive: true
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Create thumbnail
   */
  async createThumbnail(
    imagePath: string,
    outputPath?: string,
    size: number = 200
  ): Promise<OptimizationResult> {
    const output = outputPath || this.generateThumbnailPath(imagePath);
    
    return this.optimize(imagePath, output, {
      maxWidth: size,
      maxHeight: size,
      format: 'jpeg',
      quality: 80
    });
  }

  /**
   * Convert image format
   */
  async convert(
    imagePath: string,
    format: 'jpeg' | 'png' | 'webp' | 'avif',
    outputPath?: string
  ): Promise<OptimizationResult> {
    return this.optimize(imagePath, outputPath, { format });
  }

  /**
   * Analyze optimization potential
   */
  async analyzeOptimizationPotential(imagePath: string): Promise<{
    currentSize: number;
    estimatedSizes: Record<string, number>;
    recommendations: string[];
  }> {
    const stats = await fs.stat(imagePath);
    const currentSize = stats.size;
    const metadata = await sharp(imagePath).metadata();

    const estimatedSizes: Record<string, number> = {};
    const recommendations: string[] = [];

    // Test different formats
    const formats: Array<'jpeg' | 'png' | 'webp' | 'avif'> = ['jpeg', 'png', 'webp', 'avif'];
    
    for (const format of formats) {
      try {
        const tempPath = path.join('/tmp', `test.${format}`);
        await this.optimize(imagePath, tempPath, { format });
        const tempStats = await fs.stat(tempPath);
        estimatedSizes[format] = tempStats.size;
        await fs.unlink(tempPath);
      } catch (error) {
        // Skip if format not supported
      }
    }

    // Generate recommendations
    if ((metadata.width || 0) > 2000 || (metadata.height || 0) > 2000) {
      recommendations.push('Consider resizing - image is very large');
    }

    const smallestFormat = Object.entries(estimatedSizes)
      .sort(([, a], [, b]) => a - b)[0];
    
    if (smallestFormat && smallestFormat[1] < currentSize * 0.8) {
      recommendations.push(`Convert to ${smallestFormat[0]} for ${Math.round((1 - smallestFormat[1] / currentSize) * 100)}% size reduction`);
    }

    if (metadata.density && (metadata.density > 72)) {
      recommendations.push('Reduce DPI to 72 for web use');
    }

    return {
      currentSize,
      estimatedSizes,
      recommendations
    };
  }

  /**
   * Generate output path
   */
  private generateOutputPath(imagePath: string, format?: string): string {
    const dir = path.dirname(imagePath);
    const ext = format ? `.${format}` : path.extname(imagePath);
    const base = path.basename(imagePath, path.extname(imagePath));
    return path.join(dir, `${base}_optimized${ext}`);
  }

  /**
   * Generate thumbnail path
   */
  private generateThumbnailPath(imagePath: string): string {
    const dir = path.dirname(imagePath);
    const base = path.basename(imagePath, path.extname(imagePath));
    return path.join(dir, `${base}_thumb.jpg`);
  }

  /**
   * Get optimization statistics
   */
  async getStatistics(results: OptimizationResult[]): Promise<{
    totalOriginalSize: number;
    totalOptimizedSize: number;
    totalReduction: number;
    averageReductionPercentage: number;
    bestOptimization: OptimizationResult | null;
    worstOptimization: OptimizationResult | null;
  }> {
    if (results.length === 0) {
      return {
        totalOriginalSize: 0,
        totalOptimizedSize: 0,
        totalReduction: 0,
        averageReductionPercentage: 0,
        bestOptimization: null,
        worstOptimization: null
      };
    }

    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimizedSize = results.reduce((sum, r) => sum + r.optimizedSize, 0);
    const totalReduction = totalOriginalSize - totalOptimizedSize;
    const averageReductionPercentage = (totalReduction / totalOriginalSize) * 100;

    const sortedByReduction = [...results].sort((a, b) => b.reductionPercentage - a.reductionPercentage);
    const bestOptimization = sortedByReduction[0];
    const worstOptimization = sortedByReduction[sortedByReduction.length - 1];

    return {
      totalOriginalSize,
      totalOptimizedSize,
      totalReduction,
      averageReductionPercentage,
      bestOptimization,
      worstOptimization
    };
  }
}