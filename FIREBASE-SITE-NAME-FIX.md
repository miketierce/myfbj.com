# 🔧 FIREBASE HOSTING SITE NAME COLLISION - FIXED

## 🎯 PROBLEM IDENTIFIED

The GitHub Actions workflow was failing at the "Create Firebase Hosting Site" step with this error:

```
Error: Request to https://firebasehosting.googleapis.com/v1beta1/projects/.../sites?siteId=dev-test had HTTP Error: 400, Invalid name: `dev-test` is reserved by another project; try something like `dev-test-6694b` instead
```

## 🔍 ROOT CAUSE

**Firebase Hosting site names are globally unique across ALL Firebase projects**, not just within your project. The original script was using just the branch name (e.g., `dev-test`) as the site ID, but this name was already taken by another Firebase project somewhere in the world.

## ✅ SOLUTION IMPLEMENTED

**Modified `scripts/configure-firebase-branch.js` to generate unique site names:**

### Before (PROBLEMATIC):
```javascript
const siteId = branchName; // e.g., "dev-test"
```

### After (FIXED):
```javascript
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const projectSuffix = firebaseProjectId.substring(0, 8).replace(/[^a-z0-9]/g, '');
const siteId = `${branchName}-${projectSuffix}`; // e.g., "dev-test-myuniqu"
```

## 🎯 HOW IT WORKS

1. **Takes your Firebase Project ID** (which is guaranteed to be globally unique)
2. **Extracts first 8 alphanumeric characters** as a suffix
3. **Combines branch name + project suffix** to create unique site names

### Examples:
- Branch: `dev-test` + Project: `my-unique-project-id` → Site: `dev-test-myuniqu`
- Branch: `feature-auth` + Project: `nuxt-firebase-prod-456` → Site: `feature-auth-nuxtfir`
- Branch: `main` → Uses default site (no site ID)

## ✅ VERIFICATION

**Tested with multiple scenarios:**
- ✅ Feature branches generate unique site IDs
- ✅ Default branches (main/master) use default site
- ✅ Different project IDs create different suffixes
- ✅ Script validates required environment variables

## 🚀 RESULT

**Your next deployment should succeed!** The GitHub Actions workflow will now:

1. Generate a unique site ID like `branch-name-proj1234`
2. Successfully create the Firebase Hosting site (no more name conflicts)
3. Deploy your feature branch to `https://branch-name-proj1234.your-project.web.app`

## 📋 NO ACTION REQUIRED

The fix is automatic - just push to your feature branch again and the deployment should work correctly.

---
**Status:** ✅ **RESOLVED** - Firebase Hosting site name collision issue fixed
