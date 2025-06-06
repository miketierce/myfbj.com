#!/usr/bin/env node

/**
 * Simple Firebase Functions Output Verification Script
 *
 * This is a simplified version that just checks the bare essentials
 * for Firebase Functions deployment.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

// Output directory
const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, '.output', 'server');

console.log(`${colors.bold}Firebase Functions Output Verification (Simple)${colors.reset}`);
console.log('------------------------------------------');

try {
  // Check if .output/server directory exists
  let outputExists = false;
  try {
    fs.accessSync(outputDir);
    outputExists = true;
    console.log(`${colors.green}✅ Found .output/server directory${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}❌ .output/server directory not found!${colors.reset}`);
    console.log(`   Run 'pnpm build' to generate the output directory`);
  }

  // Only continue checks if output directory exists
  if (outputExists) {
    // Check for entry point files
    const files = fs.readdirSync(outputDir);
    console.log(`\n${colors.bold}Checking for entry point files:${colors.reset}`);

    const entryPoints = ['index.js', 'index.mjs', 'index.cjs'];
    const foundEntryPoints = entryPoints.filter(file => files.includes(file));

    if (foundEntryPoints.length > 0) {
      console.log(`${colors.green}✅ Found entry point(s): ${foundEntryPoints.join(', ')}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ No recognized entry point found${colors.reset}`);
    }

    // Check for package.json
    console.log(`\n${colors.bold}Checking for package.json:${colors.reset}`);
    if (files.includes('package.json')) {
      console.log(`${colors.green}✅ Found package.json${colors.reset}`);

      // Check package.json content
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Check for firebase-functions dependency
      if (packageJson.dependencies?.['firebase-functions']) {
        console.log(`${colors.green}✅ firebase-functions dependency found: ${packageJson.dependencies['firebase-functions']}${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ firebase-functions dependency not found in package.json!${colors.reset}`);
        console.log(`   This will cause deployment errors. Run the prepare-functions-deploy.sh script to fix this.`);
      }
    } else {
      console.log(`${colors.red}❌ package.json not found!${colors.reset}`);
    }

    // Check for node_modules directory
    console.log(`\n${colors.bold}Checking for node_modules:${colors.reset}`);
    if (files.includes('node_modules')) {
      console.log(`${colors.green}✅ node_modules directory found${colors.reset}`);

      // Check for firebase-functions in node_modules
      try {
        fs.accessSync(path.join(outputDir, 'node_modules', 'firebase-functions'));
        console.log(`${colors.green}✅ firebase-functions module is installed${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}❌ firebase-functions module is not installed!${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}❌ node_modules directory not found!${colors.reset}`);
    }
  }

  console.log(`\n${colors.bold}Recommendation:${colors.reset}`);
  console.log(`If any issues were found, run: ${colors.blue}./scripts/prepare-functions-deploy.sh${colors.reset}`);

} catch (error) {
  console.error(`${colors.red}Error during verification: ${error.message}${colors.reset}`);
  process.exit(1);
}
