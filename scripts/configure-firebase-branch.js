const fs = require('fs');
const path = require('path');

const branchName = process.env.BRANCH_NAME; // This will be the sanitized branch slug
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
  // Output default names for consistency in workflow, though they might not be strictly needed if firebase.json is unchanged
  console.log(`function_name=server`);
  console.log(`hosting_site_id=`); // Empty means default site for the project
  process.exit(0);
}

// For feature branches, create unique names
const functionName = `server-${branchName}`;
const siteId = branchName; // This will result in branchName.project-id.web.app

console.log(`Configuring for feature branch: ${branchName}`);
console.log(`  New function name: ${functionName}`);
console.log(`  New hosting site ID: ${siteId}`);

// Ensure hosting object and rewrites array exist
if (!firebaseConfig.hosting) {
  firebaseConfig.hosting = { public: '.output/public' }; // Default public if not set
}
firebaseConfig.hosting.site = siteId; // Set the target site for hosting deployment

if (!firebaseConfig.hosting.rewrites || !Array.isArray(firebaseConfig.hosting.rewrites)) {
  console.log('No valid hosting.rewrites array found, creating default.');
  firebaseConfig.hosting.rewrites = [];
}

// Update or add the main rewrite rule
let serverRewriteFound = false;
firebaseConfig.hosting.rewrites = firebaseConfig.hosting.rewrites.map(rewrite => {
  // Assuming the primary function rewrite targets a function originally named 'server'
  if (rewrite.function === 'server' || (rewrite.source === '**' && rewrite.function)) {
    serverRewriteFound = true;
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
