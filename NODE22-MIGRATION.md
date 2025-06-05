# Node 22 + PNPM 8 Migration Guide

## Overview

This project has been migrated to Node.js 22 with PNPM 8 package manager. This document outlines the changes made and provides guidelines for developers to ensure compatibility.

## Key Changes

1. **Node.js Version**: Now requires Node.js 22 (previously Node.js 18)
2. **Package Manager**: Standardized on PNPM 8
3. **Firebase Functions Runtime**: Updated to Node.js 22 runtime
4. **Firebase Tools**: Using version 13.48.0 (compatible with Node.js 22)

## Setup for Local Development

### Option 1: Local Setup

1. **Install Node.js 22**:
   - Using nvm: `nvm install 22 && nvm use 22`
   - Or download from [nodejs.org](https://nodejs.org/)

2. **Install PNPM 8**:
   ```bash
   npm install -g pnpm@8
   ```

3. **Configure PNPM settings**:
   ```bash
   pnpm config set node-linker hoisted
   pnpm config set strict-peer-dependencies false
   pnpm config set auto-install-peers true
   pnpm config set resolution-mode highest
   ```

4. **Install dependencies**:
   ```bash
   pnpm install
   ```

### Option 2: Using Docker (Recommended for consistent environments)

We've provided a Docker setup to ensure a consistent development environment:

```bash
# Start development server
pnpm docker:dev

# Or just start Firebase emulators
pnpm docker:emulators
```

## CI/CD Pipeline Changes

The GitHub Actions workflow has been updated to:
1. Use Node.js 22
2. Use PNPM 8 for package management
3. Deploy Firebase Functions with Node.js 22 runtime
4. Update all Firebase dependencies to latest versions

## Troubleshooting

### Common Issues

1. **Peer Dependency Conflicts**:
   - PNPM 8 settings in `.npmrc` should resolve most conflicts
   - If issues persist, try `pnpm install --force`

2. **Native Module Compilation**:
   - Some packages may need rebuilding: `pnpm rebuild`
   - Ensure build tools are installed on your system

3. **Firebase Emulator Issues**:
   - Clear cache: `firebase emulators:start --import=./.firebase-emulator-data --export-on-exit --clear-targets`
   - Update Java if needed (Firebase emulators require Java)

### Compatibility Notes

- **Nuxt 3**: Fully compatible with Node.js 22
- **Firebase Functions**: Node.js 22 runtime supported since Firebase Functions v6.0
- **Firebase SDKs**: Updated to latest versions compatible with Node.js 22

## Additional Resources

- [Node.js 22 Release Notes](https://nodejs.org/en/blog/release/v22.0.0)
- [PNPM Documentation](https://pnpm.io/motivation)
- [Firebase Functions Node.js Runtime](https://firebase.google.com/docs/functions/manage-functions#set_nodejs_version)

## Contact

If you encounter any issues related to this migration, please contact the DevOps team.
