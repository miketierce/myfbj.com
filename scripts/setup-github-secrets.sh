#!/bin/bash

# GitHub Secrets Setup Helper
# This script helps you prepare the required secrets for branch deployment

echo "🔐 GitHub Secrets Setup Helper"
echo "=============================="
echo ""
echo "This script will help you prepare the required secrets for branch deployment."
echo "You'll need to manually add these to your GitHub repository settings."
echo ""

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}📋 Required GitHub Secrets:${NC}"
echo ""

echo -e "${BLUE}🔧 Development Environment:${NC}"
echo "DEV_FIREBASE_PROJECT_ID"
echo "DEV_FIREBASE_SERVICE_ACCOUNT"
echo "DEV_ENVKEYS_BASE64"
echo "DEV_RECAPTCHA_SITE_KEY"
echo "DEV_RECAPTCHA_SECRET_KEY"
echo ""

echo -e "${BLUE}🚀 Production Environment:${NC}"
echo "PROD_FIREBASE_PROJECT_ID"
echo "PROD_FIREBASE_SERVICE_ACCOUNT"
echo "PROD_ENVKEYS_BASE64"
echo "PROD_RECAPTCHA_SITE_KEY"
echo "PROD_RECAPTCHA_SECRET_KEY"
echo ""

echo -e "${BLUE}🎨 Optional:${NC}"
echo "FONTAWESOME_TOKEN"
echo ""

echo -e "${YELLOW}📝 Setup Instructions:${NC}"
echo ""
echo "1. Go to your GitHub repository"
echo "2. Navigate to Settings > Secrets and variables > Actions"
echo "3. Click 'New repository secret' for each secret"
echo ""

echo -e "${YELLOW}🔑 Service Account JSON:${NC}"
echo "For DEV_FIREBASE_SERVICE_ACCOUNT and PROD_FIREBASE_SERVICE_ACCOUNT:"
echo "1. Go to Firebase Console > Project Settings > Service Accounts"
echo "2. Click 'Generate new private key'"
echo "3. Copy the entire JSON content (including curly braces)"
echo "4. Paste as the secret value"
echo ""

echo -e "${YELLOW}🌐 Environment Variables (Base64):${NC}"
echo "For DEV_ENVKEYS_BASE64 and PROD_ENVKEYS_BASE64:"
echo ""

if [ -f "devEnv_base64.txt" ]; then
    echo -e "${GREEN}✅ Found devEnv_base64.txt${NC}"
    echo "Content for DEV_ENVKEYS_BASE64:"
    echo "$(cat devEnv_base64.txt)"
    echo ""
else
    echo "❌ devEnv_base64.txt not found"
    echo "Create your .env file and run: base64 -w 0 .env > devEnv_base64.txt"
    echo ""
fi

if [ -f "prodEnv_base64.txt" ]; then
    echo -e "${GREEN}✅ Found prodEnv_base64.txt${NC}"
    echo "Content for PROD_ENVKEYS_BASE64:"
    echo "$(cat prodEnv_base64.txt)"
    echo ""
else
    echo "❌ prodEnv_base64.txt not found"
    echo "Create your production .env file and run: base64 -w 0 .env.prod > prodEnv_base64.txt"
    echo ""
fi

echo -e "${YELLOW}🎯 Quick Test:${NC}"
echo "After setting up secrets, create a test branch:"
echo ""
echo "git checkout -b feature-test"
echo "git push origin feature-test"
echo ""
echo "Then watch the GitHub Actions workflow run!"
echo ""

echo -e "${YELLOW}🔗 Useful Links:${NC}"
echo "• GitHub Secrets: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo "• Firebase Console: https://console.firebase.google.com/"
echo "• Workflow Status: https://github.com/YOUR_USERNAME/YOUR_REPO/actions"
echo ""

echo -e "${GREEN}🎉 Ready to deploy!${NC}"
