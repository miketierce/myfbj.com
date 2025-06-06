# Node.js 22 Native Module Fixes

## Issue Summary

When migrating to Node.js 22, certain native modules can have compatibility issues during installation and postinstall scripts. The specific errors we encountered were:

1. `better-sqlite3` failing with `Cannot find module './rc'` during prebuild-install
2. `unrs-resolver` failing with `Cannot find module './index.js'` during napi-postinstall
3. Other native module related failures due to changes in Node.js 22 module resolution

## Root Cause Analysis

Node.js 22 has stricter module resolution rules that affect how relative imports are resolved in native module wrappers. The issues happen when:
- A native module's build script uses a relative import like `require('./rc')`
- The module structure in PNPM doesn't match what the script expects
- Node.js 22 fails to resolve these relative paths that worked in earlier versions

## Solution Implemented

We've implemented several fixes to address these issues:

### 1. PNPM Configuration Updates

Added the following PNPM configuration settings to the .npmrc file:
- `node-linker=hoisted` - Provides a more compatible node_modules structure
- `strict-peer-dependencies=false` - Prevents peer dependency issues
- `auto-install-peers=true` - Automatically installs peer dependencies
- `resolution-mode=highest` - Uses the highest available version
- `ignore-compatibility-db=true` - Ignores compatibility database checks
- `prefer-frozen-lockfile=false` - Prevents strict lockfile validation
- `node-gyp-force-latest=true` - Forces the latest node-gyp version
- `symlink=false` - Avoids symlink issues that can cause module resolution problems

### 2. Package Overrides

Created package overrides in package.json:
- `better-sqlite3`: Pinned to version ^8.7.0
- `rc`: Pinned to version 1.2.8
- `node-gyp`: Pinned to version ^10.0.1
- `prebuild-install`: Pinned to version ^7.1.1

### 3. Module Path Fixes

Created a `ci-fix-modules.js` script that:
- Fixes module resolution paths in problematic binary files
- Replaces relative imports (`./rc`) with absolute imports (`rc`)
- Updates import paths for napi-postinstall
- Creates shim files for problematic modules:
  - `rc.js` shim in better-sqlite3/node_modules
  - `index.js` shim in unrs-resolver/node_modules

### 4. Enhanced Safe Installation Process

Enhanced the `ci-safe-install.js` script to:
- Install dependencies globally: node-gyp, prebuild-install, rc
- Create module shims BEFORE installation to prevent errors
- Use NodeDIR and other environment variables to help native builds
- Run the module fix script after installation

### 5. CI Build Process Improvements

Modified the CI build process to:
- Install the latest node-gyp and prebuild-install globally
- Set NODE_GYP_FORCE_PYTHON and NODEDIR environment variables
- Use the `--shamefully-hoist` flag for the first install
- Run the module fix script between installation steps

## Testing

These changes have been tested in the CI pipeline and successfully resolve the native module installation issues with Node.js 22.

## Future Maintenance

When updating to newer versions of Node.js or PNPM, be aware that:

1. Native module compatibility may change with new Node.js versions
2. You may need to update the module fixes in `scripts/ci-fix-modules.js`
3. Verify that package overrides are still required for newer versions

## Implementation Details

### scripts/ci-fix-modules.js

This script fixes runtime module resolution issues by:

1. Patching the prebuild-install script for better-sqlite3:
   - Changes `require('./rc')` to `require('rc')` for proper resolution

2. Patching the napi-postinstall script for unrs-resolver:
   - Changes `require('./index.js')` to `require('@napi-rs/postinstall/index.js')`

3. Fixing wrapper files for native binaries:
   - Adjusts relative paths to use absolute package paths

### scripts/ci-safe-install.js

This script provides a safer installation process by:

1. Backing up package.json before installation
2. Running PNPM install with specific flags for native modules:
   - `--no-frozen-lockfile` to allow necessary updates
   - `--shamefully-hoist` to improve module resolution
3. Running the module fixes script to patch binary wrappers
4. Restoring package.json from backup if installation fails

### CI Workflow Updates

The GitHub Actions workflow has been updated to:

1. Use the existing scripts instead of inline shell script blocks
2. Set proper environment variables for native module builds
3. Fix YAML formatting issues that were causing JSON corruption
1. Native modules may require similar fixes
2. The specific module paths in `ci-fix-modules.js` may need to be updated
3. Package overrides should be periodically reviewed as modules release Node.js 22 compatible versions

## References

- [Node.js 22 Module Resolution Changes](https://nodejs.org/en/blog/release/v22.0.0)
- [PNPM Documentation on Native Modules](https://pnpm.io/faq#does-pnpm-work-with-native-modules)
- [node-gyp Documentation](https://github.com/nodejs/node-gyp)
