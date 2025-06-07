#!/usr/bin/env node

/**
 * Firebase Auth Authorized Domains Configuration Script
 *
 * This script automatically adds new hosting site domains to the Firebase Auth
 * authorized domains list to prevent "auth/unauthorized-continue-uri" errors.
 *
 * Usage:
 * node scripts/configure-auth-domains.js <site-id> <project-id>
 *
 * Example:
 * node scripts/configure-auth-domains.js dev-test-feature123 your-firebase-project-id
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get current authorized domains from Firebase Auth
 */
function getCurrentAuthorizedDomains(projectId) {
  try {
    console.log('🔍 Fetching current authorized domains...');

    // Use Firebase Admin SDK to get auth config
    const configScript = `
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: '${projectId}'
});

async function getDomains() {
  try {
    const authConfig = await admin.auth().getConfig();
    const domains = authConfig.authorizedDomains || [];
    console.log(JSON.stringify(domains));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getDomains();
    `;

    fs.writeFileSync('temp-get-domains.js', configScript);

    const result = execSync(`node temp-get-domains.js`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000
    });

    fs.unlinkSync('temp-get-domains.js');

    const domains = JSON.parse(result.trim());
    console.log(`📋 Found ${domains.length} current authorized domains via Admin SDK`);
    return domains;
  } catch (error) {
    console.warn('⚠️  Could not fetch current authorized domains via Admin SDK');
    console.warn('Error:', error.message);

    // Clean up temporary file if it exists
    if (fs.existsSync('temp-get-domains.js')) {
      fs.unlinkSync('temp-get-domains.js');
    }

    // Return common default domains that are usually present
    const defaultDomains = [
      'localhost',
      `${projectId}.firebaseapp.com`
    ];
    console.log(`📋 Using default domains: ${defaultDomains.join(', ')}`);
    return defaultDomains;
  }
}

/**
 * Add domain to Firebase Auth authorized domains using Firebase Admin SDK
 */
function addAuthorizedDomain(domain, projectId) {
  try {
    console.log(`🔧 Adding domain to authorized domains: ${domain}`);

    // Create a Node.js script to add the domain using Firebase Admin SDK
    const addDomainScript = `
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: '${projectId}'
});

async function addDomain() {
  try {
    // Get current auth config
    const authConfig = await admin.auth().getConfig();
    const currentDomains = authConfig.authorizedDomains || [];

    // Check if domain already exists
    if (currentDomains.includes('${domain}')) {
      console.log('DOMAIN_EXISTS');
      return;
    }

    // Add the new domain
    const updatedDomains = [...currentDomains, '${domain}'];

    await admin.auth().updateConfig({
      authorizedDomains: updatedDomains
    });

    console.log('DOMAIN_ADDED');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addDomain();
    `;

    fs.writeFileSync('temp-add-domain.js', addDomainScript);

    const result = execSync(`node temp-add-domain.js`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000
    });

    fs.unlinkSync('temp-add-domain.js');

    if (result.includes('DOMAIN_EXISTS')) {
      console.log(`ℹ️  Domain ${domain} already exists in authorized domains`);
      return true;
    } else if (result.includes('DOMAIN_ADDED')) {
      console.log(`✅ Successfully added ${domain} to authorized domains`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Failed to add domain ${domain}:`, error.message);

    // Clean up temporary file if it exists
    if (fs.existsSync('temp-add-domain.js')) {
      fs.unlinkSync('temp-add-domain.js');
    }

    return false;
  }
}

/**
 * Get the domain from site ID
 */
function getDomainFromSiteId(siteId) {
  return `${siteId}.web.app`;
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Starting Firebase Auth Authorized Domains Configuration');

  const siteId = process.argv[2];
  const projectId = process.argv[3];

  console.log(`📝 Args received: siteId=${siteId}, projectId=${projectId}`);

  if (!siteId || !projectId) {
    console.error('❌ Usage: node configure-auth-domains.js <site-id> <project-id>');
    console.error('   Example: node configure-auth-domains.js dev-test-feature123 your-firebase-project-id');
    process.exit(1);
  }

  console.log('🚀 Firebase Auth Authorized Domains Configuration');
  console.log(`   Site ID: ${siteId}`);
  console.log(`   Project ID: ${projectId}`);
  console.log('');

  const domain = getDomainFromSiteId(siteId);
  console.log(`🌐 Target domain: ${domain}`);

  try {
    // Use Firebase Admin SDK to add the domain
    console.log('\n📝 Adding domain using Firebase Admin SDK...');
    const success = addAuthorizedDomain(domain, projectId);

    if (success) {
      console.log('✅ Domain successfully configured');
    } else {
      throw new Error('Firebase Admin SDK method failed');
    }

  } catch (error) {
    console.error('\n❌ Failed to configure authorized domains');
    console.error('Error:', error.message);
    console.error('\n🔧 Manual configuration required:');
    console.error(`   1. Go to Firebase Console: https://console.firebase.google.com/project/${projectId}/authentication/settings`);
    console.error(`   2. In the "Authorized domains" section, click "Add domain"`);
    console.error(`   3. Add: ${domain}`);
    console.error('   4. Save the configuration');

    // Don't exit with error code, as this is not critical for deployment success
    console.log('\n⚠️  Deployment will continue, but authentication may not work until domain is manually added');
  }
}

// Only run if this script is called directly
if (process.argv[1] && process.argv[1].endsWith('configure-auth-domains.js')) {
  main();
}

export { getDomainFromSiteId, addAuthorizedDomain, getCurrentAuthorizedDomains };
