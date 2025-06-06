#!/usr/bin/env node

/**
 * CI Fix Modules Script
 *
 * This script fixes module resolution issues in Node.js 22 for native modules.
 * Specifically:
 * 1. better-sqlite3 - fixes require('./rc') issue
 * 2. unrs-resolver - fixes require('./index.js') issue
 */

const fs = require('fs');
const path = require('path');

// Paths to fix
const modulesToFix = [
  {
    name: 'better-sqlite3',
    binPath: 'node_modules/.bin/prebuild-install',
    find: 'require\\([\'"]\\.\\/rc[\'"]\\)',
    replace: 'require(\'rc\')'
  },
  {
    name: 'unrs-resolver',
    binPath: 'node_modules/.bin/napi-postinstall',
    find: 'require\\([\'"]\\.\\/index\\.js[\'"]\\)',
    replace: 'require(\'@napi-rs/postinstall/index.js\')'
  }
];

console.log('🔧 Fixing module resolution issues for Node.js 22...');

modulesToFix.forEach(({ name, binPath, find, replace }) => {
  try {
    const fullPath = path.join(process.cwd(), binPath);

    if (fs.existsSync(fullPath)) {
      console.log(`Fixing ${name} (${binPath})...`);

      // Read the file
      const content = fs.readFileSync(fullPath, 'utf8');

      // Fix module resolution paths
      const regex = new RegExp(find, 'g');
      const fixedContent = content.replace(regex, replace);

      if (content !== fixedContent) {
        fs.writeFileSync(fullPath, fixedContent);
        console.log(`✅ Fixed ${name}`);
      } else {
        console.log(`⏩ No changes needed for ${name}`);
      }
    } else {
      console.log(`⚠️ Path not found: ${binPath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${name}: ${error.message}`);
  }
});

// Check for better-sqlite3 wrapper file
try {
  const betterSqlitePath = path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'lib', 'binding');
  if (fs.existsSync(betterSqlitePath)) {
    const files = fs.readdirSync(betterSqlitePath);
    const wrapperFile = files.find(f => f.includes('-napi.node.js'));

    if (wrapperFile) {
      const wrapperPath = path.join(betterSqlitePath, wrapperFile);
      console.log(`Found better-sqlite3 wrapper file: ${wrapperFile}`);

      const content = fs.readFileSync(wrapperPath, 'utf8');
      // Fix potential path issues in the wrapper
      const fixedContent = content
        .replace('require(\'./../../package.json\')', 'require(\'better-sqlite3/package.json\')')
        .replace('require(\'./../../lib/', 'require(\'better-sqlite3/lib/');

      if (content !== fixedContent) {
        fs.writeFileSync(wrapperPath, fixedContent);
        console.log(`✅ Fixed better-sqlite3 wrapper file`);
      }
    }
  }
} catch (error) {
  console.error(`❌ Error fixing better-sqlite3 wrapper: ${error.message}`);
}

console.log('✅ Module fixes complete!');
