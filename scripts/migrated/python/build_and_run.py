#!/usr/bin/env python3
"""
Migrated from: build_and_run.sh
Auto-generated Python script
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
import json
import re
import requests


#!/bin/bash
# Build and run Cucumber-CPP examples

echo " = '==========================================="'
print('  Building Cucumber-CPP Examples')
echo " = '==========================================="'

# Create build directory
Path('build').mkdir(parents=True, exist_ok=True)
os.chdir('build')

# Configure with CMake
print('Configuring with CMake...')
subprocess.run('cmake ..', shell=True)

# Build the examples
print('Building examples...')
subprocess.run('make -j4', shell=True)

print('')
echo " = '==========================================="'
print('  Running Simple Demo')
echo " = '==========================================="'
if Path('simple_demo').is_file():
subprocess.run('./simple_demo', shell=True)
subprocess.run('else', shell=True)
print('simple_demo not found, building separately...')
g++ -std = 'c++17 ../simple_demo.cpp ../../src/gherkin_parser.cpp ../../src/manual_generator.cpp -I../../include -o simple_demo'
subprocess.run('./simple_demo', shell=True)
subprocess.run('fi', shell=True)

print('')
echo " = '==========================================="'
print('  Running Manual Test Generator')
echo " = '==========================================="'
if Path('manual_test_example').is_file():
subprocess.run('./manual_test_example', shell=True)
subprocess.run('else', shell=True)
print('Manual test example not built')
subprocess.run('fi', shell=True)

print('')
echo " = '==========================================="'
print('  Generated Files')
echo " = '==========================================="'
subprocess.run('ls -la *.md *.html *.json 2>/dev/null || echo "No documentation files generated yet"', shell=True)

print('')
echo " = '==========================================="'
print('  Build Complete!')
echo " = '==========================================="'