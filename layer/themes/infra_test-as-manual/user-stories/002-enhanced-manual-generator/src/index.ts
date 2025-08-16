/**
 * Enhanced Manual Generator - Main Entry Point
 * Exports all core components and utilities
 */

// Core components
export { ManualGenerator } from './core/ManualGenerator';
export { TestParser } from './core/TestParser';
export { TemplateEngine } from './core/TemplateEngine';
export { MetadataExtractor } from './core/MetadataExtractor';
export { DocumentBuilder } from './core/DocumentBuilder';

// Scanner components
export { ThemeScanner } from './scanner/ThemeScanner';
export { TestDiscovery } from './scanner/TestDiscovery';
export { ThemeRegistry } from './scanner/ThemeRegistry';
export { TestCategorizer } from './scanner/TestCategorizer';

// Screenshot components
export { ScreenshotCapture } from './screenshot/ScreenshotCapture';
export { ImageAnnotator } from './screenshot/ImageAnnotator';
export { ImageOptimizer } from './screenshot/ImageOptimizer';
export { GalleryGenerator } from './screenshot/GalleryGenerator';

// Types
export * from './core/types';
export * from './scanner';
export * from './screenshot';

// Default export
import { ManualGenerator } from './core/ManualGenerator';
export default ManualGenerator;