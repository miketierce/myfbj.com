#!/usr/bin/env bash

# Firebase Site Creation - Final Solution
# Handles all edge cases discovered during debugging

set -e

SITE_ID="$1"
PROJECT_ID="$2"

if [[ -z "$SITE_ID" || -z "$PROJECT_ID" ]]; then
  echo "❌ Error: SITE_ID and PROJECT_ID are required"
  echo "Usage: $0 <site_id> <project_id>"
  exit 1
fi

echo "🔍 Firebase Site Setup: $SITE_ID (Project: $PROJECT_ID)"

# Function to check if site exists using multiple methods
check_site_exists() {
  local site_id="$1"
  local project_id="$2"

  # Method 1: Direct site check (most reliable)
  if firebase hosting:sites:get "$site_id" --project "$project_id" >/dev/null 2>&1; then
    echo "✅ Site exists (method 1: direct check)"
    return 0
  fi

  # Method 2: List sites and check if our site is in the list
  local sites_output
  if sites_output=$(firebase hosting:sites:list --project "$project_id" 2>/dev/null); then
    if echo "$sites_output" | grep -q "$site_id"; then
      echo "✅ Site exists (method 2: found in sites list)"
      return 0
    fi
  fi

  # Method 3: Try to access the site URL (check if site is live)
  if curl -s --head "https://$site_id.web.app" | head -n 1 | grep -q "200\|301\|302"; then
    echo "✅ Site exists (method 3: URL is accessible)"
    return 0
  fi

  return 1
}

# Check if site already exists
if check_site_exists "$SITE_ID" "$PROJECT_ID"; then
  echo "🌐 Site URL: https://$SITE_ID.web.app"
  exit 0
fi

echo "🏗️  Site doesn't exist, creating: $SITE_ID"

# Attempt to create the site with comprehensive error handling
create_output=$(firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID" 2>&1 || true)
create_exit_code=$?

# Success case
if [ $create_exit_code -eq 0 ]; then
  echo "✅ Successfully created Firebase Hosting site: $SITE_ID"
  echo "🌐 Site URL: https://$SITE_ID.web.app"
  exit 0
fi

# Parse the error output for specific cases
error_lower=$(echo "$create_output" | tr '[:upper:]' '[:lower:]')

# Site already exists (most common case)
if echo "$error_lower" | grep -E "(already exists|site.*exists|exists.*already)" >/dev/null; then
  echo "✅ Site already exists (detected from creation attempt)"
  echo "🌐 Site URL: https://$SITE_ID.web.app"
  exit 0
fi

# Permission errors
if echo "$error_lower" | grep -E "(permission|insufficient|unauthorized|forbidden)" >/dev/null; then
  echo "❌ Permission Error"
  echo "💡 Solution: Ensure service account has 'Firebase Hosting Admin' role"
  echo "📝 Error: $create_output"
  exit 1
fi

# Authentication errors
if echo "$error_lower" | grep -E "(authentication|unauthenticated|credentials|login)" >/dev/null; then
  echo "❌ Authentication Error"
  echo "💡 Solution: Check GOOGLE_APPLICATION_CREDENTIALS environment variable"
  echo "📝 Error: $create_output"
  exit 1
fi

# Project access errors
if echo "$error_lower" | grep -E "(project.*not.*found|access.*denied.*project|invalid.*project)" >/dev/null; then
  echo "❌ Project Access Error"
  echo "💡 Solution: Verify project ID '$PROJECT_ID' and service account access"
  echo "📝 Error: $create_output"
  exit 1
fi

# Invalid site name
if echo "$error_lower" | grep -E "(invalid.*name|invalid.*format|name.*invalid)" >/dev/null; then
  echo "❌ Invalid Site Name: $SITE_ID"
  echo "💡 Solution: Use lowercase alphanumeric characters and hyphens only"
  echo "📝 Error: $create_output"
  exit 1
fi

# Quota/limit errors
if echo "$error_lower" | grep -E "(quota|limit.*exceeded|too many|maximum)" >/dev/null; then
  echo "❌ Quota Exceeded"
  echo "💡 Solution: Delete unused sites or upgrade Firebase plan"
  echo "📝 Error: $create_output"
  exit 1
fi

# Global name conflict (Firebase site names are globally unique)
if echo "$error_lower" | grep -E "(conflict|duplicate|taken|unavailable)" >/dev/null; then
  echo "❌ Site Name Conflict (globally unique)"
  echo "💡 Solution: The name '$SITE_ID' is taken globally. Use a different branch name."
  echo "📝 Error: $create_output"
  exit 1
fi

# Generic error with helpful context
echo "❌ Unknown Error Creating Site: $SITE_ID"
echo "📝 Full Error Output:"
echo "$create_output"
echo ""
echo "🔧 Troubleshooting Guide:"
echo "   1. Check if site name '$SITE_ID' is globally unique"
echo "   2. Verify service account has Firebase Hosting Admin role"
echo "   3. Ensure project '$PROJECT_ID' exists and is accessible"
echo "   4. Check Firebase project quota limits"
echo "   5. Validate site name format (lowercase, alphanumeric, hyphens only)"
echo ""
echo "🌐 If site actually exists, it should be at: https://$SITE_ID.web.app"

exit 1
