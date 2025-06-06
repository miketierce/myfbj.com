#!/usr/bin/env bash

# ci-prepare-workspace.sh
# Script to prepare the workspace for CI/CD pipeline
# This script should be run before any install or build commands

set -e # Exit on error

echo "🔍 Preparing workspace for CI/CD pipeline..."

# Check directories and files for any issues
echo "👉 Checking critical directories and files..."

# Validate pnpm-workspace.yaml
if [ -f "pnpm-workspace.yaml" ]; then
  echo "✅ Found pnpm-workspace.yaml"

  # Verify it contains the functions package
  if ! grep -q "functions" pnpm-workspace.yaml; then
    echo "⚠️ Warning: functions directory not included in pnpm-workspace.yaml"
    echo "Adding functions directory to workspace configuration..."

    # Make a backup
    cp pnpm-workspace.yaml pnpm-workspace.yaml.bak

    # Add functions directory if it doesn't exist
    cat > pnpm-workspace.yaml << EOL
packages:
  - functions
  - '.'
EOL

    echo "✏️ Updated pnpm-workspace.yaml"
  fi
else
  echo "⚠️ pnpm-workspace.yaml not found, creating..."
  cat > pnpm-workspace.yaml << EOL
packages:
  - functions
  - '.'
EOL
  echo "✅ Created pnpm-workspace.yaml"
fi

# Check for .npmrc file with proper configuration
if [ -f ".npmrc" ]; then
  echo "✅ Found .npmrc"

  # Add any missing configurations
  anyUpdated=false

  if ! grep -q "node-linker=hoisted" .npmrc; then
    echo "node-linker=hoisted" >> .npmrc
    anyUpdated=true
  fi

  if ! grep -q "strict-peer-dependencies=false" .npmrc; then
    echo "strict-peer-dependencies=false" >> .npmrc
    anyUpdated=true
  fi

  if ! grep -q "auto-install-peers=true" .npmrc; then
    echo "auto-install-peers=true" >> .npmrc
    anyUpdated=true
  fi

  if ! grep -q "resolution-mode=highest" .npmrc; then
    echo "resolution-mode=highest" >> .npmrc
    anyUpdated=true
  fi

  if ! grep -q "ignore-compatibility-db" .npmrc; then
    echo "ignore-compatibility-db=true" >> .npmrc
    anyUpdated=true
  fi

  if [ "$anyUpdated" = true ]; then
    echo "✏️ Updated .npmrc with missing configurations"
  fi
else
  echo "⚠️ .npmrc not found, creating..."

  cat > .npmrc << EOL
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
resolution-mode=highest
ignore-compatibility-db=true
EOL

  echo "✅ Created .npmrc with correct configurations"
fi

# Verify package.json files have correct Node 22 engines field
echo "👉 Checking package.json files for Node 22 compatibility..."

# Check root package.json
if [ -f "package.json" ]; then
  # Check if Node 22 engines field exists
  if ! grep -q '"node": *">=22' package.json && ! grep -q '"node": *"22' package.json; then
    echo "⚠️ Warning: Root package.json missing Node 22 engine requirement."
    echo "Manual fix may be required after pipeline completion."
  else
    echo "✅ Root package.json has correct Node engine specification"
  fi
else
  echo "❌ Error: Root package.json not found!"
  exit 1
fi

# Check functions/package.json
if [ -f "functions/package.json" ]; then
  # Check if Node 22 engines field exists
  if ! grep -q '"node": *"22' functions/package.json; then
    echo "⚠️ Warning: functions/package.json missing Node 22 engine requirement."
    echo "Manual fix may be required after pipeline completion."
  else
    echo "✅ functions/package.json has correct Node engine specification"
  fi
else
  echo "⚠️ Warning: functions/package.json not found. Skipping check."
fi

# Check for Firebase CLI version
echo "👉 Checking Firebase CLI version..."
if command -v firebase &> /dev/null; then
  firebase_version=$(firebase --version)
  echo "Firebase CLI version: $firebase_version"

  # Extract major version
  major_version=$(echo $firebase_version | cut -d. -f1)

  if [ "$major_version" -lt 14 ]; then
    echo "⚠️ Warning: Firebase CLI version $firebase_version is less than v14."
    echo "Consider updating to Firebase CLI v14+ for better Node 22 compatibility."
  fi
else
  echo "ℹ️ Firebase CLI not installed locally. Will be installed by pipeline."
fi

# Create a .node-version file if it doesn't exist
if [ ! -f ".node-version" ]; then
  echo "22.10.0" > .node-version
  echo "✅ Created .node-version file"
fi

# Create a .nvmrc file if it doesn't exist
if [ ! -f ".nvmrc" ]; then
  echo "22" > .nvmrc
  echo "✅ Created .nvmrc file"
fi

echo "✅ Workspace preparation complete!"
echo "🚀 CI pipeline is ready to proceed with installation and build."
