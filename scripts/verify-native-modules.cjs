#!/usr/bin/env node

/**
 * Native Module Verification Script
 *
 * This script verifies that native modules are properly installed
 * and can be required without errors. It specifically tests:
 * - better-sqlite3
 * - unrs-resolver
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying native module installations...');

// Utility function to check if a module can be required
function testRequire(moduleName) {
  try {
    require(moduleName);
    console.log(`✅ Successfully required ${moduleName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to require ${moduleName}: ${error.message}`);
    return false;
  }
}

// Test better-sqlite3
console.log('\n📦 Testing better-sqlite3...');
if (testRequire('better-sqlite3')) {
  try {
    const Database = require('better-sqlite3');
    // Try to create an in-memory database to test functionality
    const db = new Database(':memory:');
    db.prepare('SELECT 1 AS test').get();
    console.log('✅ Successfully created and queried an in-memory SQLite database');
    db.close();
  } catch (error) {
    console.error(`❌ Failed to use better-sqlite3: ${error.message}`);
  }
} else {
  console.log('⚠️ Skipping better-sqlite3 functional test due to require failure');
}

// Check for better-sqlite3 compiled binary
console.log('\n🔍 Checking for better-sqlite3 compiled binary...');
const betterSqlitePath = path.join(process.cwd(), 'node_modules', 'better-sqlite3');
if (fs.existsSync(betterSqlitePath)) {
  const releasePath = path.join(betterSqlitePath, 'build', 'Release');
  if (fs.existsSync(releasePath)) {
    try {
      const files = fs.readdirSync(releasePath);
      const nodeBinaries = files.filter(file => file.endsWith('.node'));
      if (nodeBinaries.length > 0) {
        console.log(`✅ Found compiled binary: ${nodeBinaries.join(', ')}`);
      } else {
        console.log('⚠️ No .node binary found in build/Release directory');
      }
    } catch (error) {
      console.error(`❌ Error reading Release directory: ${error.message}`);
    }
  } else {
    console.log('⚠️ No build/Release directory found for better-sqlite3');
  }
} else {
  console.log('⚠️ better-sqlite3 module directory not found');
}

// Test unrs-resolver
console.log('\n📦 Testing unrs-resolver...');
if (testRequire('unrs-resolver')) {
  try {
    const unrsResolver = require('unrs-resolver');
    console.log('✅ Successfully loaded unrs-resolver module');
  } catch (error) {
    console.error(`❌ Failed to use unrs-resolver: ${error.message}`);
  }
}

// Check Node.js version and environment
console.log('\n🔍 Checking Node.js environment...');
console.log(`Node.js version: ${process.version}`);
console.log(`V8 version: ${process.versions.v8}`);
console.log(`Platform: ${process.platform} (${process.arch})`);

// Test loading rc module directly
console.log('\n📦 Testing rc module (used by better-sqlite3)...');
testRequire('rc');

// Test loading @napi-rs/postinstall module
console.log('\n📦 Testing @napi-rs/postinstall (used by unrs-resolver)...');
testRequire('@napi-rs/postinstall');

// Check for shim files
console.log('\n🔍 Checking for shim files...');
const shimFiles = [
  'node_modules/better-sqlite3/node_modules/rc.js',
  'node_modules/better-sqlite3/rc.js',
  'node_modules/unrs-resolver/node_modules/index.js',
  'node_modules/unrs-resolver/index.js'
];

shimFiles.forEach(shimFile => {
  const fullPath = path.join(process.cwd(), shimFile);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Shim file exists: ${shimFile}`);
    // Check content
    const content = fs.readFileSync(fullPath, 'utf8');
    console.log(`   Content: ${content.trim().substring(0, 50)}...`);
  } else {
    console.log(`❌ Missing shim file: ${shimFile}`);
  }
});

console.log('\n✅ Native module verification complete!');
