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
 * node scripts/configure-auth-domains.js dev-test-devour4 devour-4a8f0
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
    
    // Try using gcloud CLI first (more reliable for auth domains)
    try {
      const result = execSync(`gcloud firebase auth domains list --project=${projectId} --format=json`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15000 // 15 second timeout
      });
      
      const domains = JSON.parse(result);
      const domainList = domains.map(d => d.domain || d);
      console.log(`📋 Found ${domainList.length} current authorized domains via gcloud`);
      return domainList;
    } catch (gcloudError) {
      console.warn('⚠️  gcloud CLI failed, trying Firebase CLI...');
    }
    
    // Fallback to Firebase CLI with timeout
    const output = execSync(`firebase auth:export auth-config.json --project ${projectId}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000 // 15 second timeout
    });
    
    // Read the exported config
    if (fs.existsSync('auth-config.json')) {
      const authConfig = JSON.parse(fs.readFileSync('auth-config.json', 'utf8'));
      
      // Clean up the temporary file
      fs.unlinkSync('auth-config.json');
      
      // Extract authorized domains
      const authorizedDomains = authConfig.authorizedDomains || [];
      console.log(`📋 Found ${authorizedDomains.length} current authorized domains via Firebase CLI`);
      
      return authorizedDomains;
    }
    
    return [];
  } catch (error) {
    console.warn('⚠️  Could not fetch current authorized domains');
    console.warn('Error:', error.message);
    
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
 * Add domain to Firebase Auth authorized domains using gcloud
 */
function addAuthorizedDomain(domain, projectId) {
  try {
    console.log(`🔧 Adding domain to authorized domains: ${domain}`);
    
    // Use gcloud to add the domain with timeout
    execSync(`gcloud firebase auth domains create ${domain} --project=${projectId}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000 // 15 second timeout
    });
    
    console.log(`✅ Successfully added ${domain} to authorized domains`);
    return true;
  } catch (error) {
    // Check if the error is because domain already exists
    if (error.message.includes('already exists') || error.message.includes('ALREADY_EXISTS')) {
      console.log(`ℹ️  Domain ${domain} already exists in authorized domains`);
      return true;
    }
    
    console.error(`❌ Failed to add domain ${domain}:`, error.message);
    return false;
  }
}

/**
 * Update Firebase Auth authorized domains using Firebase CLI
 */
function updateAuthorizedDomains(domains, projectId) {
  try {
    console.log('🔧 Updating Firebase Auth configuration...');
    
    // Create a minimal auth config with the domains
    const authConfig = {
      authorizedDomains: domains
    };
    
    // Write config to temporary file
    fs.writeFileSync('temp-auth-config.json', JSON.stringify(authConfig, null, 2));
    
    // Import the updated config
    execSync(`firebase auth:import temp-auth-config.json --project ${projectId}`, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Clean up temporary file
    fs.unlinkSync('temp-auth-config.json');
    
    console.log('✅ Successfully updated authorized domains');
    return true;
  } catch (error) {
    console.error('❌ Failed to update authorized domains:', error.message);
    
    // Clean up temporary file if it exists
    if (fs.existsSync('temp-auth-config.json')) {
      fs.unlinkSync('temp-auth-config.json');
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
    console.error('   Example: node configure-auth-domains.js dev-test-devour4 devour-4a8f0');
    process.exit(1);
  }
  
  console.log('🚀 Firebase Auth Authorized Domains Configuration');
  console.log(`   Site ID: ${siteId}`);
  console.log(`   Project ID: ${projectId}`);
  console.log('');
  
  const domain = getDomainFromSiteId(siteId);
  console.log(`🌐 Target domain: ${domain}`);
  
  try {
    // Method 1: Try using gcloud CLI to add the domain directly
    console.log('\n📝 Method 1: Adding domain using gcloud CLI...');
    const gcloudSuccess = addAuthorizedDomain(domain, projectId);
    
    if (gcloudSuccess) {
      console.log('✅ Domain successfully configured using gcloud CLI');
      return;
    }
    
    // Method 2: Try using Firebase CLI to update the entire list
    console.log('\n📝 Method 2: Updating domains using Firebase CLI...');
    const currentDomains = getCurrentAuthorizedDomains(projectId);
    
    // Check if domain is already in the list
    if (currentDomains.includes(domain)) {
      console.log(`ℹ️  Domain ${domain} is already in authorized domains list`);
      return;
    }
    
    // Add the new domain to the list
    const updatedDomains = [...new Set([...currentDomains, domain])]; // Remove duplicates
    
    console.log(`📋 Updated domains list (${updatedDomains.length} domains):`);
    updatedDomains.forEach(d => console.log(`   - ${d}`));
    
    const updateSuccess = updateAuthorizedDomains(updatedDomains, projectId);
    
    if (updateSuccess) {
      console.log('✅ Domain successfully configured using Firebase CLI');
    } else {
      throw new Error('Both methods failed');
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
