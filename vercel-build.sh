#!/bin/bash
echo "Installing dependencies..."
npm install

echo "Building client..."
cd client
npm run build
cd ..

echo "Building server..."
npm run build:server
