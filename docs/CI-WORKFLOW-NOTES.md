# CI Workflow Notes

## Double-Build Issue Fix

**Problem**: The project was queuing to build twice on every commit to master.

**Root Cause**: When the workflow updated the `pnpm-lock.yaml` file and committed it back to the repository, it triggered another workflow run, despite having `[skip ci]` in the commit message.

**Solution**:

1. **Fixed Commit Message Format**:
   - Changed the commit message format to `[skip ci][ci skip][no ci] chore: update pnpm-lock.yaml (automated)`
   - Removed spaces between skip CI tags to ensure they're properly parsed
   - This format ensures maximum compatibility with GitHub Actions skip mechanisms

2. **Limited Branch Triggers**:
   - Removed the wildcard pattern `'*'` from the workflow trigger configuration
   - This prevents the workflow from running on any branch not specifically listed

3. **Added `--no-verify` Flag to Git Push**:
   - This prevents any client-side git hooks from running during the push
   - Helps avoid potential issues with CI triggers

## Native Module Installation Fix

**Problem**: Node.js 22 with PNPM 8 was failing to install native modules, specifically:
- `better-sqlite3` with error `Cannot find module './rc'`
- `unrs-resolver` with error `Cannot find module './index.js'`

**Root Cause**: Node.js 22 module resolution changes affecting how relative paths in native module wrappers are resolved.

**Solution**:

1. **Early Module Fixes**:
   - Created `early-module-fix.js` script to run before installation
   - Creates necessary directories and shim files preemptively
   - Installs required global packages with specific versions (node-gyp@10.0.1, rc@1.2.8)
   - Must run this script before any installation attempts

2. **Module Shim Strategy**:
   - Created shim files in place of the expected modules
   - Created directory structures to support module resolution
   - Added symlinks where possible to redirect module imports

3. **Comprehensive Fixing Script**:
   - Enhanced `ci-fix-modules.js` to check multiple possible paths
   - Added pattern matching to fix different file variations
   - Implemented multiple fallback strategies

4. **Installation Process Improvements**:
   - Enhanced error handling and recovery in the safe install process
   - Added validation steps with detailed logging
   - Ensured proper cleanup of temporary files

## Best Practices for CI/CD Workflows

1. **Always use skip CI flags** for automated commits that don't need to trigger builds:
   - `[skip ci]` - Standard GitHub format
   - `[ci skip]` - Alternative format
   - `[no ci]` - Additional format
   - For maximum compatibility, use all three without spaces between them

2. **Use specific branch patterns** instead of wildcards in workflow triggers

3. **Avoid commit loops** by:
   - Using meaningful commit detection (e.g., only commit if there are actual changes)
   - Using proper skip CI flags in commit messages
   - Setting conditions on job execution to skip if the commit came from a bot

4. **Handle native module issues** with Node.js version upgrades:
   - Create early fix scripts that run before dependencies are installed
   - Use multiple strategies (shims, symlinks, overrides)
   - Install key packages globally with specific versions:
     ```
     npm install -g node-gyp@10.0.1 prebuild-install@7.1.1 @napi-rs/cli
     npm install -g rc@1.2.8
     ```
   - Pass the correct environment variables during installation:
     ```
     NODE_GYP_FORCE_PYTHON=python3 NODEDIR=/opt/hostedtoolcache/node/22.15.0/x64
     ```
   - Ensure that scripts run in the correct order (early fixes → install → post-install fixes)

## Testing CI Workflow Changes

When making changes to GitHub Actions workflows:

1. Make small, incremental changes
2. Check the workflow run logs for any issues
3. Verify that automated commits do not trigger additional builds
4. After fixing CI issues, consider adding validation checks to prevent regression

## CommonJS vs ES Modules in CI Scripts

**Problem**: With `"type": "module"` set in package.json, all `.js` files are treated as ES modules, but many CI scripts rely on CommonJS features like `require()`.

**Root Cause**: ES modules and CommonJS use different module systems with different syntax:
- ES modules use `import`/`export` statements
- CommonJS uses `require()`/`module.exports`

**Solution**:

1. **Use the `.cjs` Extension**:
   - Renamed all CI scripts from `.js` to `.cjs` to force CommonJS mode regardless of package.json settings
   - Updated all GitHub workflow references to use the new file extensions
   - Created a consistent pattern for all scripts that need CommonJS features

2. **Script Update Process**:
   ```bash
   # Example commands used to convert scripts
   cp ./scripts/early-module-fix.js ./scripts/early-module-fix.cjs
   cp ./scripts/ci-fix-modules.js ./scripts/ci-fix-modules.cjs
   cp ./scripts/ci-safe-install.js ./scripts/ci-safe-install.cjs
   ```

3. **Workflow File Updates**:
   ```yaml
   # Updated script references in workflow
   chmod +x ./scripts/early-module-fix.cjs
   chmod +x ./scripts/ci-fix-modules.cjs
   chmod +x ./scripts/ci-safe-install.cjs

   # Run with node explicitly
   node ./scripts/early-module-fix.cjs
   ```

4. **Validation Process**:
   - Added new verification scripts with `.cjs` extension
   - Test explicitly with Node.js 22 to ensure compatibility

Last updated: June 5, 2025
