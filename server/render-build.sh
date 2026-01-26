#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Node dependencies
npm install

# Install Python dependencies
# We check for both pip and pip3 to be safe on different Linux distros
if command -v pip &> /dev/null
then
    pip install -r requirements.txt
elif command -v pip3 &> /dev/null
then
    pip3 install -r requirements.txt
else
    echo "⚠️ Warning: Neither pip nor pip3 found. Python dependencies skipped."
fi

# Ensure storage directories exist in the build environment
mkdir -p uploads
mkdir -p processed_data
