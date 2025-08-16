/**
 * Screenshot Integration System
 * Export all screenshot-related components
 */

export { ScreenshotCapture } from './ScreenshotCapture';
export type { ScreenshotOptions, AnnotationOptions, CaptureResult } from './ScreenshotCapture';

export { ImageAnnotator } from './ImageAnnotator';
export type { Annotation, AnnotationStyle } from './ImageAnnotator';

export { ImageOptimizer } from './ImageOptimizer';
export type { OptimizationOptions, OptimizationResult, BatchOptimizationOptions } from './ImageOptimizer';

export { GalleryGenerator } from './GalleryGenerator';
export type { GalleryOptions, GalleryImage, GallerySection } from './GalleryGenerator';

// Re-export as default namespace
import { ScreenshotCapture } from './ScreenshotCapture';
import { ImageAnnotator } from './ImageAnnotator';
import { ImageOptimizer } from './ImageOptimizer';
import { GalleryGenerator } from './GalleryGenerator';

export default {
  ScreenshotCapture,
  ImageAnnotator,
  ImageOptimizer,
  GalleryGenerator
};