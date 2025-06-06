#!/usr/bin/env bash

# test-migration-scripts.sh
# This script tests all the migration support scripts to ensure they're working correctly

set -e # Exit on error

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No color

# Function to test script execution
test_script() {
  local script_path=$1
  local script_name=$(basename "$script_path")

  echo -e "\n${YELLOW}Testing $script_name...${NC}"

  if [ -f "$script_path" ]; then
    if [[ $script_path == *.js ]]; then
      if node "$script_path" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $script_name executed successfully${NC}"
        return 0
      else
        echo -e "${RED}❌ $script_name failed to execute${NC}"
        return 1
      fi
    elif [[ $script_path == *.sh ]]; then
      if bash "$script_path" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $script_name executed successfully${NC}"
        return 0
      else
        echo -e "${RED}❌ $script_name failed to execute${NC}"
        return 1
      fi
    else
      echo -e "${RED}❌ Unknown script type: $script_path${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ Script not found: $script_path${NC}"
    return 1
  fi
}

# Main execution
echo -e "${YELLOW}Testing all migration support scripts...${NC}"

# List of scripts to test
SCRIPTS=(
  "scripts/ci-prepare-workspace.sh"
  "scripts/verify-functions-output.js"
  "scripts/prepare-functions-deploy.sh"
  "scripts/check-firebase-tools.js"
  "scripts/node22-migration-verify.sh"
)

# Test each script
FAILED=0
for script in "${SCRIPTS[@]}"; do
  if ! test_script "$script"; then
    FAILED=$((FAILED + 1))
  fi
done

# Summary
echo -e "\n${YELLOW}Test Summary:${NC}"
echo -e "Total scripts: ${#SCRIPTS[@]}"
echo -e "Successful: $((${#SCRIPTS[@]} - FAILED))"
echo -e "Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}All migration scripts are working!${NC}"
  exit 0
else
  echo -e "\n${RED}Some migration scripts are not working correctly!${NC}"
  exit 1
fi
