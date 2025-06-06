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
  // Each module can have multiple possible paths to check
  {
    name: 'better-sqlite3',
    binPaths: [
      'node_modules/.bin/prebuild-install',
      'node_modules/better-sqlite3/node_modules/.bin/prebuild-install',
      'node_modules/prebuild-install/bin.js',
      'node_modules/better-sqlite3/node_modules/prebuild-install/bin.js'
    ],
    find: 'require\\([\'"]\\.\\/rc[\'"]\\)',
    replace: 'require(\'rc\')'
  },
  {
    name: 'unrs-resolver',
    binPaths: [
      'node_modules/.bin/napi-postinstall',
      'node_modules/unrs-resolver/node_modules/.bin/napi-postinstall',
      'node_modules/@napi-rs/postinstall/index.js',
      'node_modules/unrs-resolver/node_modules/@napi-rs/postinstall/index.js'
    ],
    find: 'require\\([\'"]\\.\\/index\\.js[\'"]\\)',
    replace: 'require(\'@napi-rs/postinstall/index.js\')'
  }
];

console.log('🔧 Fixing module resolution issues for Node.js 22...');

// Additional paths to check for modules
const additionalModulePaths = [
  'node_modules',
  'node_modules/better-sqlite3/node_modules'
];

// Ensure rc module is available directly
try {
  // Check if rc is installed globally
  let rcExists = false;
  try {
    require.resolve('rc');
    rcExists = true;
    console.log('✅ rc module found in global modules');
  } catch (err) {
    console.log('⚠️ rc module not found in global modules');
  }

  if (!rcExists) {
    console.log('Installing rc module globally...');
    const { execSync } = require('child_process');
    execSync('npm install -g rc@1.2.8', { stdio: 'inherit' });
  }
} catch (error) {
  console.error(`❌ Error ensuring rc module: ${error.message}`);
}

modulesToFix.forEach(({ name, binPaths, find, replace }) => {
  try {
    // Try all potential paths for each module
    let fixed = false;
    for (const binPath of binPaths) {
      const fullPath = path.join(process.cwd(), binPath);

      if (fs.existsSync(fullPath)) {
        console.log(`Checking ${name} (${binPath})...`);

        // Read the file
        const content = fs.readFileSync(fullPath, 'utf8');

        // Fix module resolution paths
        const regex = new RegExp(find, 'g');
        const fixedContent = content.replace(regex, replace);

        if (content !== fixedContent) {
          fs.writeFileSync(fullPath, fixedContent);
          console.log(`✅ Fixed ${name} in ${binPath}`);
          fixed = true;
        } else {
          console.log(`⏩ No changes needed for ${name} in ${binPath}`);
        }
      }
    }

    if (!fixed) {
      console.log(`⚠️ Could not find any fixable paths for ${name}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${name}: ${error.message}`);
  }
});

// Check for better-sqlite3 wrapper file
try {
  const possiblePaths = [
    path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'lib', 'binding'),
    path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'build', 'Release'),
    path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'lib'),
    path.join(process.cwd(), 'node_modules', 'better-sqlite3'),
    path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'node_modules')
  ];

  // Search more deeply for any potential wrapper files
  for (const basePath of possiblePaths) {
    if (fs.existsSync(basePath)) {
      // Search recursively for potential wrapper files
      console.log(`Searching for wrapper files in ${basePath}...`);

      const searchDir = (dir) => {
        if (!fs.existsSync(dir)) return;

        try {
          const files = fs.readdirSync(dir);

          for (const file of files) {
            const fullPath = path.join(dir, file);

            if (fs.statSync(fullPath).isDirectory()) {
              // Recurse into directories, but don't go too deep
              if (!fullPath.includes('node_modules/node_modules')) {
                searchDir(fullPath);
              }
            } else if (file.endsWith('.js') || file.includes('.node.js') || file.includes('-napi.node.js')) {
              // Check if this could be a wrapper file
              try {
                const content = fs.readFileSync(fullPath, 'utf8');

                // Look for signs this is a wrapper file
                if (content.includes('require(\'./rc\')') ||
                  content.includes('./../../package.json') ||
                  content.includes('./index.js')) {

                  console.log(`Found potential wrapper file: ${fullPath}`);

                  // Fix relative paths in the wrapper
                  let fixedContent = content
                    .replace(/require\(['"]\.\/rc['"]\)/g, 'require(\'rc\')')
                    .replace(/require\(['"]\.\/\.\.\/\.\.\/package\.json['"]\)/g, 'require(\'better-sqlite3/package.json\')')
                    .replace(/require\(['"]\.\/\.\.\/\.\.\/lib\//g, 'require(\'better-sqlite3/lib/')
                    .replace(/require\(['"]\.\/index\.js['"]\)/g, 'require(\'@napi-rs/postinstall/index.js\')');

                  if (content !== fixedContent) {
                    fs.writeFileSync(fullPath, fixedContent);
                    console.log(`✅ Fixed wrapper file: ${fullPath}`);
                  } else {
                    console.log(`No changes needed for ${fullPath}`);
                  }
                }
              } catch (fileErr) {
                console.log(`Error reading or processing file ${fullPath}: ${fileErr.message}`);
              }
            }
          }
        } catch (dirErr) {
          console.log(`Error reading directory ${dir}: ${dirErr.message}`);
        }
      };

      // Start the recursive search
      searchDir(basePath);
    }
  }
} catch (error) {
  console.error(`❌ Error fixing better-sqlite3 wrapper: ${error.message}`);
}

// Create symlinks for module paths (additional approach)
try {
  console.log('Creating module path symlinks for better compatibility...');

  // Better SQLite3 RC fix
  const betterSqliteNodeModules = path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'node_modules');
  if (!fs.existsSync(betterSqliteNodeModules)) {
    fs.mkdirSync(betterSqliteNodeModules, { recursive: true });
  }

  // Create rc.js in better-sqlite3/node_modules
  const rcPath = path.join(betterSqliteNodeModules, 'rc.js');
  fs.writeFileSync(rcPath, `module.exports = require('rc');`);
  console.log('✅ Created rc.js symlink module');

  // Create RC directory symlink if possible
  try {
    const rcModulePath = path.join(process.cwd(), 'node_modules', 'rc');
    if (fs.existsSync(rcModulePath)) {
      const rcSymlinkPath = path.join(betterSqliteNodeModules, 'rc');
      if (!fs.existsSync(rcSymlinkPath)) {
        try {
          fs.symlinkSync(rcModulePath, rcSymlinkPath, 'dir');
          console.log('✅ Created symlink to rc module directory');
        } catch (symErr) {
          fs.cpSync(rcModulePath, rcSymlinkPath, { recursive: true });
          console.log('✅ Copied rc module directory (symlink failed)');
        }
      }
    }
  } catch (err) {
    console.log(`⚠️ Could not create symlink to rc module: ${err.message}`);
  }

  // Unrs-resolver index.js fix
  const unrsNodeModules = path.join(process.cwd(), 'node_modules', 'unrs-resolver', 'node_modules');
  if (!fs.existsSync(unrsNodeModules)) {
    fs.mkdirSync(unrsNodeModules, { recursive: true });
  }

  // Create index.js in unrs-resolver/node_modules
  const indexPath = path.join(unrsNodeModules, 'index.js');
  fs.writeFileSync(indexPath, `module.exports = require('@napi-rs/postinstall/index.js');`);
  console.log('✅ Created index.js symlink module');

} catch (error) {
  console.error(`❌ Error creating module symlinks: ${error.message}`);
}

console.log('✅ Module fixes complete!');
