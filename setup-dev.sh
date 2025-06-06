#!/usr/bin/env bash

# Setup script for Node 22 + PNPM 8 development environment
echo "📦 Setting up Node 22 + PNPM 8 development environment..."

# Check if Node.js is installed and version is >= 22
node_version=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')
if [ -z "$node_version" ] || [ "$node_version" -lt 22 ]; then
  echo "❌ Node.js 22 or later is required"
  echo "💡 Tip: Use nvm (Node Version Manager) to install and manage Node versions:"
  echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  echo "   nvm install 22"
  echo "   nvm use 22"
  exit 1
else
  echo "✅ Node.js $(node -v) is installed"
fi

# Check if PNPM is installed
if ! command -v pnpm >/dev/null 2>&1; then
  echo "❌ PNPM is not installed"
  echo "💡 Installing PNPM 8..."
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  source ~/.bashrc
  source ~/.zshrc 2>/dev/null || true
  pnpm config set node-linker hoisted
  pnpm config set strict-peer-dependencies false
  pnpm config set auto-install-peers true
  pnpm config set resolution-mode highest
else
  pnpm_version=$(pnpm -v | cut -d. -f1)
  if [ "$pnpm_version" -ne 8 ]; then
    echo "⚠️ PNPM version $(pnpm -v) detected. This project requires PNPM 8"
    echo "💡 Installing PNPM 8..."
    npm install -g pnpm@8
    pnpm config set node-linker hoisted
    pnpm config set strict-peer-dependencies false
    pnpm config set auto-install-peers true
    pnpm config set resolution-mode highest
  else
    echo "✅ PNPM 8 is installed ($(pnpm -v))"
  fi
fi

# Check if Firebase CLI is installed
if ! command -v firebase >/dev/null 2>&1; then
  echo "❌ Firebase CLI is not installed"
  echo "💡 Installing Firebase CLI version 14.6.0..."
  npm install -g firebase-tools@14.6.0
else
  firebase_version=$(firebase --version)
  echo "✅ Firebase CLI version $firebase_version is installed"
  if [[ "$firebase_version" != "14.6.0" ]]; then
    echo "⚠️ Consider updating to Firebase CLI version 14.6.0 for best compatibility with Node 22"
    echo "   npm install -g firebase-tools@14.6.0"
  fi
fi

# Install dependencies
echo "📦 Installing project dependencies with PNPM 8..."
pnpm install

echo "📦 Installing Firebase Functions dependencies..."
cd functions && pnpm install && cd ..

echo "✨ Setup complete! You're ready to develop with Node 22 and PNPM 8."
echo ""
echo "Available commands:"
echo "  🚀 pnpm dev             - Start development server"
echo "  🔥 pnpm emulators       - Start Firebase emulators"
echo "  🐳 pnpm docker:dev      - Start development in Docker (Node 22 + PNPM 8)"
echo "  🚢 pnpm build           - Build the application"
echo "  🧪 pnpm check:node      - Check Node.js and PNPM versions"
echo ""
