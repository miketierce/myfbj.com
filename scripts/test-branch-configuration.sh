#!/usr/bin/env bash

# Test the configure-firebase-branch script locally
# This helps verify the function names and site IDs are generated correctly

echo "🧪 Testing Firebase Branch Configuration"
echo "========================================"

BRANCH_NAME="dev-test"
PROJECT_ID="devour-4a8f0"  # Replace with actual project ID

echo "Testing with:"
echo "  Branch: $BRANCH_NAME"
echo "  Project: $PROJECT_ID"
echo ""

# Test the configure script
echo "🔧 Running configure-firebase-branch.js..."
if [ -f "./scripts/configure-firebase-branch.js" ]; then
  # Run the script and capture output
  output=$(node ./scripts/configure-firebase-branch.js "$BRANCH_NAME" "$PROJECT_ID" 2>&1)
  exit_code=$?

  echo "Exit code: $exit_code"
  echo "Output:"
  echo "$output"

  if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Configuration successful"

    # Parse the outputs
    function_name=$(echo "$output" | grep "function_name=" | cut -d'=' -f2)
    hosting_site_id=$(echo "$output" | grep "hosting_site_id=" | cut -d'=' -f2)

    echo "📋 Results:"
    echo "  Function name: $function_name"
    echo "  Hosting site ID: $hosting_site_id"
    echo "  Expected URL: https://$hosting_site_id.web.app"

    # Check what's in firebase.json now
    if [ -f "firebase.json" ]; then
      echo ""
      echo "📄 Firebase.json configuration:"
      echo "  Site: $(jq -r '.hosting.site // "default"' firebase.json)"
      echo "  Function rewrite: $(jq -r '.hosting.rewrites[] | select(.source == "**") | .function' firebase.json)"
    fi
  else
    echo "❌ Configuration failed"
  fi
else
  echo "❌ configure-firebase-branch.js not found"
fi

echo ""
echo "🔧 Testing deployment target generation..."
echo "In GitHub Actions, the deployment would use:"
echo "  functions:$function_name"
echo ""
echo "💡 This means Firebase CLI would deploy a function named: $function_name"
echo "💡 And firebase.json expects a function named: $function_name"
echo "💡 They should match for the site to work properly!"
