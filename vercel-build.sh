#!/bin/bash
set -e

echo "Building client..."
cd client

# Remove any existing node_modules to ensure clean install
rm -rf node_modules
rm -f package-lock.json

# Create .npmrc to force using npm registry
echo "registry=https://registry.npmjs.org/" > .npmrc

# Install dependencies with npm
npm install

# Install specific versions of React
npm install react@18.2.0 react-dom@18.2.0 --save-exact

# Install wouter from npm with ESM support
npm install wouter@2.11.0 --save-exact

# Build with production settings
VITE_SKIP_TS_CHECK=true NODE_ENV=production npm run build

cd ..

# Create dist directory and copy build output
mkdir -p dist
cp -r client/dist/* dist/ || {
    echo "Checking build output location..."
    ls -la client/dist
    echo "Trying alternative build output location..."
    cp -r dist/* dist/ || {
        echo "Build failed to create expected output"
        exit 1
    }
}
cd ..

# Copy build output to dist directory
mkdir -p dist
cp -r client/dist/* dist/
