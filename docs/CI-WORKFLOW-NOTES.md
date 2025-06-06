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

## Testing CI Workflow Changes

When making changes to GitHub Actions workflows:

1. Make small, incremental changes
2. Check the workflow run logs for any issues
3. Verify that automated commits do not trigger additional builds
4. After fixing CI issues, consider adding validation checks to prevent regression

Last updated: June 5, 2025
