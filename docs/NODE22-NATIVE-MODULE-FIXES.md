# Node.js 22 Native Module Fixes

## Issue Summary

When migrating to Node.js 22, certain native modules can have compatibility issues during installation and postinstall scripts. The specific errors we encountered were:

1. `better-sqlite3` failing with `Cannot find module './rc'` during prebuild-install
2. `unrs-resolver` failing with `Cannot find module './index.js'` during napi-postinstall
3. Other native module related failures due to changes in Node.js 22 module resolution

## Solution Implemented

We've implemented several fixes to address these issues:

### 1. PNPM Configuration Updates

Added the following PNPM configuration settings:
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

### 4. CI Build Process Improvements

Modified the CI build process to:
- Install the latest node-gyp and prebuild-install globally
- Set NODE_GYP_FORCE_PYTHON and NODEDIR environment variables
- Use the `--shamefully-hoist` flag for the first install
- Run the module fix script between installation steps

## Testing

These changes have been tested in the CI pipeline and successfully resolve the native module installation issues with Node.js 22.

## Future Maintenance

When updating to newer versions of Node.js or PNPM, be aware that:
1. Native modules may require similar fixes
2. The specific module paths in `ci-fix-modules.js` may need to be updated
3. Package overrides should be periodically reviewed as modules release Node.js 22 compatible versions

## References

- [Node.js 22 Module Resolution Changes](https://nodejs.org/en/blog/release/v22.0.0)
- [PNPM Documentation on Native Modules](https://pnpm.io/faq#does-pnpm-work-with-native-modules)
- [node-gyp Documentation](https://github.com/nodejs/node-gyp)
