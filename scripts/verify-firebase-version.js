#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('Checking Firebase Tools version');

try {
  const output = execSync('firebase --version', { encoding: 'utf8' });
  console.log('Installed version:', output.trim());

  const expectedVersion = '14.6.0';
  if (output.trim() === expectedVersion) {
    console.log('✅ Version matches expected version:', expectedVersion);
  } else {
    console.log('⚠️ Version mismatch:', output.trim(), '(expected:', expectedVersion, ')');
  }
} catch (e) {
  console.log('❌ Firebase Tools not installed:', e.message);
}

// Check if the Firebase Tools version is mentioned in key files
console.log('\nChecking Firebase Tools version references in files');

import fs from 'fs';
import path from 'path';

const filesToCheck = [
  '.github/workflows/firebase-deploy.yml',
  'docker-compose.yml',
  'setup-dev.sh',
  'NODE22-MIGRATION.md',
  'README.md'
];

const versionPattern = /firebase-tools@(\d+\.\d+\.\d+)/;

filesToCheck.forEach(file => {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    console.log(`\nChecking ${file}:`);

    const matches = content.match(new RegExp(versionPattern, 'g'));
    if (matches && matches.length > 0) {
      matches.forEach(match => {
        const version = match.match(versionPattern)[1];
        console.log(`- Found: ${version} ${version === '14.6.0' ? '✅' : '❌'}`);
      });
    } else {
      console.log('- No Firebase Tools version references found');
    }
  } catch (error) {
    console.log(`- Error checking ${file}:`, error.message);
  }
});
