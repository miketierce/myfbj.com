#!/usr/bin/env node

/**
 * Firebase Functions Node 22 Compatibility Checker
 *
 * This script analyzes your Firebase Functions code for potential
 * compatibility issues with Node.js 22.
 *
 * Usage:
 *   node check-firebase-node22.js
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const functionsDir = path.join(projectRoot, 'functions');
const functionsSourceDir = path.join(functionsDir, 'src');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

// Patterns to check for potential issues
const potentialIssues = [
  {
    pattern: /Array\.prototype\.with|\.with\(\s*\d+\s*,/g,
    message: "Array.prototype.with() method may cause issues if your TypeScript target doesn't support it",
    suggestion: "Use array spread: [...array.slice(0, index), newValue, ...array.slice(index + 1)]"
  },
  {
    pattern: /Optional chaining is not defined/g,
    message: "Optional chaining syntax error might be happening in older dependencies",
    suggestion: "Update dependencies or add TypeScript downleveling"
  },
  {
    pattern: /node:\w+/g,
    message: "Node.js protocol imports require Node.js 14+",
    suggestion: "This is compatible with Node.js 22, but worth noting"
  },
  {
    pattern: /(?<!\/\/.*)(require|import).*?node-fetch/g,
    message: "node-fetch v3 is ESM only and may require configuration changes",
    suggestion: "Use native fetch in Node.js 18+ or ensure proper ESM setup"
  },
  {
    pattern: /import\s+.*?\s+from\s+['"]firebase-functions['"]/g,
    message: "Old import style for firebase-functions",
    suggestion: "Update to firebase-functions/v2 for best Node.js 22 compatibility"
  }
];

console.log(`${colors.bold}Firebase Functions Node.js 22 Compatibility Checker${colors.reset}`);
console.log('---------------------------------------------------');

async function checkPackageJson() {
  console.log(`\n${colors.bold}Checking package.json...${colors.reset}`);

  try {
    const packageJsonPath = path.join(functionsDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    // Check Node.js engine setting
    const nodeEngine = packageJson.engines?.node;
    if (!nodeEngine) {
      console.log(`${colors.yellow}⚠️ No Node.js engine specified in package.json${colors.reset}`);
      console.log(`   Add: "engines": { "node": "22" }`);
    } else if (nodeEngine !== "22") {
      console.log(`${colors.yellow}⚠️ Node.js engine is set to "${nodeEngine}" instead of "22"${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Node.js engine correctly set to "22"${colors.reset}`);
    }

    // Check firebase-functions version
    const firebaseFunctionsVersion = packageJson.dependencies?.['firebase-functions'];
    if (!firebaseFunctionsVersion) {
      console.log(`${colors.yellow}⚠️ firebase-functions not found in dependencies${colors.reset}`);
    } else {
      // Remove ^ or ~ from version string
      const cleanVersion = firebaseFunctionsVersion.replace(/[\^~]/, '');
      const majorVersion = parseInt(cleanVersion.split('.')[0], 10);

      if (majorVersion < 6) {
        console.log(`${colors.yellow}⚠️ firebase-functions version ${firebaseFunctionsVersion} may not fully support Node.js 22${colors.reset}`);
        console.log(`   Consider updating to firebase-functions ^6.0.0 or later`);
      } else {
        console.log(`${colors.green}✅ firebase-functions version ${firebaseFunctionsVersion} is compatible with Node.js 22${colors.reset}`);
      }
    }

    // Check typescript version
    const typescriptVersion = packageJson.devDependencies?.typescript;
    if (typescriptVersion) {
      const cleanVersion = typescriptVersion.replace(/[\^~]/, '');
      const majorVersion = parseInt(cleanVersion.split('.')[0], 10);

      if (majorVersion < 5) {
        console.log(`${colors.yellow}⚠️ TypeScript version ${typescriptVersion} may not fully support newer Node.js features${colors.reset}`);
        console.log(`   Consider updating to TypeScript ^5.0.0 or later`);
      } else {
        console.log(`${colors.green}✅ TypeScript version ${typescriptVersion} is compatible with Node.js 22${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error checking package.json: ${error.message}${colors.reset}`);
  }
}

async function checkTsConfig() {
  console.log(`\n${colors.bold}Checking TypeScript configuration...${colors.reset}`);

  try {
    const tsConfigPath = path.join(functionsDir, 'tsconfig.json');
    const tsConfig = JSON.parse(await fs.readFile(tsConfigPath, 'utf8'));

    // Check target ES version
    const target = tsConfig.compilerOptions?.target;
    if (!target) {
      console.log(`${colors.yellow}⚠️ No TypeScript target specified${colors.reset}`);
      console.log(`   Add: "target": "es2022" to compilerOptions`);
    } else if (target !== "es2022" && target !== "es2023" && target !== "esnext") {
      console.log(`${colors.yellow}⚠️ TypeScript target "${target}" might not be optimal for Node.js 22${colors.reset}`);
      console.log(`   Consider changing to "target": "es2022" or newer`);
    } else {
      console.log(`${colors.green}✅ TypeScript target "${target}" is compatible with Node.js 22${colors.reset}`);
    }

    // Check lib includes
    const libs = tsConfig.compilerOptions?.lib;
    if (!libs) {
      console.log(`${colors.yellow}⚠️ No TypeScript libs specified${colors.reset}`);
      console.log(`   Add: "lib": ["es2023"] to compilerOptions`);
    } else if (!libs.includes("es2023") && !libs.includes("esnext")) {
      console.log(`${colors.yellow}⚠️ TypeScript libs ${JSON.stringify(libs)} might not include all Node.js 22 features${colors.reset}`);
      console.log(`   Consider adding "es2023" to libs`);
    } else {
      console.log(`${colors.green}✅ TypeScript libs include ES2023 features${colors.reset}`);
    }

    // Check skipLibCheck
    const skipLibCheck = tsConfig.compilerOptions?.skipLibCheck;
    if (skipLibCheck !== true) {
      console.log(`${colors.yellow}⚠️ skipLibCheck is not enabled, which may cause issues with some libraries${colors.reset}`);
      console.log(`   Add: "skipLibCheck": true to compilerOptions`);
    } else {
      console.log(`${colors.green}✅ skipLibCheck is enabled${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error checking tsconfig.json: ${error.message}${colors.reset}`);
  }
}

async function scanSourceFiles() {
  console.log(`\n${colors.bold}Scanning source files for potential issues...${colors.reset}`);

  try {
    // Get all TypeScript files recursively
    const getAllFiles = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? getAllFiles(fullPath) : fullPath;
      }));
      return files.flat().filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    };

    const sourceFiles = await getAllFiles(functionsSourceDir);
    console.log(`Found ${sourceFiles.length} source files to scan`);

    let issuesFound = 0;

    for (const file of sourceFiles) {
      const relativeFilePath = path.relative(projectRoot, file);
      const content = await fs.readFile(file, 'utf8');

      let fileHasIssues = false;

      for (const issue of potentialIssues) {
        const matches = [...content.matchAll(issue.pattern)];

        if (matches.length > 0) {
          if (!fileHasIssues) {
            console.log(`\n${colors.blue}File: ${relativeFilePath}${colors.reset}`);
            fileHasIssues = true;
          }

          console.log(`${colors.yellow}⚠️ Potential issue: ${issue.message}${colors.reset}`);
          console.log(`   Suggestion: ${issue.suggestion}`);
          console.log(`   Found ${matches.length} occurrence(s)`);
          issuesFound += matches.length;
        }
      }
    }

    if (issuesFound === 0) {
      console.log(`${colors.green}✅ No potential issues found in source files${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️ Found ${issuesFound} potential issue(s) that might affect Node.js 22 compatibility${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error scanning source files: ${error.message}${colors.reset}`);
  }
}

async function main() {
  try {
    // Check if functions directory exists
    try {
      await fs.access(functionsDir);
    } catch (error) {
      console.log(`${colors.red}❌ Functions directory not found: ${functionsDir}${colors.reset}`);
      process.exit(1);
    }

    // Run checks
    await checkPackageJson();
    await checkTsConfig();
    await scanSourceFiles();

    console.log(`\n${colors.bold}Compatibility check complete!${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
