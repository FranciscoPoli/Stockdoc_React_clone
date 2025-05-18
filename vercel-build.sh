#!/bin/bash
set -e

echo "Building client..."

# Start in the root directory and ensure it's clean
rm -rf dist client/dist
mkdir -p dist

cd client

# Remove any existing node_modules to ensure clean install
rm -rf node_modules
rm -f package-lock.json

# Create .npmrc to force using npm registry
echo "registry=https://registry.npmjs.org/" > .npmrc

# Install dependencies with npm
npm install

# Install specific versions of React and wouter
npm install react@18.2.0 react-dom@18.2.0 wouter@2.11.0 --save-exact

# Build with production settings
echo "Starting build..."
VITE_SKIP_TS_CHECK=true NODE_ENV=production npm run build
echo "Build completed"

# Debug: Show build output
echo "Contents of client/dist directory:"
ls -la dist/

cd ..

# Copy the built files to the root dist directory
echo "Copying build files to root dist directory..."
cp -r client/dist/* dist/

# Verify the copy
echo "Contents of root dist directory:"
ls -la dist/

# Verify index.html exists
if [ ! -f "dist/index.html" ]; then
    echo "Error: index.html not found in dist directory"
    exit 1
fi

echo "Build and copy completed successfully"
