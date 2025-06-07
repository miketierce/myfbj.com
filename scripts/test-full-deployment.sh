#!/bin/bash

# Full Deployment Test Script
# Tests the complete branch deployment pipeline without actually deploying to Firebase

set -e

echo "🚀 Testing Full Branch Deployment Pipeline"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test configuration
TEST_BRANCH="feature-auth-system"
TEST_PROJECT_ID="my-awesome-project-123"
TEST_FUNCTION_NAME="server-${TEST_BRANCH}"
EXPECTED_SITE_ID="${TEST_BRANCH}-myawesom"

echo -e "${YELLOW}📋 Test Configuration:${NC}"
echo "  Branch: $TEST_BRANCH"
echo "  Project ID: $TEST_PROJECT_ID"
echo "  Expected Function: $TEST_FUNCTION_NAME"
echo "  Expected Site ID: $EXPECTED_SITE_ID"
echo ""

# Backup original firebase.json
echo -e "${YELLOW}📦 Backing up original firebase.json...${NC}"
if [ -f firebase.json ]; then
    cp firebase.json firebase.json.backup
    echo "✅ Backup created: firebase.json.backup"
else
    echo -e "${RED}❌ firebase.json not found!${NC}"
    exit 1
fi

# Test 1: Configure Firebase for feature branch
echo -e "${YELLOW}🔧 Test 1: Configuring Firebase for feature branch...${NC}"
node scripts/configure-firebase-branch.js "$TEST_BRANCH" "$TEST_PROJECT_ID"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Branch configuration script executed successfully${NC}"
else
    echo -e "${RED}❌ Branch configuration script failed${NC}"
    exit 1
fi

# Test 2: Verify firebase.json modifications
echo -e "${YELLOW}🔍 Test 2: Verifying firebase.json modifications...${NC}"

# Check if site ID was set correctly
if grep -q "\"site\": \"$EXPECTED_SITE_ID\"" firebase.json; then
    echo -e "${GREEN}✅ Site ID set correctly: $EXPECTED_SITE_ID${NC}"
else
    echo -e "${RED}❌ Site ID not set correctly${NC}"
    echo "Expected: $EXPECTED_SITE_ID"
    echo "Found:"
    grep "site" firebase.json || echo "No site configuration found"
    exit 1
fi

# Check if function name was set correctly
if grep -q "\"function\": \"$TEST_FUNCTION_NAME\"" firebase.json; then
    echo -e "${GREEN}✅ Function name set correctly: $TEST_FUNCTION_NAME${NC}"
else
    echo -e "${RED}❌ Function name not set correctly${NC}"
    echo "Expected: $TEST_FUNCTION_NAME"
    echo "Found:"
    grep "function" firebase.json || echo "No function configuration found"
    exit 1
fi

# Test 3: Test with master branch (should use defaults)
echo -e "${YELLOW}🔧 Test 3: Testing with master branch (should use defaults)...${NC}"

# Restore original firebase.json first
cp firebase.json.backup firebase.json

# Test master branch
output=$(node scripts/configure-firebase-branch.js master "$TEST_PROJECT_ID")
echo "Output: $output"

if echo "$output" | grep -q "uses default firebase.json configuration"; then
    echo -e "${GREEN}✅ Master branch correctly uses default configuration${NC}"
else
    echo -e "${RED}❌ Master branch should use default configuration${NC}"
    exit 1
fi

if echo "$output" | grep -q "function_name=server"; then
    echo -e "${GREEN}✅ Master branch uses default function name 'server'${NC}"
else
    echo -e "${RED}❌ Master branch should use default function name 'server'${NC}"
    exit 1
fi

if echo "$output" | grep -q "hosting_site_id=$"; then
    echo -e "${GREEN}✅ Master branch uses default (empty) site ID${NC}"
else
    echo -e "${RED}❌ Master branch should use empty site ID${NC}"
    exit 1
fi

# Test 4: Validate JSON structure
echo -e "${YELLOW}🔍 Test 4: Validating JSON structure...${NC}"

# Restore feature branch config for JSON validation
node scripts/configure-firebase-branch.js "$TEST_BRANCH" "$TEST_PROJECT_ID" > /dev/null

if node -e "JSON.parse(require('fs').readFileSync('firebase.json', 'utf8')); console.log('Valid JSON')"; then
    echo -e "${GREEN}✅ firebase.json is valid JSON${NC}"
else
    echo -e "${RED}❌ firebase.json is invalid JSON${NC}"
    exit 1
fi

# Test 5: Check required sections exist
echo -e "${YELLOW}🔍 Test 5: Checking required configuration sections...${NC}"

required_sections=("hosting" "firestore" "functions" "storage" "emulators")
for section in "${required_sections[@]}"; do
    if grep -q "\"$section\":" firebase.json; then
        echo -e "${GREEN}✅ Required section '$section' exists${NC}"
    else
        echo -e "${RED}❌ Required section '$section' missing${NC}"
        exit 1
    fi
done

# Test 6: Simulate GitHub Actions environment variables
echo -e "${YELLOW}🔧 Test 6: Testing with environment variables (GitHub Actions style)...${NC}"

# Restore original firebase.json
cp firebase.json.backup firebase.json

# Set environment variables and test
export BRANCH_NAME="$TEST_BRANCH"
export FIREBASE_PROJECT_ID="$TEST_PROJECT_ID"

output=$(node scripts/configure-firebase-branch.js)
echo "Output: $output"

if echo "$output" | grep -q "function_name=$TEST_FUNCTION_NAME"; then
    echo -e "${GREEN}✅ Environment variable mode works correctly${NC}"
else
    echo -e "${RED}❌ Environment variable mode failed${NC}"
    exit 1
fi

# Cleanup
echo -e "${YELLOW}🧹 Cleanup: Restoring original firebase.json...${NC}"
cp firebase.json.backup firebase.json
rm firebase.json.backup

# Unset environment variables
unset BRANCH_NAME
unset FIREBASE_PROJECT_ID

echo ""
echo -e "${GREEN}🎉 All tests passed! Branch deployment pipeline is ready.${NC}"
echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo "✅ Branch configuration script works for feature branches"
echo "✅ Master branch uses default configuration"
echo "✅ firebase.json modifications are correct"
echo "✅ JSON structure remains valid"
echo "✅ All required sections preserved"
echo "✅ Environment variable mode works"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "1. Configure GitHub secrets (DEV_FIREBASE_PROJECT_ID, PROD_FIREBASE_PROJECT_ID, etc.)"
echo "2. Push a feature branch to test the full GitHub Actions workflow"
echo "3. Verify Firebase sites are created automatically"
echo "4. Test deployments to branch-specific URLs"
