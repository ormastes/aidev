/**
 * Screenshot Integration Demo
 * Demonstrates the screenshot capture, annotation, optimization, and gallery generation features
 */

import {
  ScreenshotCapture,
  ImageAnnotator,
  ImageOptimizer,
  GalleryGenerator
} from '../src/screenshot';

async function demonstrateScreenshotCapture() {
  console.log('📸 Screenshot Capture Demo\n');
  
  const capture = new ScreenshotCapture('./screenshots');
  
  try {
    // Initialize with Chrome browser
    await capture.initialize({
      headless: false, // Set to true for CI/CD
      viewport: { width: 1920, height: 1080 }
    });
    
    // Create a page and navigate
    const page = await capture.createPage();
    await page.goto('https://example.com');
    
    // 1. Basic screenshot
    console.log('1. Capturing basic screenshot...');
    const basic = await capture.capture(page, 'basic-screenshot');
    console.log(`   ✓ Saved to: ${basic.path}`);
    
    // 2. Screenshot with highlights
    console.log('2. Capturing with highlights...');
    const highlighted = await capture.capture(page, 'highlighted', {
      highlight: ['h1', 'p'],
      fullPage: true
    });
    console.log(`   ✓ Saved to: ${highlighted.path}`);
    
    // 3. Element screenshot
    console.log('3. Capturing specific element...');
    const element = await capture.capture(page, 'element', {
      selector: 'body',
      type: 'png'
    });
    console.log(`   ✓ Saved to: ${element.path}`);
    
    // 4. Capture sequence
    console.log('4. Capturing sequence of actions...');
    const sequence = await capture.captureSequence(page, [
      {
        name: 'initial-state',
        options: { fullPage: false }
      },
      {
        name: 'after-scroll',
        action: async () => {
          await page.evaluate(() => window.scrollTo(0, 500));
        },
        options: { fullPage: false }
      }
    ]);
    console.log(`   ✓ Captured ${sequence.length} screenshots`);
    
    // 5. Responsive captures
    console.log('5. Capturing responsive views...');
    const responsive = await capture.captureResponsive(
      'https://example.com',
      'responsive',
      [
        { width: 375, height: 812, label: 'iphone-x' },
        { width: 768, height: 1024, label: 'ipad' },
        { width: 1920, height: 1080, label: 'desktop' }
      ]
    );
    console.log(`   ✓ Captured ${responsive.length} responsive views`);
    
    // Export metadata
    await capture.exportMetadata('./screenshots/metadata.json');
    console.log('   ✓ Exported metadata to metadata.json');
    
    return capture.getCaptures();
  } finally {
    await capture.cleanup();
  }
}

async function demonstrateImageAnnotation() {
  console.log('\n✏️ Image Annotation Demo\n');
  
  const annotator = new ImageAnnotator({
    defaultColor: '#FF5722',
    fontSize: 18,
    lineWidth: 3
  });
  
  // Assuming we have a screenshot from the previous demo
  const imagePath = './screenshots/basic-screenshot.png';
  
  try {
    // 1. Multiple annotations
    console.log('1. Adding multiple annotations...');
    const annotated = await annotator.annotate(imagePath, [
      {
        type: 'box',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        color: '#FF0000',
        style: 'dashed'
      },
      {
        type: 'arrow',
        x: 350,
        y: 150,
        arrowEnd: { x: 500, y: 200 },
        color: '#00FF00'
      },
      {
        type: 'text',
        x: 550,
        y: 150,
        text: 'Important Feature!',
        color: '#0000FF',
        backgroundColor: '#FFFF00',
        fontSize: 24
      },
      {
        type: 'circle',
        x: 200,
        y: 300,
        radius: 50,
        color: '#FF00FF',
        backgroundColor: 'rgba(255, 0, 255, 0.2)'
      },
      {
        type: 'number',
        x: 400,
        y: 300,
        number: 1,
        backgroundColor: '#007BFF'
      }
    ]);
    console.log(`   ✓ Saved annotated image to: ${annotated}`);
    
    // 2. Step-by-step annotations
    console.log('2. Creating step-by-step guide...');
    const steps = await annotator.createStepByStep(
      imagePath,
      [
        {
          annotation: { type: 'box', x: 100, y: 100, width: 150, height: 50 },
          description: 'Click the login button'
        },
        {
          annotation: { type: 'arrow', x: 300, y: 200, arrowEnd: { x: 400, y: 250 } },
          description: 'Enter your credentials'
        },
        {
          annotation: { type: 'circle', x: 500, y: 300, radius: 30 },
          description: 'Submit the form'
        }
      ],
      './screenshots/steps'
    );
    console.log(`   ✓ Created ${steps.length} step images`);
    
    // 3. Batch annotation
    console.log('3. Batch annotating images...');
    const batchResults = await annotator.batchAnnotate([
      {
        imagePath,
        annotations: [{ type: 'text', x: 50, y: 50, text: 'Version 1' }],
        outputPath: './screenshots/v1_annotated.png'
      },
      {
        imagePath,
        annotations: [{ type: 'text', x: 50, y: 50, text: 'Version 2' }],
        outputPath: './screenshots/v2_annotated.png'
      }
    ]);
    console.log(`   ✓ Batch annotated ${batchResults.length} images`);
    
  } catch (error) {
    console.error('   ✗ Annotation failed:', error);
  }
}

async function demonstrateImageOptimization() {
  console.log('\n🎨 Image Optimization Demo\n');
  
  const optimizer = new ImageOptimizer({
    quality: 85,
    format: 'jpeg',
    maxWidth: 1920
  });
  
  const imagePath = './screenshots/basic-screenshot.png';
  
  try {
    // 1. Basic optimization
    console.log('1. Basic optimization...');
    const optimized = await optimizer.optimize(imagePath);
    console.log(`   ✓ Original: ${(optimized.originalSize / 1024).toFixed(2)}KB`);
    console.log(`   ✓ Optimized: ${(optimized.optimizedSize / 1024).toFixed(2)}KB`);
    console.log(`   ✓ Reduction: ${optimized.reductionPercentage.toFixed(1)}%`);
    
    // 2. Auto-optimization
    console.log('2. Auto-optimization based on image characteristics...');
    const auto = await optimizer.autoOptimize(imagePath);
    console.log(`   ✓ Format chosen: ${auto.format}`);
    console.log(`   ✓ Size reduction: ${auto.reductionPercentage.toFixed(1)}%`);
    
    // 3. Create responsive variants
    console.log('3. Creating responsive variants...');
    const variants = await optimizer.createResponsiveVariants(
      imagePath,
      './screenshots/responsive',
      [320, 640, 1024, 1920]
    );
    console.log(`   ✓ Created ${variants.length} responsive variants`);
    
    // 4. Create thumbnail
    console.log('4. Creating thumbnail...');
    const thumbnail = await optimizer.createThumbnail(imagePath, undefined, 200);
    console.log(`   ✓ Thumbnail saved to: ${thumbnail.optimizedPath}`);
    
    // 5. Analyze optimization potential
    console.log('5. Analyzing optimization potential...');
    const analysis = await optimizer.analyzeOptimizationPotential(imagePath);
    console.log(`   ✓ Current size: ${(analysis.currentSize / 1024).toFixed(2)}KB`);
    console.log('   ✓ Estimated sizes:');
    for (const [format, size] of Object.entries(analysis.estimatedSizes)) {
      console.log(`     - ${format}: ${(size / 1024).toFixed(2)}KB`);
    }
    console.log('   ✓ Recommendations:');
    analysis.recommendations.forEach(rec => {
      console.log(`     - ${rec}`);
    });
    
    // 6. Get statistics
    const stats = await optimizer.getStatistics(variants);
    console.log('\n   📊 Optimization Statistics:');
    console.log(`   Total original: ${(stats.totalOriginalSize / 1024).toFixed(2)}KB`);
    console.log(`   Total optimized: ${(stats.totalOptimizedSize / 1024).toFixed(2)}KB`);
    console.log(`   Average reduction: ${stats.averageReductionPercentage.toFixed(1)}%`);
    
  } catch (error) {
    console.error('   ✗ Optimization failed:', error);
  }
}

async function demonstrateGalleryGeneration(captures: any[]) {
  console.log('\n🖼️ Gallery Generation Demo\n');
  
  const generator = new GalleryGenerator({
    layout: 'grid',
    columns: 3,
    enableLightbox: true,
    showCaptions: true,
    theme: 'light'
  });
  
  try {
    // Prepare gallery images
    const images = captures.map((capture, index) => ({
      path: capture.path,
      caption: `Screenshot ${index + 1}`,
      description: capture.metadata.url || 'Test screenshot',
      metadata: {
        timestamp: capture.timestamp,
        browser: capture.metadata.browser,
        viewport: capture.metadata.viewport
      }
    }));
    
    // 1. HTML Grid Gallery
    console.log('1. Generating HTML grid gallery...');
    await generator.generateHTML(images, './screenshots/gallery-grid.html', {
      title: 'Test Screenshots Gallery',
      description: 'Collection of test screenshots with various layouts',
      layout: 'grid',
      columns: 3
    });
    console.log('   ✓ Generated gallery-grid.html');
    
    // 2. HTML Carousel Gallery
    console.log('2. Generating HTML carousel gallery...');
    await generator.generateHTML(images, './screenshots/gallery-carousel.html', {
      title: 'Carousel Gallery',
      layout: 'carousel',
      enableZoom: true
    });
    console.log('   ✓ Generated gallery-carousel.html');
    
    // 3. HTML Comparison Gallery
    console.log('3. Generating HTML comparison gallery...');
    await generator.generateHTML(images, './screenshots/gallery-comparison.html', {
      title: 'Before/After Comparison',
      layout: 'comparison'
    });
    console.log('   ✓ Generated gallery-comparison.html');
    
    // 4. Markdown Gallery
    console.log('4. Generating Markdown gallery...');
    await generator.generateMarkdown(images, './screenshots/gallery.md', {
      title: 'Screenshot Documentation',
      description: 'Automated test screenshots for documentation',
      showMetadata: true
    });
    console.log('   ✓ Generated gallery.md');
    
    // 5. Gallery from captures
    console.log('5. Generating gallery directly from captures...');
    await generator.generateFromCaptures(
      captures,
      './screenshots/captures-gallery.html',
      'html',
      {
        title: 'Automated Test Captures',
        layout: 'list',
        showMetadata: true
      }
    );
    console.log('   ✓ Generated captures-gallery.html');
    
  } catch (error) {
    console.error('   ✗ Gallery generation failed:', error);
  }
}

// Main demo function
async function runDemo() {
  console.log('========================================');
  console.log('  Screenshot Integration System Demo');
  console.log('========================================\n');
  
  try {
    // Run screenshot capture demo
    const captures = await demonstrateScreenshotCapture();
    
    // Run annotation demo
    await demonstrateImageAnnotation();
    
    // Run optimization demo
    await demonstrateImageOptimization();
    
    // Run gallery generation demo
    await demonstrateGalleryGeneration(captures);
    
    console.log('\n✅ Demo completed successfully!');
    console.log('Check the ./screenshots directory for all generated files.');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };