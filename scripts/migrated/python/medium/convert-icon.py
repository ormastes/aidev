#!/usr/bin/env python3
"""
Migrated from: convert-icon.sh
Auto-generated Python - 2025-08-16T04:57:27.623Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Convert SVG icon to PNG format for VS Code extension
    # Check if ImageMagick is installed
    subprocess.run("if ! command -v convert &> /dev/null; then", shell=True)
    print("ImageMagick is not installed. Please install it first:")
    print("  macOS: brew install imagemagick")
    print("  Ubuntu/Debian: sudo apt-get install imagemagick")
    print("  Windows: Download from https://imagemagick.org/script/download.php")
    sys.exit(1)
    # Convert icon.svg to icon.png at different sizes
    print("Converting icon.svg to PNG format...")
    # Main extension icon (256x256)
    subprocess.run("convert -background none -density 300 -resize 256x256 icon.svg icon.png", shell=True)
    print("Created icon.png (256x256)")
    # Create smaller versions if needed
    subprocess.run("convert -background none -density 300 -resize 128x128 icon.svg icon-128.png", shell=True)
    print("Created icon-128.png (128x128)")
    subprocess.run("convert -background none -density 300 -resize 64x64 icon.svg icon-64.png", shell=True)
    print("Created icon-64.png (64x64)")
    subprocess.run("convert -background none -density 300 -resize 32x32 icon.svg icon-32.png", shell=True)
    print("Created icon-32.png (32x32)")
    print("Icon conversion complete!")

if __name__ == "__main__":
    main()