#!/usr/bin/env bash

# Debug version of create-firebase-site.sh for testing
# This script provides extensive debugging output

set -e # Exit on error
set -x # Debug mode - show every command

SITE_ID="$1"
PROJECT_ID="$2"

echo "🔧 DEBUG: Script started with parameters:"
echo "  SITE_ID: '$SITE_ID'"
echo "  PROJECT_ID: '$PROJECT_ID'"
echo "  Current directory: $(pwd)"
echo "  Firebase CLI version:"
firebase --version || echo "Firebase CLI not available"

if [[ -z "$SITE_ID" || -z "$PROJECT_ID" ]]; then
  echo "❌ Error: SITE_ID and PROJECT_ID are required"
  echo "Usage: $0 <site_id> <project_id>"
  exit 1
fi

echo "🔧 DEBUG: Checking Firebase authentication..."
firebase projects:list > /dev/null || echo "⚠️  Firebase auth might be failing"

echo "🔧 DEBUG: Setting Firebase project..."
firebase use "$PROJECT_ID" || echo "⚠️  Failed to set project"

echo "🔧 DEBUG: Testing direct site check..."
direct_check_output=$(firebase hosting:sites:get "$SITE_ID" --project "$PROJECT_ID" 2>&1)
direct_check_exit=$?
echo "  Direct check exit code: $direct_check_exit"
echo "  Direct check output: $direct_check_output"

if [ $direct_check_exit -eq 0 ]; then
  echo "✅ Site '$SITE_ID' already exists (detected via direct check)"
  exit 0
fi

echo "🔧 DEBUG: Testing sites list..."
list_output=$(firebase hosting:sites:list --project "$PROJECT_ID" 2>&1)
list_exit=$?
echo "  List exit code: $list_exit"
echo "  List output: $list_output"

if [ $list_exit -eq 0 ] && echo "$list_output" | grep -q "$SITE_ID"; then
  echo "✅ Site '$SITE_ID' found in sites list"
  exit 0
fi

echo "🔧 DEBUG: Attempting site creation..."
create_output=$(firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID" 2>&1)
create_exit=$?
echo "  Create exit code: $create_exit"
echo "  Create output: $create_output"

if [ $create_exit -eq 0 ]; then
  echo "✅ Successfully created Firebase Hosting site: $SITE_ID"
elif echo "$create_output" | grep -qi "already exists"; then
  echo "✅ Site '$SITE_ID' already exists (detected from creation attempt)"
  exit 0
else
  echo "❌ Failed to create Firebase Hosting site: $SITE_ID"
  exit 1
fi
