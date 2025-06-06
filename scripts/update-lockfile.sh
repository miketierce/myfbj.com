#!/usr/bin/env bash

# update-lockfile.sh
# A helper script to update the pnpm-lock.yaml file with Node 22 and PNPM 8
# This script uses Docker to ensure the correct versions are used regardless of local setup
#
# Usage:
#   ./update-lockfile.sh           # Update lockfile, no auto-commit
#   ./update-lockfile.sh --commit  # Update lockfile and commit changes

set -e # Exit on any error

echo "🔒 Updating pnpm-lock.yaml with Node 22 and PNPM 8..."

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
REPO_ROOT="$(cd "$DIR/.." && pwd)"

# Check if auto-commit was requested
AUTO_COMMIT=false
if [ "$1" == "--commit" ]; then
  AUTO_COMMIT=true
fi

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

# Check if we should auto-commit the changes
if [ "$AUTO_COMMIT" = true ]; then
  echo "🔄 Auto-committing changes to pnpm-lock.yaml..."
  cd "$REPO_ROOT"

  # Check if there are actually changes
  if git diff --quiet -- pnpm-lock.yaml; then
    echo "ℹ️ No changes to pnpm-lock.yaml detected."
  else
    git add pnpm-lock.yaml
    git commit -m "chore: update pnpm-lock.yaml for Node 22 and PNPM 8 [skip ci]"
    echo "✅ Changes committed successfully!"
    echo "📌 Don't forget to push your changes: git push"
  fi
else
  echo ""
  echo "🚀 You can now commit the updated lockfile to fix CI pipeline issues:"
  echo "    git add pnpm-lock.yaml"
  echo "    git commit -m \"chore: update pnpm-lock.yaml for Node 22 and PNPM 8\""
  echo "    git push"
fi
