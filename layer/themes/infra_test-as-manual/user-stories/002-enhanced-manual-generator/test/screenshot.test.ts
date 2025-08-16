/**
 * Screenshot Integration System Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';
import {
  ScreenshotCapture,
  ImageAnnotator,
  ImageOptimizer,
  GalleryGenerator
} from '../src/screenshot';

// Mock playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          screenshot: jest.fn(),
          title: jest.fn().mockResolvedValue('Test Page'),
          url: jest.fn().mockReturnValue('https://example.com'),
          viewportSize: jest.fn().mockReturnValue({ width: 1280, height: 720 }),
          evaluate: jest.fn().mockResolvedValue('Mozilla/5.0'),
          waitForSelector: jest.fn(),
          waitForLoadState: jest.fn(),
          $: jest.fn().mockResolvedValue({
            screenshot: jest.fn()
          })
        }),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  },
  firefox: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn(),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  },
  webkit: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn(),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  }
}));

// Mock canvas
jest.mock('canvas', () => ({
  createCanvas: jest.fn().mockReturnValue({
    getContext: jest.fn().mockReturnValue({
      drawImage: jest.fn(),
      strokeRect: jest.fn(),
      fillRect: jest.fn(),
      arc: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
      save: jest.fn(),
      restore: jest.fn(),
      setLineDash: jest.fn()
    }),
    toBuffer: jest.fn().mockReturnValue(Buffer.from('mock-image-data'))
  }),
  loadImage: jest.fn().mockResolvedValue({
    width: 1920,
    height: 1080
  })
}));

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      channels: 3,
      density: 72
    }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    avif: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined)
  }));
});

describe('ScreenshotCapture', () => {
  let capture: ScreenshotCapture;
  const testOutputDir = '/tmp/test-screenshots';

  beforeEach(async () => {
    capture = new ScreenshotCapture(testOutputDir);
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    await capture.cleanup();
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should initialize browser and context', async () => {
      await capture.initialize({
        headless: true,
        viewport: { width: 1920, height: 1080 }
      });

      // Verify initialization
      expect(capture).toBeDefined();
    });

    it('should create output directory if it does not exist', async () => {
      const customDir = '/tmp/custom-screenshots';
      const customCapture = new ScreenshotCapture(customDir);
      
      await customCapture.initialize();
      
      const dirExists = await fs.access(customDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
      
      await customCapture.cleanup();
      await fs.rm(customDir, { recursive: true });
    });
  });

  describe('capture', () => {
    it('should capture a screenshot', async () => {
      await capture.initialize();
      const page = await capture.createPage();
      
      const result = await capture.capture(page, 'test-screenshot');
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.url).toBe('https://example.com');
    });

    it('should apply highlights to elements', async () => {
      await capture.initialize();
      const page = await capture.createPage();
      
      const result = await capture.capture(page, 'highlighted', {
        highlight: ['.button', '.input']
      });
      
      expect(result).toBeDefined();
    });

    it('should capture element by selector', async () => {
      await capture.initialize();
      const page = await capture.createPage();
      
      const result = await capture.capture(page, 'element', {
        selector: '.main-content'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('captureSequence', () => {
    it('should capture multiple screenshots in sequence', async () => {
      await capture.initialize();
      const page = await capture.createPage();
      
      const results = await capture.captureSequence(page, [
        { name: 'step1' },
        { name: 'step2', action: async () => { /* navigate */ } },
        { name: 'step3' }
      ]);
      
      expect(results).toHaveLength(3);
      expect(results[0].metadata.testName).toBeUndefined();
    });
  });

  describe('captureResponsive', () => {
    it('should capture screenshots at different viewports', async () => {
      await capture.initialize();
      
      const results = await capture.captureResponsive(
        'https://example.com',
        'responsive-test',
        [
          { width: 320, height: 568, label: 'mobile' },
          { width: 768, height: 1024, label: 'tablet' },
          { width: 1920, height: 1080, label: 'desktop' }
        ]
      );
      
      expect(results).toHaveLength(3);
    });
  });
});

describe('ImageAnnotator', () => {
  let annotator: ImageAnnotator;
  const testImagePath = '/tmp/test-image.png';
  
  beforeEach(async () => {
    annotator = new ImageAnnotator();
    // Create a mock image file
    await fs.writeFile(testImagePath, Buffer.from('mock-image-data'));
  });

  afterEach(async () => {
    try {
      await fs.unlink(testImagePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('annotate', () => {
    it('should add box annotation', async () => {
      const outputPath = await annotator.annotate(testImagePath, [
        {
          type: 'box',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          color: '#FF0000'
        }
      ]);
      
      expect(outputPath).toContain('_annotated');
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      await fs.unlink(outputPath);
    });

    it('should add arrow annotation', async () => {
      const outputPath = await annotator.annotate(testImagePath, [
        {
          type: 'arrow',
          x: 100,
          y: 100,
          arrowEnd: { x: 200, y: 200 },
          color: '#00FF00'
        }
      ]);
      
      expect(outputPath).toBeDefined();
      await fs.unlink(outputPath);
    });

    it('should add text annotation', async () => {
      const outputPath = await annotator.annotate(testImagePath, [
        {
          type: 'text',
          x: 100,
          y: 100,
          text: 'Important!',
          color: '#0000FF',
          fontSize: 24
        }
      ]);
      
      expect(outputPath).toBeDefined();
      await fs.unlink(outputPath);
    });

    it('should add numbered markers', async () => {
      const outputPath = await annotator.annotate(testImagePath, [
        {
          type: 'number',
          x: 100,
          y: 100,
          number: 1,
          backgroundColor: '#FF0000'
        },
        {
          type: 'number',
          x: 200,
          y: 200,
          number: 2,
          backgroundColor: '#00FF00'
        }
      ]);
      
      expect(outputPath).toBeDefined();
      await fs.unlink(outputPath);
    });
  });

  describe('createStepByStep', () => {
    it('should create step-by-step annotated images', async () => {
      const outputDir = '/tmp/steps';
      await fs.mkdir(outputDir, { recursive: true });
      
      const results = await annotator.createStepByStep(
        testImagePath,
        [
          {
            annotation: { type: 'box', x: 100, y: 100, width: 100, height: 100 },
            description: 'Step 1: Click here'
          },
          {
            annotation: { type: 'arrow', x: 200, y: 200, arrowEnd: { x: 300, y: 300 } },
            description: 'Step 2: Drag to here'
          }
        ],
        outputDir
      );
      
      expect(results).toHaveLength(2);
      expect(results[0].description).toBe('Step 1: Click here');
      
      await fs.rm(outputDir, { recursive: true });
    });
  });
});

describe('ImageOptimizer', () => {
  let optimizer: ImageOptimizer;
  const testImagePath = '/tmp/test-image.png';
  
  beforeEach(async () => {
    optimizer = new ImageOptimizer();
    await fs.writeFile(testImagePath, Buffer.from('mock-image-data'));
  });

  afterEach(async () => {
    try {
      await fs.unlink(testImagePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('optimize', () => {
    it('should optimize image with default options', async () => {
      const result = await optimizer.optimize(testImagePath);
      
      expect(result).toHaveProperty('originalPath');
      expect(result).toHaveProperty('optimizedPath');
      expect(result).toHaveProperty('originalSize');
      expect(result).toHaveProperty('optimizedSize');
      expect(result).toHaveProperty('reduction');
      expect(result).toHaveProperty('reductionPercentage');
      
      await fs.unlink(result.optimizedPath);
    });

    it('should optimize with custom quality', async () => {
      const result = await optimizer.optimize(testImagePath, undefined, {
        quality: 60,
        format: 'jpeg'
      });
      
      expect(result.format).toBe('jpeg');
      await fs.unlink(result.optimizedPath);
    });

    it('should resize large images', async () => {
      const result = await optimizer.optimize(testImagePath, undefined, {
        maxWidth: 1024,
        maxHeight: 768
      });
      
      expect(result).toBeDefined();
      await fs.unlink(result.optimizedPath);
    });
  });

  describe('batchOptimize', () => {
    it('should optimize multiple images', async () => {
      const image2Path = '/tmp/test-image2.png';
      await fs.writeFile(image2Path, Buffer.from('mock-image-data-2'));
      
      const results = await optimizer.batchOptimize([testImagePath, image2Path]);
      
      expect(results).toHaveLength(2);
      
      for (const result of results) {
        await fs.unlink(result.optimizedPath);
      }
      await fs.unlink(image2Path);
    });
  });

  describe('createResponsiveVariants', () => {
    it('should create multiple size variants', async () => {
      const outputDir = '/tmp/responsive';
      await fs.mkdir(outputDir, { recursive: true });
      
      const results = await optimizer.createResponsiveVariants(
        testImagePath,
        outputDir,
        [320, 640, 1024]
      );
      
      expect(results).toHaveLength(3);
      
      await fs.rm(outputDir, { recursive: true });
    });
  });

  describe('createThumbnail', () => {
    it('should create thumbnail', async () => {
      const result = await optimizer.createThumbnail(testImagePath);
      
      expect(result.optimizedPath).toContain('_thumb');
      await fs.unlink(result.optimizedPath);
    });
  });
});

describe('GalleryGenerator', () => {
  let generator: GalleryGenerator;
  const testImages = [
    {
      path: '/tmp/image1.png',
      caption: 'Image 1',
      description: 'First test image'
    },
    {
      path: '/tmp/image2.png',
      caption: 'Image 2',
      description: 'Second test image'
    }
  ];

  beforeEach(() => {
    generator = new GalleryGenerator();
  });

  describe('generateHTML', () => {
    it('should generate HTML gallery with grid layout', async () => {
      const outputPath = '/tmp/gallery.html';
      
      await generator.generateHTML(testImages, outputPath, {
        title: 'Test Gallery',
        layout: 'grid',
        columns: 2
      });
      
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('Test Gallery');
      expect(content).toContain('gallery-grid');
      expect(content).toContain('Image 1');
      
      await fs.unlink(outputPath);
    });

    it('should generate HTML gallery with carousel layout', async () => {
      const outputPath = '/tmp/carousel.html';
      
      await generator.generateHTML(testImages, outputPath, {
        title: 'Carousel Gallery',
        layout: 'carousel'
      });
      
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('carousel-container');
      expect(content).toContain('carousel-slide');
      
      await fs.unlink(outputPath);
    });

    it('should generate HTML gallery with comparison layout', async () => {
      const outputPath = '/tmp/comparison.html';
      
      await generator.generateHTML(testImages, outputPath, {
        title: 'Comparison Gallery',
        layout: 'comparison'
      });
      
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('comparison-item');
      expect(content).toContain('Before');
      expect(content).toContain('After');
      
      await fs.unlink(outputPath);
    });
  });

  describe('generateMarkdown', () => {
    it('should generate Markdown gallery', async () => {
      const outputPath = '/tmp/gallery.md';
      
      await generator.generateMarkdown(testImages, outputPath, {
        title: 'Markdown Gallery',
        description: 'Test gallery in Markdown format'
      });
      
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('# Markdown Gallery');
      expect(content).toContain('![Image 1]');
      expect(content).toContain('First test image');
      
      await fs.unlink(outputPath);
    });

    it('should generate Markdown comparison gallery', async () => {
      const outputPath = '/tmp/comparison.md';
      
      await generator.generateMarkdown(testImages, outputPath, {
        title: 'Comparison',
        layout: 'comparison'
      });
      
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('| Before | After |');
      
      await fs.unlink(outputPath);
    });
  });

  describe('generateFromCaptures', () => {
    it('should generate gallery from capture results', async () => {
      const captures = [
        {
          id: 'cap1',
          path: '/tmp/capture1.png',
          timestamp: new Date(),
          metadata: {
            url: 'https://example.com',
            title: 'Test Page',
            browser: 'chromium'
          },
          size: 1024,
          dimensions: { width: 1920, height: 1080 }
        }
      ];
      
      const outputPath = '/tmp/captures.html';
      await generator.generateFromCaptures(captures, outputPath, 'html');
      
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('Test Page');
      
      await fs.unlink(outputPath);
    });
  });
});