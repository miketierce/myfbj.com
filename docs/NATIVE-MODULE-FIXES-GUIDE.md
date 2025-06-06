# Node.js 22 + PNPM 8 Native Module Fix Guide

This guide explains the implementation details of the fixes applied to make native modules work correctly with Node.js 22 and PNPM 8.

## Problem Overview

When migrating from older Node.js versions to Node.js 22, several native modules experience issues during installation and at runtime:

1. **Module Resolution Changes**: Node.js 22 has stricter module resolution, affecting how relative imports like `require('./rc')` work in binary wrapper files.

2. **PNPM Module Structure**: PNPM's dependency structure combined with Node.js 22's resolution changes can cause modules to fail to find their dependencies.

3. **C++ Addon Compilation**: Native modules using node-gyp may fail to compile with newer Node.js versions due to ABI changes.

## Specific Issues Fixed

### 1. better-sqlite3

**Issue**: The module fails to install with `Cannot find module './rc'` during the prebuild-install script execution.

**Root Cause**: In the prebuild-install script, there's a relative import `require('./rc')` that fails with Node.js 22's module resolution.

**Fix Applied**:
- Replaced the relative path `require('./rc')` with absolute `require('rc')` in the prebuild-install script
- Created a shim module at `node_modules/better-sqlite3/node_modules/rc.js` that redirects to the global `rc` module
- Created symlinks to ensure the `rc` module is available in multiple expected locations
- Used package overrides to use newer compatible versions of the module

### 2. unrs-resolver

**Issue**: The module fails during the postinstall step with `Cannot find module './index.js'` in the napi-postinstall script.

**Root Cause**: Similar to better-sqlite3, this is a module resolution issue with a relative import.

**Fix Applied**:
- Replaced the relative path `require('./index.js')` with `require('@napi-rs/postinstall/index.js')`
- Created a shim module to redirect imports
- Used package overrides to ensure a compatible version

### 3. Multiple Installation Points

**Issue**: Depending on how modules are installed (direct, transitive), fix locations may vary.

**Fix Applied**:
- Added multiple potential paths to check and fix in the scripts
- Created the directory structure early in the installation process
- Fixed paths in multiple locations to ensure at least one succeeds

## Implementation Details

### 1. early-module-fix.js

This script runs early in the CI process to:
- Create necessary directory structures before modules are installed
- Create shim files to handle relative imports
- Install required global packages
- Set up PNPM configuration for better compatibility

### 2. ci-fix-modules.js

This script runs after initial installation to:
- Find and fix module resolution paths in binary wrapper scripts
- Check multiple potential locations for each file
- Create symlinks between modules for better resolution
- Apply fixes to wrapper files that load native binaries

### 3. ci-safe-install.js

This script provides a safer installation process:
- Backs up package.json before installation
- Uses proper environment variables for native compilation
- Runs the fix modules script at the right time
- Handles errors and ensures proper cleanup

### 4. PNPM Configuration

The following PNPM settings have been added for better compatibility:
```
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
resolution-mode=highest
ignore-compatibility-db=true
prefer-frozen-lockfile=false
node-gyp-force-latest=true
symlink=false
```

### 5. Package Overrides

Added package overrides in `package.json` to enforce compatible versions:
```json
{
  "overrides": {
    "better-sqlite3": "^8.7.0",
    "rc": "1.2.8",
    "node-gyp": "^10.0.1",
    "prebuild-install": "^7.1.1"
  }
}
```

## Testing the Fixes

1. Run the `test-native-module-fixes.sh` script to verify the fixes work locally:
   ```bash
   ./scripts/test-native-module-fixes.sh
   ```

2. Check CI pipeline logs for any native module installation errors.

3. If issues persist, look for:
   - Missing files or directories in node_modules
   - Changes in binary wrapper locations
   - New dependency paths that need fixing

## Maintenance

When updating Node.js or PNPM versions:
1. Test the native modules again
2. Update the module fix scripts if needed
3. Adjust package overrides as newer versions become compatible

## References

- [Node.js 22 Module Resolution Changes](https://nodejs.org/en/blog/release/v22.0.0)
- [PNPM Documentation on Native Modules](https://pnpm.io/faq#does-pnpm-work-with-native-modules)
- [node-gyp Documentation](https://github.com/nodejs/node-gyp)
- [better-sqlite3 GitHub Issues](https://github.com/WiseLibs/better-sqlite3/issues)

Last updated: June 5, 2025
