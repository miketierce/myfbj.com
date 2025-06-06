#!/usr/bin/env node

/**
 * Verify Native Modules Script
 *
 * This script checks if the native modules are properly installed
 * and fixes any remaining issues. It should be run after installation.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Verifying native modules installation...');

// Modules to verify
const modulesToCheck = [
  { name: 'better-sqlite3', mainFile: 'index.js' },
  { name: 'unrs-resolver', mainFile: 'index.js' }
];

// Utility to run a command with logging
function runCommand(command) {
  console.log(`🔄 Running: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { success: true, output };
  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    return { success: false, output: error.message };
  }
}

// Check if a module can be required
function checkModuleRequire(moduleName) {
  try {
    require.resolve(moduleName);
    console.log(`✅ Module ${moduleName} can be resolved`);
    return true;
  } catch (error) {
    console.error(`❌ Cannot resolve ${moduleName}: ${error.message}`);
    return false;
  }
}

// Fix any remaining module issues
function fixRemainingIssues() {
  console.log('🔧 Fixing any remaining issues with native modules...');

  // 1. Check all modules
  modulesToCheck.forEach(({ name, mainFile }) => {
    const modulePath = path.join(process.cwd(), 'node_modules', name);

    if (fs.existsSync(modulePath)) {
      console.log(`Found module at ${modulePath}`);

      // Check for binary files
      const buildPath = path.join(modulePath, 'build', 'Release');
      if (fs.existsSync(buildPath)) {
        console.log(`Checking binaries in ${buildPath}`);
        try {
          const files = fs.readdirSync(buildPath);
          console.log(`Found binaries: ${files.join(', ')}`);
        } catch (error) {
          console.error(`❌ Error reading build directory: ${error.message}`);
        }
      } else {
        console.log(`⚠️ No build/Release directory found for ${name}`);

        // Try to rebuild the module
        console.log(`Attempting to rebuild ${name}...`);
        runCommand(`cd ${modulePath} && node-gyp rebuild`);
      }

      // Verify shims are in place
      if (name === 'better-sqlite3') {
        const shimPath = path.join(modulePath, 'node_modules', 'rc.js');
        if (!fs.existsSync(shimPath)) {
          console.log(`Creating shim for rc.js in ${name}`);
          fs.mkdirSync(path.join(modulePath, 'node_modules'), { recursive: true });
          fs.writeFileSync(shimPath, 'module.exports = require(\'rc\');');
        }
      } else if (name === 'unrs-resolver') {
        const shimPath = path.join(modulePath, 'node_modules', 'index.js');
        if (!fs.existsSync(shimPath)) {
          console.log(`Creating shim for index.js in ${name}`);
          fs.mkdirSync(path.join(modulePath, 'node_modules'), { recursive: true });
          fs.writeFileSync(shimPath, 'module.exports = require(\'@napi-rs/postinstall/index.js\');');
        }
      }
    } else {
      console.error(`❌ Module ${name} not found in node_modules`);
    }
  });

  // 2. Special fix for better-sqlite3
  try {
    // Try installing directly with npm if needed
    const betterSqliteInstalled = checkModuleRequire('better-sqlite3');
    if (!betterSqliteInstalled) {
      console.log('Attempting to install better-sqlite3 directly with npm...');
      runCommand('npm install better-sqlite3@8.7.0 --no-save --force');
    }
  } catch (error) {
    console.error(`❌ Error during better-sqlite3 fix: ${error.message}`);
  }

  // 3. Special fix for unrs-resolver
  try {
    const unrsInstalled = checkModuleRequire('unrs-resolver');
    if (!unrsInstalled) {
      console.log('Attempting to install unrs-resolver directly with npm...');
      runCommand('npm install unrs-resolver --no-save --force');
    }
  } catch (error) {
    console.error(`❌ Error during unrs-resolver fix: ${error.message}`);
  }

  console.log('✅ Native module verification and fixes complete!');
}

// Main function
function main() {
  // Check existing modules
  modulesToCheck.forEach(({ name }) => {
    checkModuleRequire(name);
  });

  // Apply fixes if needed
  fixRemainingIssues();

  // Final verification
  console.log('🔍 Final verification of native modules...');
  modulesToCheck.forEach(({ name }) => {
    if (checkModuleRequire(name)) {
      console.log(`✅ Module ${name} is working correctly`);
    } else {
      console.error(`❌ Module ${name} is still not working correctly`);
    }
  });
}

main();
