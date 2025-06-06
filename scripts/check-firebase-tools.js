#!/usr/bin/env node

/**
 * Firebase Tools Version Checker
 *
 * This script verifies that the installed Firebase Tools version is compatible
 * with Node.js 22 and checks for any version mismatches across the project.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color output
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

// Expected version
const EXPECTED_VERSION = '14.6.0';

console.log(`${colors.bold}Firebase Tools Version Checker${colors.reset}`);
console.log('----------------------------------------');

async function checkInstalledVersion() {
  console.log(`\n${colors.bold}Checking installed Firebase Tools version:${colors.reset}`);

  try {
    const output = execSync('firebase --version', { encoding: 'utf8' }).trim();
    console.log(`${colors.blue}Installed version: ${output}${colors.reset}`);

    if (output === EXPECTED_VERSION) {
      console.log(`${colors.green}✅ Installed version matches expected version (${EXPECTED_VERSION})${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ Installed version (${output}) doesn't match expected version (${EXPECTED_VERSION})${colors.reset}`);
      console.log(`   To update, run: npm install -g firebase-tools@${EXPECTED_VERSION}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Firebase Tools is not installed globally${colors.reset}`);
    console.log(`   To install, run: npm install -g firebase-tools@${EXPECTED_VERSION}`);
  }
}

async function checkFileReferences() {
  console.log(`\n${colors.bold}Checking Firebase Tools references in project files:${colors.reset}`);

  // Files to check
  const filesToCheck = [
    { path: path.join(projectRoot, 'package.json'), type: 'json' },
    { path: path.join(projectRoot, '.github/workflows/firebase-deploy.yml'), type: 'text', pattern: /firebase-tools@(\d+\.\d+\.\d+)/g },
    { path: path.join(projectRoot, 'docker-compose.yml'), type: 'text', pattern: /firebase-tools@(\d+\.\d+\.\d+)/g },
    { path: path.join(projectRoot, 'setup-dev.sh'), type: 'text', pattern: /firebase-tools@(\d+\.\d+\.\d+)/g },
    { path: path.join(projectRoot, 'README.md'), type: 'text', pattern: /firebase-tools@(\d+\.\d+\.\d+)/g },
    { path: path.join(projectRoot, 'NODE22-MIGRATION.md'), type: 'text', pattern: /Firebase Tools.*?(\d+\.\d+\.\d+)/g },
  ];

  for (const file of filesToCheck) {
    try {
      const content = await fs.readFile(file.path, 'utf8');
      const relativePath = path.relative(projectRoot, file.path);

      console.log(`\n${colors.cyan}Checking ${relativePath}${colors.reset}`);

      if (file.type === 'json') {
        const json = JSON.parse(content);
        const version = json.dependencies?.['firebase-tools'] || json.devDependencies?.['firebase-tools'];

        if (version) {
          const cleanVersion = version.replace(/[\^~]/, '');
          if (cleanVersion === EXPECTED_VERSION || cleanVersion.startsWith(`${EXPECTED_VERSION}`)) {
            console.log(`${colors.green}✅ Version matches: ${version}${colors.reset}`);
          } else {
            console.log(`${colors.yellow}⚠️ Version mismatch: ${version} (expected ${EXPECTED_VERSION})${colors.reset}`);
          }
        } else {
          console.log(`${colors.blue}ℹ️ No Firebase Tools dependency found${colors.reset}`);
        }
      } else {
        // Text-based search
        const matches = [...content.matchAll(file.pattern)];

        if (matches.length > 0) {
          const versions = matches.map(match => match[1]);
          const uniqueVersions = [...new Set(versions)];

          for (const version of uniqueVersions) {
            if (version === EXPECTED_VERSION) {
              console.log(`${colors.green}✅ Version matches: ${version}${colors.reset}`);
            } else {
              console.log(`${colors.yellow}⚠️ Version mismatch: ${version} (expected ${EXPECTED_VERSION})${colors.reset}`);
              console.log(`   Found in ${versions.filter(v => v === version).length} location(s)`);
            }
          }
        } else {
          console.log(`${colors.blue}ℹ️ No Firebase Tools version references found${colors.reset}`);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`${colors.blue}ℹ️ File doesn't exist: ${path.relative(projectRoot, file.path)}${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Error processing ${path.relative(projectRoot, file.path)}: ${error.message}${colors.reset}`);
      }
    }
  }
}

async function checkNodeCompatibility() {
  console.log(`\n${colors.bold}Checking Node.js compatibility:${colors.reset}`);

  try {
    const currentNode = process.version;
    const majorVersion = parseInt(currentNode.substring(1).split('.')[0], 10);

    console.log(`${colors.blue}Current Node.js version: ${currentNode}${colors.reset}`);

    if (majorVersion >= 22) {
      console.log(`${colors.green}✅ Node.js version is compatible with Firebase Tools v14+${colors.reset}`);
    } else if (majorVersion >= 18) {
      console.log(`${colors.yellow}⚠️ Node.js ${currentNode} can use Firebase Tools up to v14.0.0${colors.reset}`);
      console.log(`   Consider upgrading to Node.js 22 for full compatibility`);
    } else {
      console.log(`${colors.red}❌ Node.js ${currentNode} is not supported by Firebase Tools v14+${colors.reset}`);
      console.log(`   You must use Node.js 18 or higher`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error checking Node.js version: ${error.message}${colors.reset}`);
  }
}

async function main() {
  await checkInstalledVersion();
  await checkFileReferences();
  await checkNodeCompatibility();

  console.log(`\n${colors.bold}Firebase Tools check complete!${colors.reset}`);
}

main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
