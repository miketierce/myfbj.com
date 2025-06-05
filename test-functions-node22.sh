#!/usr/bin/env bash

# Test Firebase Functions with Node.js 22
# This script sends test requests to your deployed functions to verify Node.js 22 compatibility
# Usage: ./test-functions-node22.sh [project-id] [function-name]

set -e # Exit on any error

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}Firebase Functions Node.js 22 Compatibility Test${NC}"
echo "----------------------------------------------"

# Check for project ID argument
PROJECT_ID=$1
if [ -z "$PROJECT_ID" ]; then
  # Try to get default project
  PROJECT_ID=$(firebase use --json | jq -r '.current.projectId' 2>/dev/null)

  if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
    echo -e "${RED}Error: No Firebase project specified${NC}"
    echo "Please provide a project ID as the first argument or use firebase use <project-id>"
    exit 1
  fi
fi

echo -e "${BLUE}Using Firebase project: ${PROJECT_ID}${NC}"

# Function name to test (default: healthcheck)
FUNCTION_NAME=${2:-"healthcheck"}
echo -e "${BLUE}Testing function: ${FUNCTION_NAME}${NC}\n"

# Region (default: us-central1)
REGION=${3:-"us-central1"}

# Get function URL
FUNCTION_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}"
echo -e "Function URL: ${FUNCTION_URL}\n"

# Test the function with a simple HTTP request
echo -e "${BOLD}Sending request to function...${NC}"
HTTP_STATUS=$(curl -s -o response.json -w "%{http_code}" "${FUNCTION_URL}")

# Check if the request was successful
if [ "$HTTP_STATUS" -ne 200 ]; then
  echo -e "\n${RED}Error: Function returned HTTP status ${HTTP_STATUS}${NC}"
  echo -e "Response:"
  cat response.json
  rm response.json
  exit 1
fi

# Parse the response
echo -e "\n${BOLD}Function response:${NC}"
cat response.json

# Check if the response includes Node.js version
NODE_VERSION=$(cat response.json | jq -r '.nodeVersion' 2>/dev/null)
NODE_MAJOR_VERSION=$(cat response.json | jq -r '.nodeMajorVersion' 2>/dev/null)

if [ -n "$NODE_VERSION" ] && [ "$NODE_VERSION" != "null" ]; then
  echo -e "\n${BOLD}Function is running on Node.js version: ${NODE_VERSION}${NC}"

  if [ "$NODE_MAJOR_VERSION" = "22" ] || [[ "$NODE_VERSION" == v22* ]]; then
    echo -e "${GREEN}✅ Function is running on Node.js 22 as expected${NC}"
  else
    echo -e "${RED}❌ Function is NOT running on Node.js 22. It's running on: ${NODE_VERSION}${NC}"
    echo -e "You may need to redeploy with the correct runtime settings."
  fi
else
  echo -e "\n${YELLOW}⚠️ Function response does not include Node.js version information${NC}"
  echo -e "Consider adding version information to the function response for easier verification."
fi

# Clean up
rm response.json

echo -e "\n${BOLD}Test complete!${NC}"
