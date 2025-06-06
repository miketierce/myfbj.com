#!/bin/bash

# test-native-module-fixes.sh
# Script to test the native module fixes locally

set -e # Exit on error

echo "🔧 Testing Node.js 22 + PNPM 8 native module fixes..."

# Check Node.js version
NODE_VERSION=$(node -v)
echo "Using Node.js version: $NODE_VERSION"
if [[ ! "$NODE_VERSION" == v22* ]]; then
  echo "⚠️  Warning: You're not using Node.js 22. These fixes are specifically for Node.js 22."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check PNPM version
PNPM_VERSION=$(pnpm -v)
echo "Using PNPM version: $PNPM_VERSION"
if [[ ! "$PNPM_VERSION" == 8* ]]; then
  echo "⚠️  Warning: You're not using PNPM 8. These fixes are specifically for PNPM 8."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Backup package.json
echo "📦 Backing up package.json..."
cp package.json package.json.bak

# Run the early module fix script
echo "🔄 Running early module fix script..."
node ./scripts/early-module-fix.js

# Install global dependencies
echo "📥 Installing global dependencies..."
npm install -g node-gyp@latest prebuild-install@latest @napi-rs/cli rc@1.2.8

# Clean node_modules
echo "🧹 Cleaning node_modules directory..."
rm -rf node_modules
rm -rf .output

# Install dependencies
echo "📥 Installing dependencies..."
NODEDIR=/usr/local NODE_GYP_FORCE_PYTHON=python3 pnpm install --no-frozen-lockfile

# Run the module fix script
echo "🔄 Running module fix script..."
node ./scripts/ci-fix-modules.js

# Try importing problem modules
echo "🧪 Testing better-sqlite3 module..."
node -e "try { const better = require('better-sqlite3'); console.log('✅ better-sqlite3 loaded successfully'); } catch (e) { console.error('❌ Error loading better-sqlite3:', e.message); }"

echo "🧪 Testing other native modules..."
node -e "try { require('unrs-resolver'); console.log('✅ unrs-resolver loaded successfully'); } catch (e) { console.log('⚠️ unrs-resolver not found or errored:', e.message); }"

# Restore package.json if needed
if cmp -s package.json package.json.bak; then
  echo "📄 Package.json unchanged, removing backup."
  rm package.json.bak
else
  echo "⚠️ Package.json was modified. Restoring from backup."
  cp package.json.bak package.json
fi

echo "✅ Testing complete!"
