#!/usr/bin/env bash

# Firebase Deployment Diagnosis Script
# Helps identify why the hosted site returns "Page not found"

echo "🔍 Firebase Deployment Diagnosis"
echo "================================="

# Check current firebase.json configuration
echo ""
echo "📋 Current firebase.json configuration:"
if [ -f "firebase.json" ]; then
  echo "Hosting configuration:"
  cat firebase.json | jq '.hosting' 2>/dev/null || echo "Could not parse firebase.json with jq"

  echo ""
  echo "Function rewrite rule:"
  cat firebase.json | jq '.hosting.rewrites[] | select(.source == "**")' 2>/dev/null || echo "No catch-all rewrite found"

  echo ""
  echo "Hosting site ID:"
  cat firebase.json | jq -r '.hosting.site // "default"' 2>/dev/null || echo "Could not determine site ID"
else
  echo "❌ firebase.json not found"
fi

# Check if build output exists
echo ""
echo "📦 Build output check:"
if [ -d ".output" ]; then
  echo "✅ .output directory exists"
  echo "Public files:"
  ls -la .output/public/ 2>/dev/null | head -10 || echo "No public files found"
  echo ""
  echo "Server files:"
  ls -la .output/server/ 2>/dev/null | head -5 || echo "No server files found"
else
  echo "❌ .output directory not found - build may have failed"
fi

# Check functions directory
echo ""
echo "⚡ Functions check:"
if [ -d ".output/server" ]; then
  echo "✅ Nuxt server output exists"
  echo "Server entry point:"
  ls -la .output/server/index.* 2>/dev/null || echo "No server entry point found"
else
  echo "❌ No .output/server directory"
fi

# Check if there's a functions directory with compiled output
if [ -d "functions/lib" ]; then
  echo "✅ Functions compiled output exists"
  echo "Compiled functions:"
  ls -la functions/lib/ 2>/dev/null | head -5 || echo "No compiled functions found"
else
  echo "❌ No functions/lib directory - functions may not be compiled"
fi

echo ""
echo "🔧 Common Issues and Solutions:"
echo ""
echo "1. **Function Name Mismatch**"
echo "   - firebase.json points to: $(cat firebase.json | jq -r '.hosting.rewrites[] | select(.source == "**") | .function' 2>/dev/null || echo 'unknown')"
echo "   - Make sure this function is deployed to Firebase"
echo ""
echo "2. **Build Output Missing**"
echo "   - Run: pnpm build"
echo "   - Check that .output/public and .output/server exist"
echo ""
echo "3. **Function Deployment Failed**"
echo "   - The function might not be deployed or have errors"
echo "   - Check Firebase Console > Functions for error logs"
echo ""
echo "4. **Site Configuration**"
echo "   - Verify the site ID matches the deployed site"
echo "   - Check Firebase Console > Hosting for site status"

echo ""
echo "🚀 Quick Fix Commands:"
echo "# Rebuild the application:"
echo "pnpm build"
echo ""
echo "# Deploy only hosting (if function exists):"
echo "firebase deploy --only hosting --project devour-4a8f0"
echo ""
echo "# Deploy functions and hosting together:"
echo "firebase deploy --only functions,hosting --project devour-4a8f0"
