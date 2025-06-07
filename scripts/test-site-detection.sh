#!/bin/bash

# Test Firebase site existence checking logic
# This tests the jq filtering without requiring Firebase CLI authentication

echo "🧪 Testing Firebase Site Existence Detection"
echo "============================================"

# Create mock JSON response that mimics Firebase hosting:sites:list output
cat > /tmp/mock_sites.json << 'EOF'
[
  {
    "name": "projects/914399023591/sites/default",
    "defaultUrl": "https://my-project.web.app",
    "appId": "1:914399023591:web:abc123"
  },
  {
    "name": "projects/914399023591/sites/dev-test-devour",
    "defaultUrl": "https://dev-test-devour.web.app",
    "appId": "1:914399023591:web:def456"
  },
  {
    "name": "projects/914399023591/sites/feature-auth-system",
    "defaultUrl": "https://feature-auth-system.web.app",
    "appId": "1:914399023591:web:ghi789"
  }
]
EOF

echo "📋 Mock Firebase sites list:"
cat /tmp/mock_sites.json | jq -r '.[] | .name'
echo ""

# Test cases
test_cases=("dev-test-devour" "feature-auth-system" "non-existent-site" "default")

for site_id in "${test_cases[@]}"; do
    echo "🔍 Testing site: $site_id"

    # Test the exact logic from our script
    if cat /tmp/mock_sites.json | jq -e ".[] | select(.name == \"$site_id\" or .site == \"$site_id\" or (.name | endswith(\"/$site_id\")))" > /dev/null 2>&1; then
        echo "✅ Site '$site_id' found using current logic"
    else
        echo "❌ Site '$site_id' NOT found using current logic"
    fi

    # Test alternative logic that matches the full path
    if cat /tmp/mock_sites.json | jq -e ".[] | select(.name | endswith(\"/$site_id\"))" > /dev/null 2>&1; then
        echo "✅ Site '$site_id' found using path-based logic"
    else
        echo "❌ Site '$site_id' NOT found using path-based logic"
    fi

    echo ""
done

# Cleanup
rm /tmp/mock_sites.json

echo "💡 Analysis:"
echo "The Firebase API returns site names in the format 'projects/PROJECT_ID/sites/SITE_ID'"
echo "We need to check if the name ends with '/SITE_ID' to properly detect existing sites."
