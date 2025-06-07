#!/usr/bin/env bash

# Simplified Firebase site creation script
# Focuses on the most reliable approach: attempt creation and handle errors gracefully

set -e # Exit on error

SITE_ID="$1"
PROJECT_ID="$2"

if [[ -z "$SITE_ID" || -z "$PROJECT_ID" ]]; then
  echo "❌ Error: SITE_ID and PROJECT_ID are required"
  echo "Usage: $0 <site_id> <project_id>"
  exit 1
fi

echo "🔍 Creating/Verifying Firebase Hosting site '$SITE_ID' in project '$PROJECT_ID'..."

# Primary approach: Just try to create the site and handle the response
echo "🏗️  Attempting to create Firebase Hosting site: $SITE_ID"

# Use create command with error capture (don't exit on error for this command)
set +e
create_output=$(firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID" 2>&1)
create_exit_code=$?
set -e

echo "📝 Firebase CLI output:"
echo "$create_output"
echo ""

# Analyze the result
if [ $create_exit_code -eq 0 ]; then
  echo "✅ Successfully created Firebase Hosting site: $SITE_ID"
  echo "🌐 Site will be available at: https://$SITE_ID.web.app"
  exit 0
elif echo "$create_output" | grep -qi "already exists"; then
  echo "✅ Site '$SITE_ID' already exists - this is fine!"
  echo "🌐 Site is available at: https://$SITE_ID.web.app"
  exit 0
elif echo "$create_output" | grep -qi "permission\|unauthorized\|forbidden"; then
  echo "❌ Permission denied"
  echo "💡 Ensure your service account has 'Firebase Hosting Admin' role"
  echo "💡 Check Firebase Console > IAM & Admin > IAM"
  exit 1
elif echo "$create_output" | grep -qi "invalid\|malformed"; then
  echo "❌ Invalid site name: $SITE_ID"
  echo "💡 Site names must be lowercase letters, numbers, and hyphens only"
  echo "💡 Generated name: $SITE_ID"
  exit 1
elif echo "$create_output" | grep -qi "quota\|limit\|maximum"; then
  echo "❌ Quota limit reached"
  echo "💡 This project has reached the maximum number of Firebase Hosting sites"
  echo "💡 Consider deleting unused sites or upgrading your plan"
  exit 1
else
  echo "❌ Unknown error creating site: $SITE_ID"
  echo "📝 Full error output above"
  echo "💡 This needs manual investigation"
  exit 1
fi
