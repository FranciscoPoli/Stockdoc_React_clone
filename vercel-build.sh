#!/bin/bash
set -e

echo "Building client..."
cd client

# Remove any existing node_modules to ensure clean install
rm -rf node_modules
rm -f package-lock.json

# Install dependencies with specific resolutions
npm install
npm install react@18.2.0 react-dom@18.2.0 --save-exact
npm install wouter@2.11.0 --save-exact
npm install use-sync-external-store@1.2.0 --save-exact

# Ensure correct peer dependencies
npm install @types/use-sync-external-store@0.0.3 --save-dev

# Build with production settings
NODE_ENV=production VITE_SKIP_TS_CHECK=true vite build --mode production
cd ..

# Copy build output to dist directory
mkdir -p dist
cp -r client/dist/* dist/
