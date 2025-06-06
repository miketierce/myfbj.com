#!/usr/bin/env bash

# Setup script for Node 22 + PNPM 8 development environment
echo "📦 Setting up Node 22 + PNPM 8 development environment..."

# Attempt to source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Check if Node.js is installed and version is >= 22
node_version=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')
if [ -z "$node_version" ] || [ "$node_version" -lt 22 ]; then
  echo "❌ Node.js 22 or later is required. Current version: $(node -v 2>/dev/null || echo "Not installed")"
  if command -v nvm >/dev/null 2>&1; then
    echo "💡 Attempting to install and use Node.js 22 via nvm..."
    nvm install 22
    nvm use 22
    # Re-check version after attempting nvm install/use
    node_version=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')
    if [ -z "$node_version" ] || [ "$node_version" -lt 22 ]; then
      echo "❌ Failed to set Node.js 22 using nvm. Please check nvm setup."
      exit 1
    else
      echo "✅ Node.js $(node -v) is now active via nvm."
    fi
  else
    echo "💡 nvm (Node Version Manager) is not installed or not in PATH."
    echo "   Please install nvm first: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "   Then run 'nvm install 22', 'nvm use 22', and re-run this script."
    exit 1
  fi
else
  echo "✅ Node.js $(node -v) is installed"
fi

# Check if PNPM is installed
if ! command -v pnpm >/dev/null 2>&1; then
  echo "❌ PNPM is not installed"
  echo "💡 Installing PNPM 8..."
  # Ensure Node/npm is available for this global install
  npm install -g pnpm@8
  # The original curl pipe might fail if npm isn't configured globally or if nvm hasn't set up global path correctly yet.
  # curl -fsSL https://get.pnpm.io/install.sh | sh -
  # source ~/.bashrc # Sourcing .bashrc in a script is often problematic
  # source ~/.zshrc 2>/dev/null || true # Same for .zshrc
  # It's better to rely on npm's global installation path for pnpm
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
