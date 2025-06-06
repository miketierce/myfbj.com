// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { resolve, join } from 'path'
import firebaseConfig from './config/firebase.config'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { defineNuxtConfig } from 'nuxt/config' // Added import
const envName = process.env.DEPLOY_ENV || 'dev'

// Use absolute path for service account
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccountPath = resolve(__dirname, './service-account.json')

// Read service account directly to provide as object
let serviceAccountCredentials = null
let hasServiceAccount = false

// Check for service account file regardless of environment
try {
  if (existsSync(serviceAccountPath)) {
    try {
      // Read and parse the service account file
      const content = readFileSync(serviceAccountPath, 'utf8')
      serviceAccountCredentials = JSON.parse(content)
      hasServiceAccount = true
      console.log(
        'Service account file found and loaded from:',
        serviceAccountPath
      )

      // Set the environment variable directly since we found the file
      // This is what nuxt-vuefire looks for according to the docs
      process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath
    } catch (parseError: any) {
      console.warn('Invalid JSON in service account file:', parseError.message)
    }
  } else {
    console.log('No service account file found at:', serviceAccountPath)

    // Try to get service account from environment variable in CI environments
    if (process.env.CI === 'true' && process.env.SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccountCredentials = JSON.parse(process.env.SERVICE_ACCOUNT_JSON)
        hasServiceAccount = true
        console.log('Service account loaded from environment variable')
      } catch (parseError: any) {
        console.warn(
          'Invalid JSON in SERVICE_ACCOUNT_JSON env var:',
          parseError.message
        )
      }
    }
  }
} catch (error: any) {
  console.warn('Error accessing service account file:', error.message)
}

// Define Firebase config for runtime - pull from environment variables if available
const runtimeFirebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    firebaseConfig.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId:
    process.env.FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
}

// Debug Firebase config (masking sensitive values)
console.log('Runtime Firebase config:', {
  apiKey: runtimeFirebaseConfig.apiKey ? '***MASKED***' : undefined,
  authDomain: runtimeFirebaseConfig.authDomain,
  projectId: runtimeFirebaseConfig.projectId,
  storageBucket: runtimeFirebaseConfig.storageBucket,
  messagingSenderId: runtimeFirebaseConfig.messagingSenderId
    ? '***MASKED***'
    : undefined,
  appId: runtimeFirebaseConfig.appId ? '***MASKED***' : undefined,
  measurementId: runtimeFirebaseConfig.measurementId
    ? '***MASKED***'
    : undefined,
})

export default defineNuxtConfig({
  srcDir: './',
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  build: {
    transpile: ['vuetify', 'vue-recaptcha-v3'],
  },
  // Ensure proper auto-imports for all content features
  imports: {
    dirs: ['./composables'], // This will be relative to srcDir (src/composables)
    global: true,
  },

  // Move VueFire configuration to the top-level vuefire property as per docs
  vuefire: {
    config: runtimeFirebaseConfig,
    auth: {
      enabled: true,
      sessionCookie: false,
      initialize: {
        onAuthStateChangedMutation: null,
        onAuthStateChangedAction: null,
      },
    },
    // Admin configuration using both approaches
    admin: hasServiceAccount
      ? {
          // Approach 1: Direct credentials (alternative method)
          credentials: serviceAccountCredentials,
        }
      : undefined,
    emulators: {
      enabled: process.env.USE_FIREBASE_EMULATORS === 'true',
    },
    firestore: {
      memoryOnly: false,
      enablePersistence: process.client,
    },
  },

  modules: [
    // Add VueFire module first to ensure it initializes Firebase before other plugins
    'nuxt-vuefire',

    // Vuetify configuration - after VueFire
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error: vuetify plugin types are not fully compatible
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/scripts',
  ],

  components: [
    // User's original component paths - Restored
    { path: '@/components' }, // @ will point to srcDir (src/components)
    { path: '@/components/prose' },
    { path: '@/components/forms' },
  ],

  // Runtime configuration
  runtimeConfig: {
    recaptchaSecretKey: '', // Not exposed to the client
    // Adding environment name to runtime config
    environment: envName, // dev, staging, or prod
    // Store Firebase configuration in runtime config for server access
    firebase: {
      ...runtimeFirebaseConfig,
    },
    public: {
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
      envName: envName,
      // Expose Firebase config to client
      firebase: {
        ...runtimeFirebaseConfig,
      },
    },
  },

  // Configure Nitro for Firebase SSR Gen2 functions deployment
  nitro: {
    preset: 'firebase',
    // Configure Firebase Gen2 functions
    firebase: {
      gen: 2, // Use 2nd generation Cloud Functions
      nodeVersion: '18', // Use Node.js 18 runtime
      httpsOptions: {
        region: process.env.FIREBASE_REGION || 'us-central1',
        minInstances: parseInt(
          process.env.FIREBASE_FUNCTION_MIN_INSTANCES || '0'
        ),
        maxInstances: parseInt(
          process.env.FIREBASE_FUNCTION_MAX_INSTANCES || '10'
        ),
        memory: process.env.FIREBASE_FUNCTION_MEMORY
          ? { value: () => process.env.FIREBASE_FUNCTION_MEMORY }
          : '1GiB', // Use GiB format with suffix
        cpu: parseInt(process.env.FIREBASE_FUNCTION_CPU || '1'),
        timeoutSeconds: parseInt(process.env.FIREBASE_FUNCTION_TIMEOUT || '60'),
        concurrency: parseInt(
          process.env.FIREBASE_FUNCTION_CONCURRENCY || '80'
        ),
      },
    },
  },

  app: {
    head: {
      // Removed Font Awesome CDN script since we're using the package
      script: [],
    },
    baseURL: '/', // Ensure baseURL is set correctly
  },

  vite: {
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        external: ['vue-recaptcha-v3'], // Add external for vue-recaptcha-v3
        output: {
          manualChunks: {
            firebase: [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/storage',
            ],
            vuetify: ['vuetify', 'vuetify/components', 'vuetify/directives'],
            vuex: ['vuex', 'vuexfire'],
            veevalidate: ['vee-validate'],
            'firebase-admin': [
              'firebase-admin/app',
              'firebase-admin/auth',
              'firebase-admin/firestore',
              'firebase-admin/storage',
            ],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['vue-recaptcha-v3'], // Include vue-recaptcha-v3
      esbuildOptions: {
        target: 'es2022',
      },
      exclude: ['@google-cloud/storage', 'firebase-admin'],
    },
    ssr: {
      noExternal: ['vuetify'],
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: ``,
        },
      },
    },
    vue: {
      template: {
        transformAssetUrls,
      },
    },

    server: {
      fs: {
        strict: false,
      },
    },
  },
  // Include only necessary CSS files
  css: [
    '@/assets/css/theme-initializer.css',
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css',
    '@fortawesome/fontawesome-free/css/all.css',
  ],
})
