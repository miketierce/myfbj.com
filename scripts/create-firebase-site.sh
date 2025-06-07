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

# Check if site already exists using the most reliable method
# Firebase API returns site names as "projects/PROJECT_ID/sites/SITE_ID"
if firebase hosting:sites:list --project "$PROJECT_ID" --json | jq -e ".[] | select(.name | endswith(\"/$SITE_ID\"))" > /dev/null 2>&1; then
  echo "✅ Site '$SITE_ID' already exists"
  exit 0
fi

echo "🏗️  Creating new Firebase Hosting site: $SITE_ID"

# Create the site and capture the output
create_output=$(firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID" 2>&1)
create_exit_code=$?

if [ $create_exit_code -eq 0 ]; then
  echo "✅ Successfully created Firebase Hosting site: $SITE_ID"
  echo "🌐 Site will be available at: https://$SITE_ID.web.app"
else
  # Check if the error is because site already exists
  if echo "$create_output" | grep -q "already exists"; then
    echo "✅ Site '$SITE_ID' already exists (detected from creation attempt)"
    echo "🌐 Site is available at: https://$SITE_ID.web.app"
    exit 0
  else
    echo "❌ Failed to create Firebase Hosting site: $SITE_ID"
    echo "📝 Firebase CLI output:"
    echo "$create_output"
    echo ""
    echo "💡 This might be because:"
    echo "   - Site name already exists globally (Firebase site names must be unique across all projects)"
    echo "   - Insufficient permissions"
    echo "   - Invalid site name format"
    echo ""
    echo "🔧 SOLUTION: The configure-firebase-branch.js script generates unique names"
    echo "   by combining branch name + project ID suffix. If you're still seeing this error,"
    echo "   the generated name might still conflict. Consider using a different branch name."
    exit 1
  fi
fi
