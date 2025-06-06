#!/usr/bin/env node

/**
 * CI Safe Install Script
 *
 * This script safely handles the installation process in CI
 * by backing up package.json before making any changes and
 * restoring it if there are issues.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const NODE_DIR = process.env.NODE_DIR || '/opt/hostedtoolcache/node/22.15.0/x64';
const PACKAGE_JSON = 'package.json';
const BACKUP_FILE = 'package.json.bak';

// Log with timestamp
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Run a command and log output
const runCommand = (cmd, options = {}) => {
  log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    log(`Error running command: ${cmd}`);
    log(`Error message: ${error.message}`);
    return false;
  }
};

// Create module shims for better compatibility
const createModuleShims = () => {
  try {
    log('Creating module shims for better compatibility...');

    // Create directories if they don't exist
    fs.mkdirSync('node_modules/better-sqlite3/node_modules', { recursive: true });
    fs.mkdirSync('node_modules/unrs-resolver/node_modules', { recursive: true });

    // Create a shim for rc
    const rcShimPath = path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'node_modules', 'rc.js');
    fs.writeFileSync(rcShimPath, `
// This is a shim for the rc module that is required by better-sqlite3
// It redirects to the actual rc module
module.exports = require('rc');
`);
    log('✅ Created shim for rc module');

    // Create a shim for napi-postinstall index.js
    const napiShimPath = path.join(process.cwd(), 'node_modules', 'unrs-resolver', 'node_modules', 'index.js');
    fs.writeFileSync(napiShimPath, `
// This is a shim for the napi-postinstall index.js that is required by unrs-resolver
// It redirects to the actual module
module.exports = require('@napi-rs/postinstall/index.js');
`);
    log('✅ Created shim for napi-postinstall index.js');

    return true;
  } catch (error) {
    log(`❌ Error creating shims: ${error.message}`);
    return false;
  }
};

// Main function
async function main() {
  log('Starting CI safe install process...');

  // Backup package.json
  try {
    log('Creating package.json backup...');
    fs.copyFileSync(PACKAGE_JSON, BACKUP_FILE);
    log('Backup created successfully.');
  } catch (error) {
    log(`Failed to backup package.json: ${error.message}`);
    process.exit(1);
  }

  try {
    // Install node-gyp and prebuild-install globally
    log('Installing global dependencies...');
    runCommand('npm install -g node-gyp@latest prebuild-install@latest');

    // Install RC module globally (needed for better-sqlite3)
    log('Installing rc module globally...');
    runCommand('npm install -g rc@1.2.8');

    // Create module shims BEFORE installation
    createModuleShims();

    // First install with nodedir to help native modules
    log('Running initial install with nodedir for native modules...');
    const installSuccess = runCommand(
      'NODE_GYP_FORCE_PYTHON=python3 ' +
      `NODEDIR=${NODE_DIR} ` +
      'pnpm install --no-frozen-lockfile --shamefully-hoist'
    );

    if (!installSuccess) {
      throw new Error('Initial install failed');
    }

    // Fix module paths if needed
    const fixScriptPath = './scripts/ci-fix-modules.js';
    if (fs.existsSync(fixScriptPath)) {
      log('Fixing module paths...');
      runCommand(`node ${fixScriptPath}`);
    } else {
      log('No fix script found, skipping module path fixes.');
    }

    // Run second install to update lockfile
    log('Updating lockfile...');
    runCommand(
      'NODE_GYP_FORCE_PYTHON=python3 ' +
      `NODEDIR=${NODE_DIR} ` +
      'pnpm install'
    );

    // Verify native modules were installed correctly
    const betterSqlitePath = path.join('node_modules', 'better-sqlite3');
    if (fs.existsSync(betterSqlitePath)) {
      log('Verifying better-sqlite3 installation...');
      try {
        // Check if compiled binary exists
        const files = fs.readdirSync(path.join(betterSqlitePath, 'build', 'Release'));
        log(`Found ${files.length} files in better-sqlite3 build directory.`);
      } catch (error) {
        log(`Warning: better-sqlite3 build directory not found: ${error.message}`);
      }
    }

    log('CI install completed successfully.');
  } catch (error) {
    log(`Error during installation: ${error.message}`);

    // Restore package.json from backup
    log('Restoring package.json from backup...');
    try {
      fs.copyFileSync(BACKUP_FILE, PACKAGE_JSON);
      log('Restore completed.');
    } catch (restoreError) {
      log(`Failed to restore package.json: ${restoreError.message}`);
    }

    process.exit(1);
  } finally {
    // Clean up backup file if everything went well
    if (fs.existsSync(BACKUP_FILE)) {
      log('Cleaning up backup file...');
      try {
        fs.unlinkSync(BACKUP_FILE);
      } catch (error) {
        log(`Failed to remove backup file: ${error.message}`);
      }
    }
  }
}

main();
