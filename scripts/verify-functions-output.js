#!/usr/bin/env node

/**
 * Verify Firebase Functions Output Script
 *
 * This script checks that the Nuxt-generated Firebase Functions output in .output/server
 * includes all necessary files and dependencies for deployment.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, '.output', 'server');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

async function main() {
  console.log(`${colors.bold}Firebase Functions Output Verification${colors.reset}`);
  console.log('------------------------------------------');

  try {
    // Check if .output/server directory exists
    try {
      await fs.access(outputDir);
      console.log(`${colors.green}✅ Found .output/server directory${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ .output/server directory not found!${colors.reset}`);
      console.log(`   Run 'pnpm build' to generate the output directory`);
      process.exit(1);
    }

    // Check for entry point files
    const files = await fs.readdir(outputDir);
    console.log(`\n${colors.bold}Checking for entry point files:${colors.reset}`);

    const entryPoints = ['index.js', 'index.mjs', 'index.cjs'];
    const foundEntryPoints = entryPoints.filter(file => files.includes(file));

    if (foundEntryPoints.length > 0) {
      console.log(`${colors.green}✅ Found entry point(s): ${foundEntryPoints.join(', ')}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ No recognized entry point found${colors.reset}`);
      console.log(`   Firebase Functions requires an index.js, index.mjs, or index.cjs file`);
    }

    // Check for package.json
    console.log(`\n${colors.bold}Checking for package.json:${colors.reset}`);
    if (files.includes('package.json')) {
      console.log(`${colors.green}✅ Found package.json${colors.reset}`);

      // Check package.json content
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      // Check for firebase-functions dependency
      if (packageJson.dependencies?.['firebase-functions']) {
        console.log(`${colors.green}✅ firebase-functions dependency found: ${packageJson.dependencies['firebase-functions']}${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ firebase-functions dependency not found in package.json!${colors.reset}`);
        console.log(`   This will cause deployment errors. Run the prepare-functions-deploy.sh script to fix this.`);
      }

      // Check for firebase-admin dependency
      if (packageJson.dependencies?.['firebase-admin']) {
        console.log(`${colors.green}✅ firebase-admin dependency found: ${packageJson.dependencies['firebase-admin']}${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️ firebase-admin dependency not found in package.json${colors.reset}`);
        console.log(`   This may be needed for some Firebase functionality.`);
      }

      // Check for main field
      if (packageJson.main) {
        console.log(`${colors.green}✅ main field found: ${packageJson.main}${colors.reset}`);

        // Check if the main file exists
        try {
          await fs.access(path.join(outputDir, packageJson.main));
          console.log(`${colors.green}✅ Main file exists${colors.reset}`);
        } catch (error) {
          console.log(`${colors.red}❌ Main file ${packageJson.main} not found!${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}⚠️ No main field in package.json${colors.reset}`);
      }

      // Check for engines field
      if (packageJson.engines?.node) {
        console.log(`${colors.green}✅ Node.js engine requirement found: ${packageJson.engines.node}${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️ No Node.js engine requirement in package.json${colors.reset}`);
        console.log(`   This may cause deployment issues if Firebase expects a specific Node.js version.`);
      }
    } else {
      console.log(`${colors.red}❌ package.json not found!${colors.reset}`);
      console.log(`   Firebase Functions require a package.json file with firebase-functions dependency.`);
      console.log(`   Run the prepare-functions-deploy.sh script to create it.`);
    }

    // Check for node_modules directory
    console.log(`\n${colors.bold}Checking for node_modules:${colors.reset}`);
    if (files.includes('node_modules')) {
      console.log(`${colors.green}✅ node_modules directory found${colors.reset}`);

      // Check for firebase-functions in node_modules
      try {
        await fs.access(path.join(outputDir, 'node_modules', 'firebase-functions'));
        console.log(`${colors.green}✅ firebase-functions module is installed${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}❌ firebase-functions module is not installed!${colors.reset}`);
        console.log(`   This will cause deployment errors. Run prepare-functions-deploy.sh to fix this.`);
      }

      // Check for firebase-admin in node_modules
      try {
        await fs.access(path.join(outputDir, 'node_modules', 'firebase-admin'));
        console.log(`${colors.green}✅ firebase-admin module is installed${colors.reset}`);
      } catch (error) {
        console.log(`${colors.yellow}⚠️ firebase-admin module is not installed${colors.reset}`);
        console.log(`   This may be needed for some Firebase functionality.`);
      }
    } else {
      console.log(`${colors.red}❌ node_modules directory not found!${colors.reset}`);
      console.log(`   Dependencies must be installed for Firebase Functions to work.`);
      console.log(`   Run the prepare-functions-deploy.sh script to install them.`);
    }

    console.log(`\n${colors.bold}Recommendations:${colors.reset}`);
    console.log(`1. If any issues were found, run: ${colors.blue}./scripts/prepare-functions-deploy.sh${colors.reset}`);
    console.log(`2. To test the functions locally, run: ${colors.blue}firebase emulators:start --only functions${colors.reset}`);
    console.log(`3. To deploy functions, run: ${colors.blue}firebase deploy --only functions${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}Error during verification: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
