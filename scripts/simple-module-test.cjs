#!/usr/bin/env node

console.log('Testing native module availability...');

try {
  console.log('Attempting to load better-sqlite3...');
  const sqlite = require('better-sqlite3');
  console.log('✅ better-sqlite3 module loaded successfully');
} catch (error) {
  console.error('❌ Error loading better-sqlite3:', error.message);
}

try {
  console.log('\nAttempting to load unrs-resolver...');
  const unrs = require('unrs-resolver');
  console.log('✅ unrs-resolver module loaded successfully');
} catch (error) {
  console.error('❌ Error loading unrs-resolver:', error.message);
}

console.log('\nTesting complete');
