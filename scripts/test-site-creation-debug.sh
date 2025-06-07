#!/usr/bin/env bash

# Test script to debug Firebase site creation issues locally
# This will help us understand what's happening before running in GitHub Actions

set -e

echo "🔧 Testing Firebase Site Creation Debug"
echo "======================================="

# Test parameters (using dev-test branch as example)
BRANCH_NAME="dev-test"
PROJECT_ID="devour-4a8f0"  # Replace with actual project ID if different

echo ""
echo "📋 Test Configuration:"
echo "  Branch: $BRANCH_NAME"
echo "  Project: $PROJECT_ID"

# Run the configure-firebase-branch script to get the site ID
echo ""
echo "🔧 Step 1: Running configure-firebase-branch.js..."
if [ -f "./scripts/configure-firebase-branch.js" ]; then
  node ./scripts/configure-firebase-branch.js "$BRANCH_NAME" "$PROJECT_ID"

  # Read the site ID from the updated firebase.json
  if [ -f "./firebase.json" ]; then
    SITE_ID=$(node -pe "JSON.parse(require('fs').readFileSync('./firebase.json', 'utf8')).hosting.site")
    echo "Generated Site ID: $SITE_ID"
  else
    echo "❌ firebase.json not found after running configure script"
    exit 1
  fi
else
  echo "❌ configure-firebase-branch.js not found"
  exit 1
fi

echo ""
echo "🔧 Step 2: Testing Firebase CLI availability..."
if command -v firebase >/dev/null 2>&1; then
  echo "✅ Firebase CLI is available"
  firebase --version
else
  echo "❌ Firebase CLI not found - installing..."
  npm install -g firebase-tools
fi

echo ""
echo "🔧 Step 3: Testing Firebase authentication..."
if firebase projects:list >/dev/null 2>&1; then
  echo "✅ Firebase authentication is working"
else
  echo "❌ Firebase authentication failed"
  echo "💡 You need to run: firebase login"
  exit 1
fi

echo ""
echo "🔧 Step 4: Testing project access..."
if firebase projects:list | grep -q "$PROJECT_ID"; then
  echo "✅ Project $PROJECT_ID is accessible"
else
  echo "❌ Project $PROJECT_ID not found in your Firebase projects"
  echo "Available projects:"
  firebase projects:list
  exit 1
fi

echo ""
echo "🔧 Step 5: Testing site detection..."
echo "Running: firebase hosting:sites:get $SITE_ID --project $PROJECT_ID"
if firebase hosting:sites:get "$SITE_ID" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "✅ Site $SITE_ID already exists"
  echo "🌐 Site URL: https://$SITE_ID.web.app"
else
  echo "ℹ️  Site $SITE_ID does not exist (this is expected for new branches)"

  echo ""
  echo "🔧 Step 6: Testing site creation..."
  echo "Running: firebase hosting:sites:create $SITE_ID --project $PROJECT_ID"

  # Capture full output for debugging
  create_output=$(firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID" 2>&1)
  create_exit_code=$?

  echo "Exit code: $create_exit_code"
  echo "Output: $create_output"

  if [ $create_exit_code -eq 0 ]; then
    echo "✅ Successfully created site $SITE_ID"
  else
    echo "❌ Failed to create site $SITE_ID"
  fi
fi

echo ""
echo "🔧 Step 7: Listing all sites for verification..."
firebase hosting:sites:list --project "$PROJECT_ID"

echo ""
echo "✅ Debug test completed!"
