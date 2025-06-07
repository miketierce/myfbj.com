#!/usr/bin/env bash

# prepare-functions-deploy.sh
# Script to prepare Firebase Functions for deployment with proper branch-specific naming

set -e # Exit on error

echo "🔧 Preparing Firebase Functions for deployment..."

# Get the expected function name from environment or use default
EXPECTED_FUNCTION_NAME="${FUNCTION_NAME:-server}"
echo "🎯 Expected function name: $EXPECTED_FUNCTION_NAME"

# Check source functions directory
if [ ! -d "functions" ]; then
  echo "❌ Error: functions directory not found!"
  exit 1
fi

# Check Nuxt output directory
if [ ! -d ".output/server" ]; then
  echo "❌ Error: .output/server directory not found. Run 'pnpm build' first."
  exit 1
fi

# Install dependencies in the output directory (skip if already installed)
echo "🔍 Checking dependencies in .output/server..."
echo "📁 Current directory before cd: $(pwd)"
cd .output/server
echo "📁 Current directory after cd: $(pwd)"

# Check if dependencies are already installed
if [ -d "node_modules/firebase-functions" ]; then
  echo "✅ firebase-functions package already installed"
else
  echo "🔍 Installing dependencies in .output/server using Nuxt-generated package.json..."
  # Install dependencies
  if command -v pnpm &> /dev/null; then
    echo "Using pnpm to install dependencies..."
    pnpm install --prod
  else
    echo "PNPM not found, using npm instead..."
    npm install --only=prod
  fi

  # Verify firebase-functions package is installed
  if [ -d "node_modules/firebase-functions" ]; then
    echo "✅ firebase-functions package successfully installed"
  else
    echo "⚠️ Warning: firebase-functions package not found. Installing explicitly..."
    if command -v pnpm &> /dev/null; then
      pnpm add firebase-functions@6.3.2 firebase-admin@12.3.0
    else
      npm install firebase-functions@6.3.2 firebase-admin@12.3.0
    fi
  fi
fi

# Handle function naming and entry point creation
echo "🔧 Configuring function entry point..."

# Find the main entry point
ENTRY_POINT=""
if [ -f "index.mjs" ]; then
  ENTRY_POINT="index.mjs"
elif [ -f "index.js" ]; then
  ENTRY_POINT="index.js"
else
  echo "⚠️ Warning: No standard entry point found in .output/server"
  # List files to help debug
  echo "Files in .output/server:"
  ls -la
fi

# Create branch-specific function export
if [ -n "$ENTRY_POINT" ]; then
  echo "📝 Found entry point: $ENTRY_POINT"

  # For branch-specific deployments, create a wrapper that exports the function correctly
  if [ "$EXPECTED_FUNCTION_NAME" != "server" ]; then
    echo "🔄 Creating branch-specific function export: $EXPECTED_FUNCTION_NAME"

    # Backup original entry point with .mjs extension to maintain module compatibility
    if [[ "$ENTRY_POINT" == *.mjs ]]; then
      cp "$ENTRY_POINT" "server-original.mjs"
    else
      cp "$ENTRY_POINT" "server-original.js"
    fi

    # Create new entry point that exports both default and branch-specific function
    if [[ "$ENTRY_POINT" == *.mjs ]]; then
      # For .mjs files (ES modules)
      cat > "$ENTRY_POINT" << EOF
// Auto-generated entry point for branch-specific function deployment
import { server } from './server-original.mjs';

// Export the function with both the default name and branch-specific name
export { server };
export { server as '${EXPECTED_FUNCTION_NAME}' };
EOF
    else
      # For .js files (CommonJS)
      cat > "$ENTRY_POINT" << EOF
// Auto-generated entry point for branch-specific function deployment
const { server } = require('./server-original.js');

// Export the function with both the default name and branch-specific name
exports.server = server;
exports['${EXPECTED_FUNCTION_NAME}'] = server;
EOF
    fi

    echo "✅ Created branch-specific export for function: $EXPECTED_FUNCTION_NAME"
  else
    echo "✅ Using default function name: $EXPECTED_FUNCTION_NAME"
  fi
else
  echo "❌ No entry point found - function deployment may fail"
fi

# Go back to project root
echo "📁 Going back to project root from: $(pwd)"
cd ../..
echo "📁 Current directory after returning: $(pwd)"

echo "✅ Firebase Functions prepared for deployment!"
echo "🚀 Function '$EXPECTED_FUNCTION_NAME' is ready for deployment"
