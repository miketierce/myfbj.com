#!/usr/bin/env node

// Restore firebase.json to baseline configuration
// This should be run after branch deployments to clean up any branch-specific configurations

import fs from 'fs';
import path from 'path';

const firebaseJsonPath = path.resolve(process.cwd(), 'firebase.json');

const baselineConfig = {
  "hosting": {
    "public": ".output/public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "cleanUrls": true,
    "rewrites": [
      {
        "source": "/_nuxt/**",
        "destination": "/_nuxt/**"
      },
      {
        "source": "/assets/**",
        "destination": "/assets/**"
      },
      {
        "source": "**/*.{js,css,png,jpg,jpeg,gif,webp,svg,ico,ttf,woff,woff2}",
        "destination": "/$1"
      },
      {
        "source": "**",
        "function": "server"
      }
    ],
    "headers": [
      {
        "source": "**/*.{js,css}",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.{jpg,jpeg,png,gif,webp,svg,ico}",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.{ttf,woff,woff2}",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": ".output/server",
    "runtime": "nodejs22"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true
    }
  }
};

try {
  fs.writeFileSync(firebaseJsonPath, JSON.stringify(baselineConfig, null, 2));
  console.log('✅ Restored firebase.json to baseline configuration');
} catch (e) {
  console.error('❌ Error restoring firebase.json:', e);
  process.exit(1);
}
