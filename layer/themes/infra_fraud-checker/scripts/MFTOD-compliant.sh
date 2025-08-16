#!/bin/bash

# Mock Free Test Oriented Development (MFTOD) Compliance Checker
# This script calls the Python implementation

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Call the Python script with all arguments
python3 "${SCRIPT_DIR}/MFTOD-compliant.py" "$@"