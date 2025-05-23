#!/usr/bin/env node

/**
 * Firebase Storage CORS Configuration Script
 *
 * This script configures CORS settings for Firebase Storage buckets
 * to allow proper access from your application domains.
 *
 * Usage:
 * - Automatically run as part of CI/CD pipeline
 * - Manually: node scripts/configure-storage-cors.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Default domains to allow
const DEFAULT_ALLOWED_DOMAINS = [
  'localhost:3000',
  'localhost:8080',
  'localhost:5000', // Firebase emulator default port
  'localhost:9199', // Firebase storage emulator port
];

// Get environment-specific configuration
async function getEnvironmentConfig() {
  try {
    // Try to load from firebase config
    const firebaseConfigPath = path.resolve(__dirname, '../config/firebase.config.js');
    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = await import(firebaseConfigPath);
      const config = firebaseConfig.default || firebaseConfig;

      // Extract hostnames from authDomain and any other relevant URLs
      const domains = [];
      if (config.authDomain) {
        domains.push(config.authDomain.split(':')[0]); // Remove port if present
      }
      if (config.storageBucket) {
        domains.push(`storage.googleapis.com`); // Allow Firebase Storage domain
      }

      return {
        projectId: config.projectId,
        allowedDomains: domains
      };
    }

    // Try to load from dotenv files (if they exist)
    const envFiles = ['.env', '.env.local', '.env.production'];
    for (const envFile of envFiles) {
      const envPath = path.resolve(__dirname, '../', envFile);
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const authDomainMatch = envContent.match(/FIREBASE_AUTH_DOMAIN=(.+)/);
        const projectIdMatch = envContent.match(/FIREBASE_PROJECT_ID=(.+)/);

        if (authDomainMatch || projectIdMatch) {
          const domains = [];
          if (authDomainMatch && authDomainMatch[1]) {
            domains.push(authDomainMatch[1].trim());
          }

          return {
            projectId: projectIdMatch ? projectIdMatch[1].trim() : null,
            allowedDomains: domains
          };
        }
      }
    }

    console.warn('Environment config not found, using defaults');
    return { allowedDomains: [] };
  } catch (err) {
    console.warn('Error loading environment config:', err.message);
    return { allowedDomains: [] };
  }
}

// Get project configuration
async function getProjectConfig() {
  try {
    // Try to get Firebase project ID from service account file
    const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      return {
        projectId: serviceAccount.project_id
      };
    }

    // Fall back to parsing firebase.json
    const firebaseConfigPath = path.resolve(__dirname, '../firebase.json');
    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseJson = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      // Try to extract project ID from Hosting configuration
      if (firebaseJson.hosting && firebaseJson.hosting.site) {
        return {
          projectId: firebaseJson.hosting.site.split('-')[0] // Assuming site follows projectId-name convention
        };
      }
    }

    // Fall back to current Firebase project
    try {
      const output = execSync('firebase use', { encoding: 'utf8' });
      const projectMatch = output.match(/Project:\s+([^\s]+)/);
      if (projectMatch && projectMatch[1]) {
        return { projectId: projectMatch[1].trim() };
      }
    } catch (err) {
      console.warn('Could not determine project from Firebase CLI:', err.message);
    }

    return {};
  } catch (err) {
    console.warn('Error reading project config:', err.message);
    return {};
  }
}

// Create CORS configuration file
function createCorsConfigFile(domains) {
  const corsConfig = domains.map(domain => {
    // Transform domain into proper origin format
    let origin = domain.startsWith('http') ? domain : `https://${domain}`;
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      origin = domain.startsWith('http') ? domain : `http://${domain}`;
    }

    return {
      origin,
      method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      maxAgeSeconds: 3600,
      responseHeader: [
        'Content-Type',
        'Content-Length',
        'Content-Encoding',
        'Content-Disposition',
        'Cache-Control',
        'Access-Control-Allow-Origin'
      ]
    };
  });

  // Write the config to a temporary file
  const tempFilePath = path.resolve(__dirname, '../temp-cors.json');
  fs.writeFileSync(tempFilePath, JSON.stringify(corsConfig, null, 2));

  return tempFilePath;
}

// Configure CORS using gsutil
function configureCors(configFilePath, projectId) {
  try {
    const projectArg = projectId ? ` -p ${projectId}` : '';

    // Get default storage bucket or use first bucket found
    let bucket;
    try {
      const listCmd = `firebase storage:buckets${projectArg} --json`;
      const bucketList = JSON.parse(execSync(listCmd, { encoding: 'utf8' }));
      bucket = bucketList[0];
    } catch (err) {
      console.warn('Failed to get bucket list, trying gsutil:', err.message);

      try {
        // Check if gsutil is installed and authenticated
        execSync('gsutil version', { stdio: 'ignore' });

        // If projectId is available, try to construct the default bucket name
        if (projectId) {
          bucket = `${projectId}.appspot.com`;
        } else {
          // Fall back to using gsutil to list buckets
          const gsutilBuckets = execSync('gsutil ls', { encoding: 'utf8' }).trim().split('\n');
          bucket = gsutilBuckets.length > 0 ? gsutilBuckets[0].replace('gs://', '').trim() : null;
        }
      } catch (gsutilErr) {
        console.error('gsutil is not installed or not authenticated:', gsutilErr.message);
        console.error('Please install and authenticate gsutil: https://cloud.google.com/storage/docs/gsutil_install');
        return false;
      }
    }

    if (!bucket) {
      throw new Error('No storage bucket found');
    }

    // Check for valid service account for authentication
    const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      // Use service account for authentication
      process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
    }

    // Set CORS configuration using gsutil
    const cmd = `gsutil cors set ${configFilePath} gs://${bucket}`;

    execSync(cmd, { encoding: 'utf8' });

    // Remove the temporary file
    fs.unlinkSync(configFilePath);

    return true;
  } catch (err) {
    console.error('Error configuring CORS:', err.message);
    return false;
  }
}

// Add production domains that should have access
function getProductionDomains(projectId) {
  if (!projectId) return [];

  return [
    `${projectId}.web.app`,
    `${projectId}.firebaseapp.com`,
    // Add other common production domains here
  ];
}

// Main execution
(async function main() {
  try {
    // Get configuration
    const envConfig = await getEnvironmentConfig();
    const projectConfig = await getProjectConfig();

    // Get project ID from either source
    const projectId = projectConfig.projectId || envConfig.projectId;

    if (!projectId) {
      console.warn('Could not determine Firebase project ID. CORS configuration may be incomplete.');
    }

    // Combine default, production, and environment-specific domains
    const domains = [
      ...DEFAULT_ALLOWED_DOMAINS,
      ...getProductionDomains(projectId),
      ...(envConfig.allowedDomains || [])
    ];

    // Add wildcards to ensure broader coverage
    domains.push('*'); // This allows any origin, which is fine for dev but review for prod

    // Create CORS config file
    const configFilePath = createCorsConfigFile(domains);

    // Apply CORS configuration
    const success = configureCors(configFilePath, projectId);

    if (success) {
      console.log('✅ CORS configuration completed successfully');
    } else {
      console.error('❌ CORS configuration failed');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error in CORS configuration script:', err);
    process.exit(1);
  }
})();