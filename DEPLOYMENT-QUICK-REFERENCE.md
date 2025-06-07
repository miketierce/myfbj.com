# 🚀 DEPLOYMENT SYSTEM QUICK REFERENCE

## ⚡ QUICK COMMANDS

### Deploy to Development (Any Branch)
```bash
git checkout -b feature-branch
git add .
git commit -m "feat: new feature"
git push origin feature-branch
```
**Result**: Safe deployment to `feature-branch-devour` site with `server_feature_branch` function

### Deploy to Production (Master/Main Only)
```bash
git checkout master
git add .
git commit -m "release: production update"
git push origin master
```
**Result**: Production deployment with default `server` function

### Validate System Status
```bash
./validate-deployment-system.sh
```

### Check Current Configuration
```bash
echo "Function: $(grep -A 1 '"source": "\*\*"' firebase.json | grep function | cut -d'"' -f4)"
echo "Site: $(grep '"site":' firebase.json | cut -d'"' -f4)"
```

## 🔒 SECURITY MODEL

| Branch Type | Environment | Project ID | Function Name | Site ID | Safety |
|-------------|-------------|------------|---------------|---------|---------|
| Any development | development | DEV_FIREBASE_PROJECT_ID | server_{branch} | {branch}-devour | ✅ Safe |
| master/main | production | PROD_FIREBASE_PROJECT_ID | server | none (default) | ⚠️ Explicit |

## 🛡️ SECURITY FEATURES

- ✅ **Default Safe**: Development configuration prevents accidents
- ✅ **Explicit Production**: Only master/main triggers production
- ✅ **Branch Isolation**: Each branch gets unique Firebase resources
- ✅ **Project Separation**: Dev and prod use separate Firebase projects

## 🔧 TROUBLESHOOTING

### If firebase.json shows production config:
```bash
node ./scripts/restore-firebase-baseline.js
```

### If deployment fails:
1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Run `./validate-deployment-system.sh`

### For auth domain issues:
```bash
node ./scripts/configure-auth-domains.js
```

## 📋 SYSTEM FILES

- `firebase.json` - Always defaults to development
- `.github/workflows/firebase-deploy.yml` - Deployment automation
- `scripts/configure-firebase-branch.js` - Branch configuration
- `scripts/prepare-functions-deploy.sh` - Function preparation
- `validate-deployment-system.sh` - System validator

## 🎯 DEPLOYMENT FLOW

1. **Push to dev branch** → Development deployment (safe)
2. **Push to master** → Production deployment (explicit)
3. **firebase.json** → Always returns to development default
4. **Branch isolation** → Each dev branch gets unique resources

---

**Status**: ✅ READY | **Security**: 🛡️ ACCIDENT-PROOF | **Production**: 🏭 EXPLICIT ONLY
