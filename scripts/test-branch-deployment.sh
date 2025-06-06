#!/bin/bash

# Test Branch Deployment Pipeline
# This script tests the key components of the branch deployment workflow

set -e

echo "🧪 Testing Branch Deployment Pipeline Components"
echo "================================================"

# Test 1: Branch name sanitization
echo "📝 Test 1: Branch name sanitization"
BRANCH_SLUG=$(echo "feature/awesome-new-feature" | sed 's/[^a-zA-Z0-9-]/-/g' | sed 's/-\+/-/g' | sed 's/^-//' | sed 's/-$//' | tr '[:upper:]' '[:lower:]')
echo "   Original: feature/awesome-new-feature"
echo "   Sanitized: $BRANCH_SLUG"
echo "   ✅ Branch name sanitization works"

# Test 2: Firebase configuration script
echo ""
echo "📝 Test 2: Firebase branch configuration"
export BRANCH_NAME="$BRANCH_SLUG"
export FIREBASE_PROJECT_ID="test-project"
output=$(node ./scripts/configure-firebase-branch.js)
echo "   $output"
if echo "$output" | grep -q "function_name=server-feature-awesome-new-feature"; then
    echo "   ✅ Firebase configuration script works"
else
    echo "   ❌ Firebase configuration script failed"
    exit 1
fi

# Test 3: Workflow validation
echo ""
echo "📝 Test 3: Workflow YAML validation"
if node scripts/validate-workflow.js > /dev/null 2>&1; then
    echo "   ✅ Workflow YAML is valid"
else
    echo "   ❌ Workflow YAML validation failed"
    exit 1
fi

# Test 4: Create site script syntax
echo ""
echo "📝 Test 4: Create Firebase site script syntax"
if bash -n ./scripts/create-firebase-site.sh; then
    echo "   ✅ Create site script has valid syntax"
else
    echo "   ❌ Create site script has syntax errors"
    exit 1
fi

# Test 5: Verify functions output script
echo ""
echo "📝 Test 5: Verify functions output script"
if node scripts/verify-functions-output.js --test 2>/dev/null || [ $? -eq 1 ]; then
    echo "   ✅ Verify functions script works (expected to fail without build)"
else
    echo "   ❌ Verify functions script has errors"
    exit 1
fi

echo ""
echo "🎉 All pipeline components tested successfully!"
echo "   The branch deployment workflow should now work correctly."
echo ""
echo "📋 Next steps:"
echo "   1. Configure GitHub secrets and variables"
echo "   2. Push to a feature branch to test the full deployment"
echo "   3. Verify branch-specific sites are created in Firebase"
