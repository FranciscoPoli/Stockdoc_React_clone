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

# Update vite config for better ESM compatibility
echo 'import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "wouter"]
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  optimizeDeps: {
    include: ["wouter"]
  }
});' > vite.config.ts

# Build with production settings
VITE_SKIP_TS_CHECK=true NODE_ENV=production npm run build
cd ..

# Copy build output to dist directory
mkdir -p dist
cp -r client/dist/* dist/
