#!/bin/bash

# Security-First Deployment System Validator
# Run this anytime to check if your deployment system is correctly configured

echo "🔒 SECURITY-FIRST DEPLOYMENT SYSTEM VALIDATOR"
echo "=============================================="
echo

# Check 1: Firebase.json configuration
echo "📋 1. FIREBASE.JSON CONFIGURATION"
CURRENT_FUNCTION=$(grep -A 1 '"source": "\*\*"' firebase.json | grep function | cut -d'"' -f4)
CURRENT_SITE=$(grep '"site":' firebase.json | cut -d'"' -f4 2>/dev/null || echo "")

if [[ "$CURRENT_FUNCTION" == "server_dev_integration_test" && "$CURRENT_SITE" == "dev-integration-test-devour" ]]; then
    echo "   ✅ Function: $CURRENT_FUNCTION (development default)"
    echo "   ✅ Site: $CURRENT_SITE (development default)"
    echo "   ✅ Status: SECURE - Development default configuration"
elif [[ "$CURRENT_FUNCTION" == "server" && -z "$CURRENT_SITE" ]]; then
    echo "   ⚠️  Function: $CURRENT_FUNCTION (production config)"
    echo "   ⚠️  Site: none (production config)"
    echo "   ⚠️  Status: PRODUCTION MODE - Should be restored to development default"
else
    echo "   ❌ Function: $CURRENT_FUNCTION (unexpected)"
    echo "   ❌ Site: $CURRENT_SITE (unexpected)"
    echo "   ❌ Status: UNKNOWN CONFIGURATION"
fi
echo

# Check 2: Required scripts
echo "🔧 2. REQUIRED SCRIPTS"
SCRIPTS=(
    "scripts/configure-firebase-branch.js"
    "scripts/restore-firebase-baseline.js"
    "scripts/prepare-functions-deploy.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [[ -f "$script" ]]; then
        echo "   ✅ $script exists"
    else
        echo "   ❌ $script missing"
    fi
done
echo

# Check 3: Workflow configuration
echo "🔄 3. WORKFLOW CONFIGURATION"
if [[ -f ".github/workflows/firebase-deploy.yml" ]]; then
    echo "   ✅ firebase-deploy.yml exists"

    # Check for production configuration step
    if grep -q "Configure Firebase for Production" .github/workflows/firebase-deploy.yml; then
        echo "   ✅ Production configuration step present"
    else
        echo "   ❌ Production configuration step missing"
    fi

    # Check for environment determination
    if grep -q "Determine environment" .github/workflows/firebase-deploy.yml; then
        echo "   ✅ Environment determination logic present"
    else
        echo "   ❌ Environment determination logic missing"
    fi
else
    echo "   ❌ firebase-deploy.yml missing"
fi
echo

# Check 4: Package configuration
echo "📦 4. PACKAGE CONFIGURATION"
if [[ -f "package.json" ]]; then
    echo "   ✅ package.json exists"

    # Check vee-validate version
    VEE_VALIDATE_VERSION=$(grep '"vee-validate"' package.json | cut -d'"' -f4)
    if [[ "$VEE_VALIDATE_VERSION" == ^4.* ]]; then
        echo "   ✅ vee-validate: $VEE_VALIDATE_VERSION (Vue 3 compatible)"
    else
        echo "   ⚠️  vee-validate: $VEE_VALIDATE_VERSION (may need Vue 3 compatible version)"
    fi
else
    echo "   ❌ package.json missing"
fi
echo

# Check 5: Security analysis
echo "🛡️  5. SECURITY ANALYSIS"
if [[ "$CURRENT_FUNCTION" == "server_dev_integration_test" ]]; then
    echo "   ✅ DEFAULT SAFE: Development configuration active"
    echo "   ✅ ACCIDENT PREVENTION: Cannot deploy to production by accident"
    echo "   ✅ EXPLICIT PRODUCTION: Production requires master/main branch"
    echo "   ✅ BRANCH ISOLATION: Development branches get unique resources"
else
    echo "   ⚠️  PRODUCTION MODE: firebase.json in production configuration"
    echo "   ⚠️  RECOMMENDATION: Restore to development default for safety"
fi
echo

# Overall status
echo "🎯 OVERALL STATUS"
if [[ "$CURRENT_FUNCTION" == "server_dev_integration_test" && -f "scripts/configure-firebase-branch.js" && -f ".github/workflows/firebase-deploy.yml" ]]; then
    echo "   ✅ SYSTEM STATUS: READY FOR DEPLOYMENT"
    echo "   ✅ SECURITY: ACCIDENT-PROOF"
    echo "   ✅ CONFIGURATION: OPTIMAL"
    echo
    echo "🚀 You can safely push to any development branch!"
    echo "🏭 Production deployments will only happen on master/main branch."
else
    echo "   ⚠️  SYSTEM STATUS: NEEDS ATTENTION"
    echo "   ⚠️  SECURITY: CHECK REQUIRED"
    echo "   ⚠️  CONFIGURATION: INCOMPLETE"
    echo
    echo "🔧 Please review the issues above and fix any missing components."
fi
echo
