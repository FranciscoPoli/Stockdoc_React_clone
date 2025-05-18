#!/bin/bash
set -e

echo "Building client..."

# Clean up any existing builds
rm -rf dist client/dist

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

# Debug: List contents of current directory and dist
echo "Contents of client directory:"
ls -la
echo "Contents of dist directory:"
ls -la dist

cd ..

# Move the built files to the correct location
echo "Moving build files to root dist directory..."
mv -f client/dist/* dist/ || {
    echo "Failed to move from client/dist. Checking root dist..."
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        echo "Build files already in correct location"
    else
        echo "Build failed to create expected output"
        exit 1
    fi
}
cd ..

# Copy build output to dist directory
mkdir -p dist
cp -r client/dist/* dist/
