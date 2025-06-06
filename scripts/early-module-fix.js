#!/usr/bin/env node

/**
 * Early Module Fix Script
 *
 * This script runs as early as possible in the CI process to
 * create necessary shims and fix paths for native modules
 * before they're processed by pnpm install.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Create early directories
const directories = [
  'node_modules/better-sqlite3/node_modules',
  'node_modules/unrs-resolver/node_modules',
  'node_modules/prebuild-install/node_modules',
  'node_modules/@napi-rs/postinstall/node_modules',
  // Add these additional directories to ensure all paths are covered
  'node_modules/better-sqlite3/build/Release',
  'node_modules/better-sqlite3/lib',
  'node_modules/unrs-resolver/build',
  'node_modules/.bin'
];

console.log('🔧 Creating early module directories and shims...');

// Create base node_modules directory first
if (!fs.existsSync('node_modules')) {
  try {
    fs.mkdirSync('node_modules', { recursive: true });
    console.log('✅ Created base node_modules directory');
  } catch (error) {
    console.log(`⚠️ Could not create node_modules directory: ${error.message}`);
  }
}

// Create directories and shim files
directories.forEach(dir => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } catch (error) {
    console.log(`⚠️ Could not create ${dir}: ${error.message}`);
  }
});

// Create shim files with more comprehensive coverage
const shims = [
  {
    path: 'node_modules/better-sqlite3/node_modules/rc.js',
    content: 'module.exports = require(\'rc\');'
  },
  {
    path: 'node_modules/unrs-resolver/node_modules/index.js',
    content: 'module.exports = require(\'@napi-rs/postinstall/index.js\');'
  },
  {
    path: 'node_modules/prebuild-install/node_modules/rc.js',
    content: 'module.exports = require(\'rc\');'
  },
  // Add additional locations for better coverage
  {
    path: 'node_modules/better-sqlite3/rc.js',
    content: 'module.exports = require(\'rc\');'
  },
  {
    path: 'node_modules/unrs-resolver/index.js',
    content: 'module.exports = require(\'@napi-rs/postinstall/index.js\');'
  },
  {
    path: 'node_modules/better-sqlite3/lib/rc.js',
    content: 'module.exports = require(\'rc\');'
  }
];

// Create shims in all the required locations
shims.forEach(shim => {
  try {
    fs.writeFileSync(shim.path, shim.content);
    console.log(`✅ Created shim file: ${shim.path}`);

    // Also ensure the proper permissions
    try {
      fs.chmodSync(shim.path, 0o755); // Make executable
    } catch (chmodError) {
      console.log(`⚠️ Could not set permissions on ${shim.path}: ${chmodError.message}`);
    }
  } catch (error) {
    console.log(`⚠️ Could not create shim ${shim.path}: ${error.message}`);
  }
});

// Create a .npmrc file with Node.js 22 + PNPM 8 compatible settings if it doesn't exist
if (!fs.existsSync('.npmrc')) {
  try {
    const npmrcContent = `
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
resolution-mode=highest
ignore-compatibility-db=true
prefer-frozen-lockfile=false
node-gyp-force-latest=true
symlink=false
`;
    fs.writeFileSync('.npmrc', npmrcContent);
    console.log('✅ Created .npmrc file with Node.js 22 compatible settings');
  } catch (error) {
    console.log(`⚠️ Could not create .npmrc file: ${error.message}`);
  }
}

// Install global packages that help with module resolution
try {
  console.log('Installing essential packages globally...');
  execSync('npm install -g rc@1.2.8 prebuild-install@7.1.1 node-gyp@10.0.1 @napi-rs/cli',
    { stdio: 'inherit' });
  console.log('✅ Installed required global packages');
} catch (error) {
  console.log(`⚠️ Could not install global packages: ${error.message}`);
}

console.log('✅ Early module fixes complete!');
