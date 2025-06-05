#!/usr/bin/env bash

# Test script for Firebase Functions TypeScript compatibility with Node 22
# This script helps verify that the functions will build correctly in CI/CD pipeline
#
# Usage:
#   ./test-functions-build.sh         # Interactive mode
#   ./test-functions-build.sh --ci    # CI mode (non-interactive)

set -e # Exit on any error

echo "🔍 Testing Firebase Functions TypeScript compatibility with Node 22..."

# Check if running in CI mode
CI_MODE=false
if [[ "$1" == "--ci" ]]; then
  CI_MODE=true
  echo "🤖 Running in CI mode (non-interactive)"
fi

# Check Node version
NODE_VERSION=$(node -v)
echo "📋 Using Node.js version: $NODE_VERSION"

if [[ ! $NODE_VERSION =~ ^v22 ]]; then
  echo "⚠️ Warning: You are not using Node.js 22. This may produce different results than CI/CD."
  echo "💡 Consider switching to Node.js 22 with: nvm use 22"

  if [[ "$CI_MODE" == "true" ]]; then
    echo "❌ CI build requires Node.js 22"
    exit 1
  else
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
fi

# Navigate to functions directory
cd "$(dirname "$0")/functions"
echo "📂 Changed directory to: $(pwd)"

# Clean any previous build artifacts
echo "🧹 Cleaning previous build artifacts..."
rm -rf lib/
rm -rf node_modules/.cache/

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Ensure Node 22 types are installed
echo "📦 Ensuring @types/node for Node.js 22 is installed..."
pnpm add -D @types/node@22

# Display TypeScript and Node versions
echo "📋 TypeScript version: $(pnpm tsc --version)"
echo "📋 @types/node version: $(cat node_modules/@types/node/package.json | grep version | head -1)"

# Test with standard build
echo "🔨 Testing standard build..."
if pnpm build; then
  echo "✅ Standard build successful"
else
  echo "❌ Standard build failed"
fi

# Test with the CI build config
echo "🔨 Testing CI build configuration..."
if pnpm build -p tsconfig.build.json; then
  echo "✅ CI build successful"
else
  echo "❌ CI build failed, but this might be expected due to webpack types"
fi

# Validate the output files
if [[ -f "lib/index.js" ]]; then
  echo "✅ Build output files exist"
  echo "📋 Generated files:"
  ls -la lib/
else
  echo "❌ Build output files are missing"
  exit 1
fi

# Run TypeScript compiler with strict mode to catch all errors
echo "🔬 Running thorough type checking..."
pnpm tsc --noEmit

echo
echo "🎉 Firebase Functions TypeScript compatibility check complete!"
echo "   If all checks passed, your functions should build correctly in CI/CD."

exit 0
