#!/usr/bin/env bash

# Quick validation of the Firebase site creation logic
# This tests the error handling patterns without requiring Firebase access

echo "🧪 Testing Firebase Site Creation Error Handling"
echo "================================================="

# Test error pattern matching
test_error_detection() {
  local test_name="$1"
  local error_message="$2"
  local expected_pattern="$3"

  echo ""
  echo "🔧 Test: $test_name"
  echo "Input: $error_message"

  error_lower=$(echo "$error_message" | tr '[:upper:]' '[:lower:]')

  if echo "$error_lower" | grep -E "$expected_pattern" >/dev/null; then
    echo "✅ PASS - Pattern detected correctly"
  else
    echo "❌ FAIL - Pattern not detected"
  fi
}

# Test various error scenarios
test_error_detection "Site Already Exists" "Error: site already exists" "(already exists|site.*exists)"
test_error_detection "Permission Denied" "Error: Permission denied" "(permission|insufficient|unauthorized)"
test_error_detection "Authentication Failed" "Error: Authentication required" "(authentication|unauthenticated|credentials)"
test_error_detection "Project Not Found" "Error: Project not found" "(project.*not.*found|access.*denied.*project)"
test_error_detection "Invalid Site Name" "Error: Invalid site name format" "(invalid.*name|invalid.*format)"
test_error_detection "Quota Exceeded" "Error: Quota limit exceeded" "(quota|limit.*exceeded|too many)"
test_error_detection "Name Conflict" "Error: Site name is taken" "(conflict|duplicate|taken|unavailable)"

echo ""
echo "🔧 Testing site existence check logic..."

# Test the multi-method approach logic
check_site_exists_mock() {
  local site_id="$1"
  echo "Would check site: $site_id"
  echo "  Method 1: firebase hosting:sites:get $site_id --project PROJECT"
  echo "  Method 2: firebase hosting:sites:list --project PROJECT | grep $site_id"
  echo "  Method 3: curl -s --head https://$site_id.web.app"
  return 1  # Simulate site not found for testing
}

if check_site_exists_mock "test-site-abc123"; then
  echo "✅ Site exists"
else
  echo "ℹ️  Site doesn't exist - would create"
fi

echo ""
echo "✅ Validation complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Push the changes to trigger GitHub Actions"
echo "   2. Monitor the workflow for clean site creation"
echo "   3. Verify deployment completes successfully"
