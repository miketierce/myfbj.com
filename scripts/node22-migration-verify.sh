#!/usr/bin/env bash

# node22-migration-verify.sh
# Comprehensive verification script for Node.js 22 + PNPM 8 migration
# Run this script to check if all migration tasks are completed

set -e # Exit on error

# Print header
echo "=================================================="
echo "Node.js 22 + PNPM 8 Migration Verification"
echo "=================================================="

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
  if [ "$1" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $2"
  else
    echo -e "${RED}❌ FAIL${NC}: $2"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
}

# Function to print section header
print_section() {
  echo -e "\n${BOLD}${BLUE}$1${NC}"
  echo -e "${BLUE}$(printf '%.s-' $(seq 1 ${#1}))${NC}"
}

FAILED_CHECKS=0
TOTAL_CHECKS=0

print_section "1. Node.js Version Check"

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1 | tr -d 'v')
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ "$NODE_MAJOR_VERSION" -ge 22 ]; then
  print_status 0 "Node.js version is $NODE_VERSION (>= 22 required)"
else
  print_status 1 "Node.js version is $NODE_VERSION (>= 22 required)"
  echo -e "${YELLOW}  → Run 'nvm use' or install Node.js 22+ to continue${NC}"
fi

# Check for .node-version file
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f ".node-version" ] && [ "$(cat .node-version | cut -d '.' -f 1)" -ge 22 ]; then
  print_status 0 ".node-version file exists and specifies Node.js 22+"
else
  print_status 1 ".node-version file missing or not set to Node.js 22+"
  echo -e "${YELLOW}  → Create a .node-version file with '22.0.0' or higher${NC}"
fi

print_section "2. PNPM Version Check"

# Check PNPM version
if command_exists pnpm; then
  PNPM_VERSION=$(pnpm --version)
  PNPM_MAJOR_VERSION=$(echo $PNPM_VERSION | cut -d '.' -f 1)
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ "$PNPM_MAJOR_VERSION" -ge 8 ]; then
    print_status 0 "PNPM version is $PNPM_VERSION (>= 8 required)"
  else
    print_status 1 "PNPM version is $PNPM_VERSION (>= 8 required)"
    echo -e "${YELLOW}  → Run 'npm install -g pnpm@8' to upgrade${NC}"
  fi
else
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  print_status 1 "PNPM is not installed"
  echo -e "${YELLOW}  → Run 'npm install -g pnpm@8' to install${NC}"
fi

# Check PNPM configuration
echo "Checking PNPM configuration..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f ".npmrc" ]; then
  PNPM_SETTINGS_FOUND=0
  if grep -q "node-linker=" .npmrc && grep -q "strict-peer-dependencies=" .npmrc; then
    PNPM_SETTINGS_FOUND=1
  fi

  if [ "$PNPM_SETTINGS_FOUND" -eq 1 ]; then
    print_status 0 ".npmrc file contains PNPM 8 settings"
  else
    print_status 1 ".npmrc file exists but may be missing required PNPM 8 settings"
    echo -e "${YELLOW}  → Run './scripts/ci-prepare-workspace.sh' to fix${NC}"
  fi
else
  print_status 1 ".npmrc file is missing"
  echo -e "${YELLOW}  → Run './scripts/ci-prepare-workspace.sh' to create it${NC}"
fi

print_section "3. Firebase Tools Version Check"

# Check Firebase Tools version
if command_exists firebase; then
  FIREBASE_VERSION=$(firebase --version)
  FIREBASE_MAJOR_VERSION=$(echo $FIREBASE_VERSION | cut -d '.' -f 1)
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ "$FIREBASE_MAJOR_VERSION" -ge 14 ]; then
    print_status 0 "Firebase Tools version is $FIREBASE_VERSION (>= 14 required)"
  else
    print_status 1 "Firebase Tools version is $FIREBASE_VERSION (>= 14 required)"
    echo -e "${YELLOW}  → Run 'npm install -g firebase-tools@14.6.0' to upgrade${NC}"
  fi
else
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  print_status 1 "Firebase Tools is not installed"
  echo -e "${YELLOW}  → Run 'npm install -g firebase-tools@14.6.0' to install${NC}"
fi

print_section "4. Project Configuration Check"

# Check package.json engine settings
echo "Checking package.json..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f "package.json" ]; then
  if grep -q '"node": *"\(\^22\|>=22\|22\)' package.json; then
    print_status 0 "package.json has correct Node.js 22 engine requirement"
  else
    print_status 1 "package.json is missing Node.js 22 engine requirement"
    echo -e "${YELLOW}  → Add '\"engines\": {\"node\": \">=22\"}' to package.json${NC}"
  fi
else
  print_status 1 "package.json is missing"
  echo -e "${RED}  → Critical error: package.json not found!${NC}"
fi

# Check functions/package.json engine settings
echo "Checking functions/package.json..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f "functions/package.json" ]; then
  if grep -q '"node": *"\(\^22\|>=22\|22\)' functions/package.json; then
    print_status 0 "functions/package.json has correct Node.js 22 engine requirement"
  else
    print_status 1 "functions/package.json is missing Node.js 22 engine requirement"
    echo -e "${YELLOW}  → Add '\"engines\": {\"node\": \"22\"}' to functions/package.json${NC}"
  fi
else
  print_status 1 "functions/package.json is missing"
  echo -e "${YELLOW}  → Create functions/package.json with Node.js 22 requirements${NC}"
fi

# Check if pnpm-workspace.yaml exists and includes functions
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f "pnpm-workspace.yaml" ] && grep -q "functions" pnpm-workspace.yaml; then
  print_status 0 "pnpm-workspace.yaml exists and includes functions directory"
else
  print_status 1 "pnpm-workspace.yaml is missing or doesn't include functions directory"
  echo -e "${YELLOW}  → Run './scripts/ci-prepare-workspace.sh' to fix${NC}"
fi

print_section "5. Migration Support Scripts Check"

# Check for required scripts
REQUIRED_SCRIPTS=(
  "scripts/prepare-functions-deploy.sh"
  "scripts/ci-prepare-workspace.sh"
  "scripts/verify-functions-output.js"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -f "$script" ] && [ -s "$script" ]; then
    print_status 0 "$script exists"
  else
    print_status 1 "$script is missing or empty"
  fi
done

print_section "6. GitHub Actions Workflow Check"

# Check if GitHub Actions workflow exists
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f ".github/workflows/firebase-deploy.yml" ]; then
  WORKFLOW_FILE=".github/workflows/firebase-deploy.yml"
  print_status 0 "GitHub Actions workflow file exists"

  # Check for Node 22 specification
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if grep -q "NODE_VERSION: *22" "$WORKFLOW_FILE"; then
    print_status 0 "GitHub Actions workflow specifies Node.js 22"
  else
    print_status 1 "GitHub Actions workflow doesn't specify Node.js 22"
    echo -e "${YELLOW}  → Add 'NODE_VERSION: 22' to env section${NC}"
  fi

  # Check for PNPM 8 specification
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if grep -q "pnpm/action-setup@v2" "$WORKFLOW_FILE" && grep -q "version: 8" "$WORKFLOW_FILE"; then
    print_status 0 "GitHub Actions workflow uses PNPM 8"
  else
    print_status 1 "GitHub Actions workflow doesn't specify PNPM 8"
    echo -e "${YELLOW}  → Update PNPM action with 'version: 8.15.4' or higher${NC}"
  fi

  # Check for Firebase Tools 14+
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if grep -q "firebase-tools@14" "$WORKFLOW_FILE"; then
    print_status 0 "GitHub Actions workflow uses Firebase Tools v14+"
  else
    print_status 1 "GitHub Actions workflow doesn't specify Firebase Tools v14+"
    echo -e "${YELLOW}  → Update to 'firebase-tools@14.6.0'${NC}"
  fi

  # Check for no-frozen-lockfile flag
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if grep -q -- "--no-frozen-lockfile" "$WORKFLOW_FILE"; then
    print_status 0 "GitHub Actions workflow uses --no-frozen-lockfile"
  else
    print_status 1 "GitHub Actions workflow doesn't use --no-frozen-lockfile"
    echo -e "${YELLOW}  → Add '--no-frozen-lockfile' to pnpm install command${NC}"
  fi

  # Check for prepare-functions-deploy.sh script
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if grep -q "prepare-functions-deploy.sh" "$WORKFLOW_FILE"; then
    print_status 0 "GitHub Actions workflow uses prepare-functions-deploy.sh"
  else
    print_status 1 "GitHub Actions workflow doesn't use prepare-functions-deploy.sh"
    echo -e "${YELLOW}  → Add script call before functions deployment${NC}"
  fi
else
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  print_status 1 "GitHub Actions workflow file is missing"
  echo -e "${RED}  → Critical error: GitHub Actions workflow file not found!${NC}"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 5))
  FAILED_CHECKS=$((FAILED_CHECKS + 5))
fi

print_section "7. Final Summary"

PASSED_CHECKS=$((TOTAL_CHECKS - FAILED_CHECKS))
PASS_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo -e "${BOLD}Migration Verification Results:${NC}"
echo -e "  ${GREEN}Passed: $PASSED_CHECKS/$TOTAL_CHECKS checks ($PASS_PERCENTAGE%)${NC}"
if [ $FAILED_CHECKS -gt 0 ]; then
  echo -e "  ${RED}Failed: $FAILED_CHECKS/$TOTAL_CHECKS checks${NC}"
fi

echo ""
if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ MIGRATION VERIFICATION PASSED${NC}"
  echo -e "${GREEN}Your project appears to be ready for Node.js 22 and PNPM 8${NC}"
elif [ $PASS_PERCENTAGE -ge 80 ]; then
  echo -e "${YELLOW}${BOLD}⚠️ MIGRATION VERIFICATION MOSTLY SUCCESSFUL${NC}"
  echo -e "${YELLOW}Fix the remaining issues to complete the migration${NC}"
else
  echo -e "${RED}${BOLD}❌ MIGRATION VERIFICATION FAILED${NC}"
  echo -e "${RED}Several issues must be fixed to complete the migration${NC}"
fi

exit $FAILED_CHECKS
