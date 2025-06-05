#!/usr/bin/env node

/**
 * Node 22 + PNPM 8 Verification Script
 *
 * This script performs checks to verify that the project is correctly
 * configured for Node 22 with PNPM 8.
 *
 * Usage:
 *   node verify-node22.js           # Interactive mode
 *   node verify-node22.js --ci      # CI mode (non-interactive, exits with error code)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Helper functions
const log = (message, color = colors.reset) => console.log(`${color}${message}${colors.reset}`);
const success = (message) => log(`✅ ${message}`, colors.green);
const warning = (message) => log(`⚠️  ${message}`, colors.yellow);
const error = (message) => log(`❌ ${message}`, colors.red);
const info = (message) => log(`ℹ️  ${message}`, colors.blue);
const header = (message) => log(`\n${colors.bold}${colors.cyan}${message}${colors.reset}\n`);

// Check if we're running Node 22
async function checkNodeVersion() {
  header('Checking Node.js Version');

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0], 10);

  if (majorVersion === 22) {
    success(`Running Node.js ${nodeVersion}`);
  } else if (majorVersion > 22) {
    warning(`Running Node.js ${nodeVersion} (higher than expected Node.js 22)`);
  } else {
    error(`Running Node.js ${nodeVersion} (expected Node.js 22)`);
    return false;
  }

  return true;
}

// Check if PNPM is version 8
async function checkPnpmVersion() {
  header('Checking PNPM Version');

  try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(pnpmVersion.split('.')[0], 10);

    if (majorVersion === 8) {
      success(`Running PNPM ${pnpmVersion}`);
    } else if (majorVersion > 8) {
      warning(`Running PNPM ${pnpmVersion} (higher than expected PNPM 8)`);
    } else {
      error(`Running PNPM ${pnpmVersion} (expected PNPM 8)`);
      return false;
    }

    return true;
  } catch (err) {
    error('PNPM is not installed or not accessible in PATH');
    error(err.message);
    return false;
  }
}

// Check Firebase config
async function checkFirebaseConfig() {
  header('Checking Firebase Configuration');

  try {
    const firebaseJson = JSON.parse(
      await fs.readFile(path.join(projectRoot, 'firebase.json'), 'utf8')
    );

    if (firebaseJson.functions && firebaseJson.functions.runtime === 'nodejs22') {
      success('Firebase Functions runtime set to Node.js 22');
    } else {
      error(`Firebase Functions runtime is not set to Node.js 22 (found: ${firebaseJson.functions?.runtime || 'undefined'
        })`);
      return false;
    }

    return true;
  } catch (err) {
    error('Could not read or parse firebase.json');
    error(err.message);
    return false;
  }
}

// Check package.json to ensure Node 22 engine requirement
async function checkPackageJson() {
  header('Checking Package Engine Requirements');

  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8')
    );

    if (packageJson.engines && packageJson.engines.node && packageJson.engines.node.includes('22')) {
      success(`Package.json requires Node ${packageJson.engines.node}`);
    } else {
      error(`Package.json does not specify Node 22 requirement (found: ${packageJson.engines?.node || 'undefined'
        })`);
      return false;
    }

    if (packageJson.engines && packageJson.engines.pnpm && packageJson.engines.pnpm.includes('8')) {
      success(`Package.json requires PNPM ${packageJson.engines.pnpm}`);
    } else {
      error(`Package.json does not specify PNPM 8 requirement (found: ${packageJson.engines?.pnpm || 'undefined'
        })`);
      return false;
    }

    return true;
  } catch (err) {
    error('Could not read or parse package.json');
    error(err.message);
    return false;
  }
}

// Check for PNPM configuration files
async function checkPnpmConfig() {
  header('Checking PNPM Configuration');

  let hasNpmrc = false;
  let hasPnpmrc = false;
  let hasWorkspaceConfig = false;

  try {
    try {
      const npmrcContent = await fs.readFile(path.join(projectRoot, '.npmrc'), 'utf8');
      hasNpmrc = true;

      if (npmrcContent.includes('node-linker=hoisted')) {
        success('.npmrc contains node-linker=hoisted setting');
      } else {
        warning('.npmrc exists but might be missing node-linker=hoisted setting');
      }
    } catch (err) {
      warning('.npmrc file not found');
    }

    try {
      const pnpmrcContent = await fs.readFile(path.join(projectRoot, '.pnpmrc'), 'utf8');
      hasPnpmrc = true;
      success('.pnpmrc file found');
    } catch (err) {
      warning('.pnpmrc file not found');
    }

    try {
      const workspaceContent = await fs.readFile(path.join(projectRoot, 'pnpm-workspace.yaml'), 'utf8');
      hasWorkspaceConfig = true;
      success('pnpm-workspace.yaml found');
    } catch (err) {
      warning('pnpm-workspace.yaml file not found');
    }

    return hasNpmrc || hasPnpmrc;
  } catch (err) {
    error('Error checking PNPM configuration');
    error(err.message);
    return false;
  }
}

// Main verification function
async function verifyNode22Setup() {
  header('NODE 22 + PNPM 8 VERIFICATION');
  info(`Date: ${new Date().toLocaleString()}`);
  info(`Project directory: ${projectRoot}`);

  const checks = [
    { name: 'Node.js Version Check', fn: checkNodeVersion },
    { name: 'PNPM Version Check', fn: checkPnpmVersion },
    { name: 'Firebase Config Check', fn: checkFirebaseConfig },
    { name: 'Package.json Check', fn: checkPackageJson },
    { name: 'PNPM Config Check', fn: checkPnpmConfig }
  ];

  const results = [];

  for (const check of checks) {
    info(`Running: ${check.name}`);
    try {
      const passed = await check.fn();
      results.push({ name: check.name, passed });
    } catch (err) {
      error(`Unexpected error in ${check.name}`);
      error(err.message);
      results.push({ name: check.name, passed: false, error: err });
    }
  }

  // Summary
  header('VERIFICATION SUMMARY');

  const passedChecks = results.filter(r => r.passed).length;
  const totalChecks = results.length;
  const passPercent = Math.round((passedChecks / totalChecks) * 100);

  results.forEach(result => {
    if (result.passed) {
      success(`${result.name}: PASSED`);
    } else {
      error(`${result.name}: FAILED`);
    }
  });

  log('\n');
  if (passedChecks === totalChecks) {
    success(`🎉 All checks passed! Your project is ready for Node 22 + PNPM 8.`);
  } else {
    warning(`${passedChecks}/${totalChecks} checks passed (${passPercent}%)`);
    error(`Please fix the failed checks to ensure full Node 22 + PNPM 8 compatibility.`);

    if (totalChecks - passedChecks <= 2) {
      warning("You're almost there! Just a few more issues to fix.");
    }
  }

  return passedChecks === totalChecks;
}

// Run the verification
verifyNode22Setup()
  .then(success => {
    // Exit with success (0) or failure (1) code
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    error('Verification script failed with an error');
    error(err.message);
    process.exit(1);
  });
