#!/usr/bin/env bash

# Pre-build hook for CI/CD to ensure TypeScript compatibility with Node 22
# This script is executed by the CI/CD pipeline before building

echo "⚙️ Running CI/CD pre-build hook for Firebase Functions..."

# Get directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Navigate to functions directory
cd "$DIR/../functions"
echo "📂 Working in directory: $(pwd)"

# Ensure tsconfig.build.json exists
if [[ ! -f "tsconfig.build.json" ]]; then
  echo "Creating tsconfig.build.json for CI/CD..."
  cat > tsconfig.build.json << 'EOL'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "skipLibCheck": true,
    "noEmit": false
  },
  "exclude": [
    "node_modules",
    "../node_modules"
  ]
}
EOL
fi

# Set environment variables to help compatibility
echo "Setting environment variables for Firebase Functions build..."
export SKIP_WEBPACK_TYPES=true
export NODE_ENV=production
export TS_NODE_COMPILER_OPTIONS='{"skipLibCheck":true}'

echo "✅ CI/CD pre-build hook completed successfully"
exit 0
