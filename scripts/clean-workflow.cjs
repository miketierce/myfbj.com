#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the workflow file
const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'firebase-deploy.yml');
const content = fs.readFileSync(workflowPath, 'utf8');

// Remove all lines that start with "// filepath:"
const cleanedContent = content.split('\n')
  .filter(line => !line.trim().startsWith('// filepath:'))
  .join('\n');

// Write back the cleaned content
fs.writeFileSync(workflowPath, cleanedContent);
console.log('Successfully removed filepath comments from the workflow file.');
