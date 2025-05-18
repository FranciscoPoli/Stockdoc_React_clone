#!/bin/bash
set -e

echo "Building client..."
cd client
npm install
npm install react@18.2.0 react-dom@18.2.0 wouter@3.0.0 use-sync-external-store@1.2.0 --legacy-peer-deps
NODE_ENV=production VITE_SKIP_TS_CHECK=true vite build --mode production
cd ..

# Copy build output to dist directory
mkdir -p dist
cp -r client/dist/* dist/
