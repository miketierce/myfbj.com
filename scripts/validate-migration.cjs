#!/usr/bin/env node

/**
 * Node.js 22 + PNPM 8 Migration Validation Script
 *
 * This script performs a comprehensive validation of the Node.js 22 and PNPM 8
 * migration, checking for common issues and ensuring that native modules work correctly.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const NODE_VERSION = process.version;
const PNPM_VERSION = (() => {
  try {
    return execSync('pnpm --version', { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'Not installed';
  }
})();

// Colorize output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

// Logging utilities
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${colors.reset}${msg}`),
  success: (msg) => console.log(`${colors.green}✓ ${colors.reset}${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${colors.reset}${msg}`),
  error: (msg) => console.log(`${colors.red}✖ ${colors.reset}${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`)
};

// Print header
console.log('\n');
console.log(`${colors.bold}${colors.magenta}============================================${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}  Node.js 22 + PNPM 8 Migration Validator  ${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}============================================${colors.reset}`);
console.log('\n');
log.info(`Node.js version: ${NODE_VERSION}`);
log.info(`PNPM version: ${PNPM_VERSION}`);
console.log('\n');

// Running tests
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

/**
 * Run a test and log the result
 */
function runTest(name, testFn) {
  try {
    log.info(`Testing: ${name}`);
    const result = testFn();
    if (result === true) {
      log.success(`Passed: ${name}`);
      passedTests++;
    } else if (result === 'SKIP') {
      log.warning(`Skipped: ${name}`);
      skippedTests++;
    } else {
      log.error(`Failed: ${name} - ${result || 'No additional information'}`);
      failedTests++;
    }
  } catch (error) {
    log.error(`Failed with exception: ${name} - ${error.message}`);
    failedTests++;
  }
  console.log(''); // Add spacing
}

// 1. Check Node.js version
runTest('Node.js version compatibility', () => {
  const major = parseInt(NODE_VERSION.substring(1).split('.')[0]);
  if (major < 22) {
    return `Node.js version ${NODE_VERSION} is lower than the required v22.x`;
  }
  return true;
});

// 2. Check PNPM version
runTest('PNPM version compatibility', () => {
  if (PNPM_VERSION === 'Not installed') {
    return 'PNPM is not installed';
  }

  const major = parseInt(PNPM_VERSION.split('.')[0]);
  if (major < 8) {
    return `PNPM version ${PNPM_VERSION} is lower than the required v8.x`;
  }
  return true;
});

// 3. Verify package.json overrides
runTest('Package overrides configuration', () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const overrides = packageJson.overrides || {};

    const requiredOverrides = [
      'better-sqlite3',
      'rc',
      'node-gyp',
      'prebuild-install',
      '@napi-rs/postinstall',
      'unrs-resolver'
    ];

    const missingOverrides = requiredOverrides.filter(override => !overrides[override]);

    if (missingOverrides.length > 0) {
      return `Missing overrides: ${missingOverrides.join(', ')}`;
    }

    return true;
  } catch (error) {
    return `Error reading package.json: ${error.message}`;
  }
});

// 4. Check for required script files with .cjs extension
runTest('CJS script files', () => {
  const requiredScripts = [
    'scripts/early-module-fix.cjs',
    'scripts/ci-fix-modules.cjs',
    'scripts/ci-safe-install.cjs'
  ];

  const missingScripts = requiredScripts.filter(script => !fs.existsSync(script));

  if (missingScripts.length > 0) {
    return `Missing scripts: ${missingScripts.join(', ')}`;
  }

  return true;
});

// 5. Check for PNPM config
runTest('PNPM configuration', () => {
  if (!fs.existsSync('.npmrc')) {
    return '.npmrc file not found';
  }

  const npmrc = fs.readFileSync('.npmrc', 'utf8');
  const requiredSettings = [
    'node-linker=hoisted',
    'strict-peer-dependencies=false',
    'auto-install-peers=true',
    'resolution-mode=highest',
    'ignore-compatibility-db=true'
  ];

  const missingSettings = requiredSettings.filter(setting => !npmrc.includes(setting));

  if (missingSettings.length > 0) {
    return `Missing PNPM settings: ${missingSettings.join(', ')}`;
  }

  return true;
});

// 6. Test loading native modules
runTest('Native module loading - better-sqlite3', () => {
  try {
    // Check if module exists without loading it
    if (!fs.existsSync('node_modules/better-sqlite3')) {
      return 'SKIP'; // Skip if not installed
    }

    // Try to require
    require('better-sqlite3');
    return true;
  } catch (error) {
    return `Module load error: ${error.message}`;
  }
});

runTest('Native module loading - unrs-resolver', () => {
  try {
    // Check if module exists without loading it
    if (!fs.existsSync('node_modules/unrs-resolver')) {
      return 'SKIP'; // Skip if not installed
    }

    // Try to require
    require('unrs-resolver');
    return true;
  } catch (error) {
    return `Module load error: ${error.message}`;
  }
});

// 7. Check for shim files
runTest('Module shim files', () => {
  const shimFiles = [
    'node_modules/better-sqlite3/node_modules/rc.js',
    'node_modules/better-sqlite3/rc.js',
    'node_modules/unrs-resolver/node_modules/index.js',
    'node_modules/unrs-resolver/index.js'
  ];

  // Only check for shims if node_modules exists
  if (!fs.existsSync('node_modules')) {
    return 'SKIP'; // Skip if node_modules doesn't exist
  }

  const missingShims = shimFiles.filter(file => !fs.existsSync(file));

  if (missingShims.length > 0) {
    return `Missing shim files: ${missingShims.join(', ')}`;
  }

  return true;
});

// 8. Check GitHub workflow file
runTest('GitHub workflow configuration', () => {
  const workflowFile = '.github/workflows/firebase-deploy.yml';

  if (!fs.existsSync(workflowFile)) {
    return 'Workflow file not found';
  }

  const workflow = fs.readFileSync(workflowFile, 'utf8');
  const requiredPatterns = [
    'early-module-fix.cjs',
    'ci-fix-modules.cjs',
    'ci-safe-install.cjs',
    'NODE_GYP_FORCE_PYTHON=python3',
    'NODEDIR='
  ];

  const missingPatterns = requiredPatterns.filter(pattern => !workflow.includes(pattern));

  if (missingPatterns.length > 0) {
    return `Missing workflow configurations: ${missingPatterns.join(', ')}`;
  }

  return true;
});

// Print summary
log.header('Test Summary');
log.info(`Total tests: ${passedTests + failedTests + skippedTests}`);
log.success(`Passed: ${passedTests}`);
log.warning(`Skipped: ${skippedTests}`);
log.error(`Failed: ${failedTests}`);
console.log('\n');

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);
