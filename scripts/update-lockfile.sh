#!/usr/bin/env bash

# update-lockfile.sh
# A helper script to update the pnpm-lock.yaml file with Node 22 and PNPM 8
# This script uses Docker to ensure the correct versions are used regardless of local setup

set -e # Exit on any error

echo "🔒 Updating pnpm-lock.yaml with Node 22 and PNPM 8..."

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not found. Please install Docker and try again."
    exit 1
fi

# Run a Node 22 container with PNPM 8 to update the lockfile
echo "🐳 Running Docker container with Node 22 and PNPM 8..."
docker run --rm -v "$DIR":/app -w /app node:22-alpine sh -c "
    echo '📦 Installing PNPM 8...' &&
    npm install -g pnpm@8 &&
    echo '⚙️ Configuring PNPM...' &&
    pnpm config set node-linker hoisted &&
    pnpm config set strict-peer-dependencies false &&
    pnpm config set auto-install-peers true &&
    pnpm config set resolution-mode highest &&
    echo '🔄 Updating lockfile...' &&
    pnpm install
"

echo "✅ pnpm-lock.yaml updated successfully with Node 22 and PNPM 8!"
echo ""
echo "🚀 You can now commit the updated lockfile to fix CI pipeline issues."
echo "    git add pnpm-lock.yaml"
echo "    git commit -m \"chore: update pnpm-lock.yaml for Node 22 and PNPM 8\""
echo "    git push"
