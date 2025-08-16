#!/usr/bin/env python3
"""
Migrated from: test.sh
Auto-generated Python - 2025-08-16T04:57:27.620Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Run Python tests with coverage
    subprocess.run("set -e", shell=True)
    # Activate virtual environment if not already activated
    if [ "$VIRTUAL_ENV" == "" ]:; then
    if [ -f .venv/bin/activate ]:; then
    subprocess.run("source .venv/bin/activate", shell=True)
    else:
    print("Virtual environment not found. Run setup.sh first.")
    sys.exit(1)
    print("Running Python tests with coverage...")
    # Run pytest with coverage
    subprocess.run("pytest \", shell=True)
    subprocess.run("--cov=src \", shell=True)
    subprocess.run("--cov-branch \", shell=True)
    subprocess.run("--cov-report=term-missing \", shell=True)
    subprocess.run("--cov-report=html \", shell=True)
    subprocess.run("--cov-report=json \", shell=True)
    subprocess.run("-v", shell=True)
    # Run coverage analyzer
    print("Analyzing coverage metrics...")
    subprocess.run("python src/coverage_analyzer.py", shell=True)
    # Run BDD tests with behave
    print("Running BDD tests...")
    subprocess.run("behave --junit --junit-directory test-results/behave", shell=True)
    print("Tests complete!")

if __name__ == "__main__":
    main()