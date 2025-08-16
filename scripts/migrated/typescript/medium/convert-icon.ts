#!/usr/bin/env bun
/**
 * Migrated from: convert-icon.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.622Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Convert SVG icon to PNG format for VS Code extension
  // Check if ImageMagick is installed
  await $`if ! command -v convert &> /dev/null; then`;
  console.log("ImageMagick is not installed. Please install it first:");
  console.log("  macOS: brew install imagemagick");
  console.log("  Ubuntu/Debian: sudo apt-get install imagemagick");
  console.log("  Windows: Download from https://imagemagick.org/script/download.php");
  process.exit(1);
  }
  // Convert icon.svg to icon.png at different sizes
  console.log("Converting icon.svg to PNG format...");
  // Main extension icon (256x256)
  await $`convert -background none -density 300 -resize 256x256 icon.svg icon.png`;
  console.log("Created icon.png (256x256)");
  // Create smaller versions if needed
  await $`convert -background none -density 300 -resize 128x128 icon.svg icon-128.png`;
  console.log("Created icon-128.png (128x128)");
  await $`convert -background none -density 300 -resize 64x64 icon.svg icon-64.png`;
  console.log("Created icon-64.png (64x64)");
  await $`convert -background none -density 300 -resize 32x32 icon.svg icon-32.png`;
  console.log("Created icon-32.png (32x32)");
  console.log("Icon conversion complete!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}