#!/usr/bin/env bash

# create-firebase-site.sh
# Script to create Firebase Hosting sites dynamically for branch deployments

set -e # Exit on error

SITE_ID="$1"
PROJECT_ID="$2"

if [[ -z "$SITE_ID" || -z "$PROJECT_ID" ]]; then
  echo "❌ Error: SITE_ID and PROJECT_ID are required"
  echo "Usage: $0 <site_id> <project_id>"
  exit 1
fi

echo "🔍 Checking if Firebase Hosting site '$SITE_ID' exists in project '$PROJECT_ID'..."

# Method 1: Try to get the site directly (fastest and most reliable)
echo "🔧 Method 1: Direct site check..."
if firebase hosting:sites:get "$SITE_ID" --project "$PROJECT_ID" > /dev/null 2>&1; then
  echo "✅ Site '$SITE_ID' already exists (detected via direct check)"
  exit 0
fi

# Method 2: List all sites and check if our site exists
echo "🔧 Method 2: Checking sites list..."
sites_list_output=$(firebase hosting:sites:list --project "$PROJECT_ID" 2>&1)
sites_list_exit_code=$?

if [ $sites_list_exit_code -eq 0 ]; then
  echo "📋 Sites list retrieved successfully"
  # Simple grep check - if the site ID appears anywhere, it likely exists
  if echo "$sites_list_output" | grep -q "$SITE_ID"; then
    echo "✅ Site '$SITE_ID' found in sites list"
    exit 0
  fi
else
  echo "⚠️  Warning: Could not list sites (exit code: $sites_list_exit_code)"
  echo "Sites list output: $sites_list_output"
  echo "Proceeding with creation attempt..."
fi

echo "🏗️  Creating new Firebase Hosting site: $SITE_ID"

# Create the site and capture all output
echo "🔧 Running: firebase hosting:sites:create '$SITE_ID' --project '$PROJECT_ID'"
create_output=$(firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID" 2>&1)
create_exit_code=$?

echo "📝 Create command exit code: $create_exit_code"
echo "📝 Create command output:"
echo "$create_output"
echo "📝 End of create command output"

if [ $create_exit_code -eq 0 ]; then
  echo "✅ Successfully created Firebase Hosting site: $SITE_ID"
  echo "🌐 Site will be available at: https://$SITE_ID.web.app"
else
  # Check if the error is because site already exists
  if echo "$create_output" | grep -qi "already exists"; then
    echo "✅ Site '$SITE_ID' already exists (detected from creation attempt)"
    echo "🌐 Site is available at: https://$SITE_ID.web.app"
    exit 0
  # Check for other common error patterns
  elif echo "$create_output" | grep -qi "permission"; then
    echo "❌ Permission denied - insufficient permissions to create site"
    echo "💡 Make sure your service account has Firebase Hosting Admin role"
  elif echo "$create_output" | grep -qi "invalid"; then
    echo "❌ Invalid site name format: $SITE_ID"
    echo "💡 Site names must be lowercase, alphanumeric, and may contain hyphens"
  elif echo "$create_output" | grep -qi "quota\|limit"; then
    echo "❌ Quota or limit exceeded"
    echo "💡 You may have reached the maximum number of sites for this project"
  else
    echo "❌ Failed to create Firebase Hosting site: $SITE_ID"
    echo "📝 Full error output:"
    echo "$create_output"
    echo ""
    echo "💡 Common causes:"
    echo "   - Site name already exists globally (Firebase site names must be unique across all projects)"
    echo "   - Insufficient permissions (needs Firebase Hosting Admin role)"
    echo "   - Invalid site name format"
    echo "   - Project quota limits reached"
  fi

  echo ""
  echo "🔧 SOLUTION: The configure-firebase-branch.js script generates unique names"
  echo "   by combining branch name + project ID suffix. If you're still seeing this error,"
  echo "   the generated name might still conflict. Consider using a different branch name."
  exit 1
fi
