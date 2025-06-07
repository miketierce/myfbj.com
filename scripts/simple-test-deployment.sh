#!/bin/bash

echo "Testing Branch Deployment Pipeline"
echo "=================================="

# Test configuration
TEST_BRANCH="feature-auth-system"
TEST_PROJECT_ID="my-awesome-project-123"
TEST_FUNCTION_NAME="server-${TEST_BRANCH}"
EXPECTED_SITE_ID="${TEST_BRANCH}-myawesom"

echo "Test Configuration:"
echo "  Branch: $TEST_BRANCH"
echo "  Project ID: $TEST_PROJECT_ID"
echo "  Expected Function: $TEST_FUNCTION_NAME"
echo "  Expected Site ID: $EXPECTED_SITE_ID"
echo ""

# Backup original firebase.json
echo "Backing up original firebase.json..."
if [ -f firebase.json ]; then
    cp firebase.json firebase.json.backup
    echo "✅ Backup created: firebase.json.backup"
else
    echo "❌ firebase.json not found!"
    exit 1
fi

# Test 1: Configure Firebase for feature branch
echo "Test 1: Configuring Firebase for feature branch..."
echo "Running: node scripts/configure-firebase-branch.js $TEST_BRANCH $TEST_PROJECT_ID"
node scripts/configure-firebase-branch.js "$TEST_BRANCH" "$TEST_PROJECT_ID"

if [ $? -eq 0 ]; then
    echo "✅ Branch configuration script executed successfully"
else
    echo "❌ Branch configuration script failed"
    exit 1
fi

# Test 2: Check site ID
echo "Test 2: Checking site ID configuration..."
if grep -q "\"site\": \"$EXPECTED_SITE_ID\"" firebase.json; then
    echo "✅ Site ID set correctly: $EXPECTED_SITE_ID"
else
    echo "❌ Site ID not set correctly"
    echo "Expected: $EXPECTED_SITE_ID"
    echo "Found:"
    grep "site" firebase.json || echo "No site configuration found"
fi

# Test 3: Check function name
echo "Test 3: Checking function name configuration..."
if grep -q "\"function\": \"$TEST_FUNCTION_NAME\"" firebase.json; then
    echo "✅ Function name set correctly: $TEST_FUNCTION_NAME"
else
    echo "❌ Function name not set correctly"
    echo "Expected: $TEST_FUNCTION_NAME"
    echo "Found:"
    grep "function" firebase.json || echo "No function configuration found"
fi

# Restore original firebase.json
echo "Restoring original firebase.json..."
cp firebase.json.backup firebase.json
rm firebase.json.backup

echo ""
echo "Test completed!"
