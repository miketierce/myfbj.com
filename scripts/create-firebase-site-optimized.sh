#!/usr/bin/env bash

# Optimized Firebase site creation script
# Focuses on reliability and proper error handling

set -e

SITE_ID="$1"
PROJECT_ID="$2"

if [[ -z "$SITE_ID" || -z "$PROJECT_ID" ]]; then
  echo "❌ Error: SITE_ID and PROJECT_ID are required"
  echo "Usage: $0 <site_id> <project_id>"
  exit 1
fi

echo "🔍 Checking Firebase Hosting site: $SITE_ID"

# Strategy: Try creation first, handle "already exists" gracefully
# This is more reliable than trying to detect existing sites
echo "🏗️  Attempting to create site: $SITE_ID"

create_output=$(firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID" 2>&1)
create_exit_code=$?

if [ $create_exit_code -eq 0 ]; then
  echo "✅ Successfully created Firebase Hosting site: $SITE_ID"
  echo "🌐 Site URL: https://$SITE_ID.web.app"
  exit 0
fi

# Handle the most common case: site already exists
if echo "$create_output" | grep -qi "already exists\|site.*exists"; then
  echo "✅ Site '$SITE_ID' already exists"
  echo "🌐 Site URL: https://$SITE_ID.web.app"
  exit 0
fi

# Handle other specific error cases
if echo "$create_output" | grep -qi "permission.*denied\|insufficient.*permission"; then
  echo "❌ Permission denied - service account needs Firebase Hosting Admin role"
  echo "📝 Error details: $create_output"
  exit 1
fi

if echo "$create_output" | grep -qi "invalid.*name\|invalid.*format"; then
  echo "❌ Invalid site name format: $SITE_ID"
  echo "💡 Site names must be lowercase alphanumeric with hyphens only"
  echo "📝 Error details: $create_output"
  exit 1
fi

if echo "$create_output" | grep -qi "quota\|limit.*exceeded"; then
  echo "❌ Quota exceeded - maximum number of sites reached"
  echo "📝 Error details: $create_output"
  exit 1
fi

# Handle authentication issues
if echo "$create_output" | grep -qi "authentication\|unauthenticated\|unauthorized"; then
  echo "❌ Authentication failed"
  echo "💡 Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly"
  echo "📝 Error details: $create_output"
  exit 1
fi

# Handle project access issues
if echo "$create_output" | grep -qi "project.*not.*found\|access.*denied.*project"; then
  echo "❌ Project access denied or project not found: $PROJECT_ID"
  echo "💡 Ensure service account has access to project $PROJECT_ID"
  echo "📝 Error details: $create_output"
  exit 1
fi

# Generic error case
echo "❌ Unknown error creating Firebase Hosting site: $SITE_ID"
echo "📝 Full error output:"
echo "$create_output"
echo ""
echo "💡 Troubleshooting steps:"
echo "   1. Verify site name is unique globally"
echo "   2. Check service account permissions"
echo "   3. Ensure project quota is not exceeded"
echo "   4. Verify authentication is working"
exit 1
