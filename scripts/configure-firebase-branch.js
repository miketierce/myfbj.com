import fs from 'fs';
import path from 'path';

// Support both command line arguments and environment variables
const branchName = process.argv[2] || process.env.BRANCH_NAME; // This will be the sanitized branch slug
const firebaseJsonPath = path.resolve(process.cwd(), 'firebase.json');

if (!firebaseJsonPath || !fs.existsSync(firebaseJsonPath)) {
  console.error(`Error: firebase.json not found at ${firebaseJsonPath}`);
  process.exit(1);
}

let firebaseConfig;
try {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
} catch (e) {
  console.error('Error parsing firebase.json:', e);
  process.exit(1);
}

// Branches that should use the default firebase.json (i.e., 'server' function and default site for the project)
const defaultBranches = ['master', 'main', 'dev', 'development'];

if (!branchName || defaultBranches.includes(branchName)) {
  console.log(`Branch '${branchName}' uses default firebase.json configuration.`);

  // Ensure default storage configuration exists
  if (!firebaseConfig.storage) {
    firebaseConfig.storage = { rules: 'storage.rules' };
  }

  // Ensure default firestore configuration exists
  if (!firebaseConfig.firestore) {
    firebaseConfig.firestore = {
      rules: 'firestore.rules',
      indexes: 'firestore.indexes.json'
    };
  }

  // Write back the normalized configuration
  try {
    fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseConfig, null, 2));
    console.log(`Normalized firebase.json for default branch: ${branchName}`);
  } catch (e) {
    console.error('Error writing firebase.json:', e);
    process.exit(1);
  }

  // Output default names for consistency in workflow
  console.log(`function_name=server`);
  console.log(`hosting_site_id=`); // Empty means default site for the project
  process.exit(0);
}

// For feature branches, create unique names
// Replace dashes with underscores since Firebase function names cannot contain dashes
const functionName = `server_${branchName.replace(/-/g, '_')}`;

// Get Firebase project ID from environment variable or command line
const firebaseProjectId = process.argv[3] || process.env.FIREBASE_PROJECT_ID;
if (!firebaseProjectId) {
  console.error('Error: FIREBASE_PROJECT_ID environment variable is required for feature branches');
  process.exit(1);
}

// Extract a short identifier from the project ID to make site names more unique
// Firebase Hosting site names are globally unique across ALL Firebase projects
// So we combine branch name + project ID suffix to ensure uniqueness
// Firebase project IDs are unique, so using part of it ensures our site names are unique too
const projectSuffix = firebaseProjectId.substring(0, 8).replace(/[^a-z0-9]/g, ''); // Take first 8 chars, alphanumeric only
const siteId = `${branchName}-${projectSuffix}`; // This creates globally unique site names

console.log(`Configuring for feature branch: ${branchName}`);
console.log(`  Firebase Project ID: ${firebaseProjectId}`);
console.log(`  New function name: ${functionName}`);
console.log(`  New hosting site ID: ${siteId}`);

// Configure hosting for branch deployments
// Ensure hosting object exists
if (!firebaseConfig.hosting) {
  firebaseConfig.hosting = { public: '.output/public' }; // Default public if not set
}
firebaseConfig.hosting.site = siteId; // Set the target site for hosting deployment

// For development branches, we keep storage and firestore simple (default targets only)
// This avoids complex target configuration issues

// Ensure basic storage configuration exists
if (!firebaseConfig.storage) {
  firebaseConfig.storage = { rules: 'storage.rules' };
}

// Ensure basic firestore configuration exists
if (!firebaseConfig.firestore) {
  firebaseConfig.firestore = {
    rules: 'firestore.rules',
    indexes: 'firestore.indexes.json'
  };
}

if (!firebaseConfig.hosting.rewrites || !Array.isArray(firebaseConfig.hosting.rewrites)) {
  console.log('No valid hosting.rewrites array found, creating default.');
  firebaseConfig.hosting.rewrites = [];
}

// Update or add the main rewrite rule
let serverRewriteFound = false;
firebaseConfig.hosting.rewrites = firebaseConfig.hosting.rewrites.map(rewrite => {
  // Look for any catch-all rewrite rule that points to a function
  if (rewrite.source === '**' && rewrite.function) {
    serverRewriteFound = true;
    console.log(`  Updating rewrite rule from '${rewrite.function}' to '${functionName}'`);
    return { ...rewrite, function: functionName };
  }
  return rewrite;
});

if (!serverRewriteFound) {
  console.log("Adding new rewrite rule for function:", functionName);
  firebaseConfig.hosting.rewrites.push({ source: '**', function: functionName });
}

// The functions.source (.output/server) remains the same.
// The actual function is created/updated by 'firebase deploy --only functions:NEW_NAME'

try {
  fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseConfig, null, 2));
  console.log(`Updated firebase.json for branch ${branchName} with site ${siteId} and function ${functionName}`);
} catch (e) {
  console.error('Error writing updated firebase.json:', e);
  process.exit(1);
}

// Output variables for GitHub Actions
console.log(`function_name=${functionName}`);
console.log(`hosting_site_id=${siteId}`);
