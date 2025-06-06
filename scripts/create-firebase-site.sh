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

# Check if site already exists
if firebase hosting:sites:list --project "$PROJECT_ID" --json | jq -e ".[] | select(.name == \"$SITE_ID\")" > /dev/null 2>&1; then
  echo "✅ Site '$SITE_ID' already exists"
  exit 0
fi

echo "🏗️  Creating new Firebase Hosting site: $SITE_ID"

# Create the site
if firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID"; then
  echo "✅ Successfully created Firebase Hosting site: $SITE_ID"
  echo "🌐 Site will be available at: https://$SITE_ID.$PROJECT_ID.web.app"
else
  echo "❌ Failed to create Firebase Hosting site: $SITE_ID"
  echo "💡 This might be because:"
  echo "   - Site name already exists globally (Firebase site names must be unique across all projects)"
  echo "   - Insufficient permissions"
  echo "   - Invalid site name format"
  echo ""
  echo "🔧 SOLUTION: The configure-firebase-branch.js script has been updated to generate"
  echo "   more unique site names by combining branch name + project ID suffix."
  echo "   If you're still seeing this error, the generated name might still conflict."
  echo "   Consider using a different branch name or contact support."
  exit 1
fi
