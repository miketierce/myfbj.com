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

  # Fix for native modules in Node.js 22
  if ! grep -q "prefer-frozen-lockfile=false" .npmrc; then
    echo "prefer-frozen-lockfile=false" >> .npmrc
    anyUpdated=true
  fi

  # Fix for specific modules with postinstall issues in Node.js 22
  if ! grep -q "node-gyp-force-latest=true" .npmrc; then
    echo "node-gyp-force-latest=true" >> .npmrc
    anyUpdated=true
  fi

  # Avoid using symlinks which can cause issues with some modules
  if ! grep -q "symlink=false" .npmrc; then
    echo "symlink=false" >> .npmrc
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
prefer-frozen-lockfile=false
node-gyp-force-latest=true
symlink=false
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

# Add workarounds for known problematic packages with Node.js 22
echo "👉 Adding workarounds for problematic packages in Node.js 22..."

# Create a patch directory if it doesn't exist
if [ ! -d ".pnpm-patches" ]; then
  mkdir -p .pnpm-patches
  echo "✅ Created .pnpm-patches directory"
fi

# Function to create a package.json override
create_package_override() {
  local package_name=$1
  local override_content=$2

  # Create the overrides property if it doesn't exist in package.json
  if ! grep -q '"overrides"' package.json; then
    # Add overrides to the end of the file, before the last }
    sed -i '$ s/}$/,\n  "overrides": {}\n}/' package.json
    echo "✅ Added overrides property to package.json"
  fi

  # Add the specific override
  if ! grep -q "\"$package_name\":" package.json; then
    # Replace empty overrides object with our override
    sed -i "s/\"overrides\": {/\"overrides\": {\n    \"$package_name\": $override_content/" package.json
    echo "✅ Added $package_name override to package.json"
  fi
}

# Add specific overrides for problematic packages
if [ -f "package.json" ]; then
  echo "Adding package overrides for problematic native modules..."

  # Override for better-sqlite3
  create_package_override "better-sqlite3" "\"^8.7.0\""

  # Override for rc module (needed by prebuild-install)
  create_package_override "rc" "\"1.2.8\""

  # Override for node-gyp
  create_package_override "node-gyp" "\"^10.0.1\""

  # Override for prebuild-install
  create_package_override "prebuild-install" "\"^7.1.1\""
fi

# Create a special install script for CI
cat > ./scripts/ci-fix-modules.js << EOL
#!/usr/bin/env node

/**
 * This script fixes module resolution issues in CI for Node.js 22
 */

const fs = require('fs');
const path = require('path');

// Paths to fix
const modulesToFix = [
  ['better-sqlite3', 'node_modules/.bin/prebuild-install'],
  ['unrs-resolver', 'node_modules/.bin/napi-postinstall']
];

console.log('🔧 Fixing module resolution issues for Node.js 22...');

modulesToFix.forEach(([moduleName, binPath]) => {
  try {
    const fullPath = path.join(process.cwd(), binPath);

    if (fs.existsSync(fullPath)) {
      console.log(\`Fixing \${moduleName} (\${binPath})...\`);

      // Read the file
      const content = fs.readFileSync(fullPath, 'utf8');

      // Fix module resolution paths
      let fixedContent = content;

      if (moduleName === 'better-sqlite3') {
        fixedContent = content.replace('./rc', 'rc');
      } else if (moduleName === 'unrs-resolver') {
        fixedContent = content.replace('./index.js', '@napi-rs/postinstall/index.js');
      }

      if (content !== fixedContent) {
        fs.writeFileSync(fullPath, fixedContent);
        console.log(\`✅ Fixed \${moduleName}\`);
      } else {
        console.log(\`⏩ No changes needed for \${moduleName}\`);
      }
    } else {
      console.log(\`⚠️ Path not found: \${binPath}\`);
    }
  } catch (error) {
    console.error(\`❌ Error fixing \${moduleName}: \${error.message}\`);
  }
});

console.log('✅ Module fixes complete!');
EOL

chmod +x ./scripts/ci-fix-modules.js
echo "✅ Created ci-fix-modules.js script"

echo "✅ Workspace preparation complete!"
echo "🚀 CI pipeline is ready to proceed with installation and build."
