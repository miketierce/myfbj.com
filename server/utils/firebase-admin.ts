// server/utils/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

// Helper function to detect the current environment
const getEnvironment = () => {
  // Detect prerendering first (most specific case)
  if (
    process.env.NITRO_PRERENDER === 'true' ||
    process.argv.includes('--prerender') ||
    process.env.__NUXT_PRERENDER__ === 'true' ||
    process.argv.some(
      (arg) => arg.includes('nuxt') && arg.includes('prerender')
    )
  ) {
    return 'prerender'
  }

  // Check for explicit environment variable (set in docker/workflow)
  if (process.env.DEPLOY_ENV) {
    return process.env.DEPLOY_ENV
  }

  // Check for Firebase-specific environments
  if (process.env.FIREBASE_CONFIG || process.env.FUNCTION_NAME) {
    return 'firebase-functions'
  }

  // Check for Cloud Run environment variables
  if (process.env.K_SERVICE || process.env.CLOUD_RUN_SERVICE) {
    return 'cloud-run'
  }

  // Default to local dev
  return 'local-dev'
}

// Get some file paths for service account checks
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootPath = join(__dirname, '..')
const projectRootPath = join(rootPath, '..')

// Various service account locations
const rootServiceAccountPath = join(__dirname, 'service-account.json')
const projectRootServiceAccountPath = join(
  projectRootPath,
  'service-account.json'
)
const functionsServiceAccountPath = join(
  projectRootPath,
  'functions',
  'service-account.json'
)
const secretsServiceAccountPath = join(
  projectRootPath,
  'secrets',
  'service-account.json'
)

// Check if we're running in a Firebase Function by examining the execution context
const isFirebaseFunction = () => {
  // Log environment to help debug
  console.log('Environment variables for Firebase detection:')
  console.log(`FUNCTION_TARGET: ${process.env.FUNCTION_TARGET || 'not set'}`)
  console.log(`FUNCTION_NAME: ${process.env.FUNCTION_NAME || 'not set'}`)
  console.log(
    `FIREBASE_CONFIG: ${process.env.FIREBASE_CONFIG ? '[exists]' : 'not set'}`
  )

  return !!(
    process.env.FIREBASE_CONFIG ||
    process.env.FUNCTION_TARGET ||
    process.env.FUNCTION_NAME
  )
}

// Try to load the service account based on environment
let serviceAccount = null
const currentEnvironment = getEnvironment()

// Only log for non-prerendering environments to avoid build noise
if (currentEnvironment !== 'prerender') {
  console.log(`Current environment detected: ${currentEnvironment}`)
}

// Initialize tracking variable
let hasInitializedAdmin = false

try {
  // For prerendering, don't try to load credentials
  if (currentEnvironment === 'prerender') {
    // Silent for prerendering
  }
  // For production or Cloud Run environments
  else if (
    currentEnvironment === 'production' ||
    currentEnvironment === 'prod' ||
    currentEnvironment === 'staging' ||
    currentEnvironment === 'cloud-run'
  ) {
    // First check for Firebase Service Account in GH Actions format (FIREBASE_SERVICE_ACCOUNT_OUR_FBJ)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_OUR_FBJ) {
      try {
        serviceAccount = JSON.parse(
          process.env.FIREBASE_SERVICE_ACCOUNT_OUR_FBJ
        )
        console.log(
          'Using service account from FIREBASE_SERVICE_ACCOUNT_OUR_FBJ environment variable'
        )
      } catch (err) {
        console.error(
          'Error parsing FIREBASE_SERVICE_ACCOUNT_OUR_FBJ environment variable:',
          err.message
        )
      }
    }
    // Check for BASE64 encoded service account
    else if (process.env.SERVICE_ACCOUNT_BASE64) {
      try {
        const decodedServiceAccount = Buffer.from(
          process.env.SERVICE_ACCOUNT_BASE64,
          'base64'
        ).toString('utf8')
        serviceAccount = JSON.parse(decodedServiceAccount)
        console.log(
          'Using service account from SERVICE_ACCOUNT_BASE64 environment variable'
        )
      } catch (err) {
        console.error(
          'Error parsing SERVICE_ACCOUNT_BASE64 environment variable:',
          err.message
        )
      }
    }
    // Check for JSON string service account
    else if (process.env.SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON)
        console.log(
          'Using service account from SERVICE_ACCOUNT_JSON environment variable'
        )
      } catch (err) {
        console.error(
          'Error parsing SERVICE_ACCOUNT_JSON environment variable:',
          err.message
        )
      }
    }
    // Check for standard GOOGLE_APPLICATION_CREDENTIALS environment variable
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
          serviceAccount = JSON.parse(
            fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
          )
          console.log(
            'Using service account from GOOGLE_APPLICATION_CREDENTIALS environment variable'
          )
        } else {
          console.warn(
            'GOOGLE_APPLICATION_CREDENTIALS file does not exist:',
            process.env.GOOGLE_APPLICATION_CREDENTIALS
          )
        }
      } catch (err) {
        console.error(
          'Error reading GOOGLE_APPLICATION_CREDENTIALS file:',
          err.message
        )
      }
    }
  } else if (currentEnvironment === 'local-dev') {
    // For local development, try to use local service account files in proper order
    // First check the project root which is now our top directory after reorganization
    if (fs.existsSync(projectRootServiceAccountPath)) {
      serviceAccount = JSON.parse(
        fs.readFileSync(projectRootServiceAccountPath, 'utf8')
      )
      console.log('Found service account file in project root directory')
    } else if (fs.existsSync(rootServiceAccountPath)) {
      serviceAccount = JSON.parse(
        fs.readFileSync(rootServiceAccountPath, 'utf8')
      )
      console.log('Found service account file in server directory')
    } else if (fs.existsSync(functionsServiceAccountPath)) {
      serviceAccount = JSON.parse(
        fs.readFileSync(functionsServiceAccountPath, 'utf8')
      )
      console.log('Found service account file in functions directory')
    } else if (fs.existsSync(secretsServiceAccountPath)) {
      serviceAccount = JSON.parse(
        fs.readFileSync(secretsServiceAccountPath, 'utf8')
      )
      console.log('Found service account file in secrets directory')
    } else {
      // If no specific file found, try several common patterns
      const possiblePaths = [
        // Current location
        'service-account.json',
        'serviceAccount.json',
        'firebase-adminsdk.json',
        // Subdirectories
        'config/service-account.json',
        'secrets/service-account.json',
        'secrets/serviceAccount.json',
        // Parent directory
        '../service-account.json',
      ]

      let foundServiceAccount = false
      for (const path of possiblePaths) {
        try {
          if (fs.existsSync(path)) {
            serviceAccount = JSON.parse(fs.readFileSync(path, 'utf8'))
            console.log(`Found service account at: ${path}`)
            foundServiceAccount = true
            break
          }
        } catch (err) {
          // Don't log errors for prerendering
          if (currentEnvironment !== 'prerender') {
            console.error(
              `Error reading service account at ${path}: ${err.message}`
            )
          }
        }
      }

      // If no service account file found, check for environment variables
      if (!foundServiceAccount) {
        if (process.env.SERVICE_ACCOUNT_JSON) {
          try {
            serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON)
            console.log(
              'Using service account from SERVICE_ACCOUNT_JSON environment variable in Firebase'
            )
            foundServiceAccount = true
          } catch (err) {
            console.error(
              `Error parsing SERVICE_ACCOUNT_JSON in Firebase: ${err.message}`
            )
          }
        } else if (process.env.SERVICE_ACCOUNT_BASE64) {
          try {
            const decodedServiceAccount = Buffer.from(
              process.env.SERVICE_ACCOUNT_BASE64,
              'base64'
            ).toString('utf8')
            serviceAccount = JSON.parse(decodedServiceAccount)
            console.log(
              'Using service account from SERVICE_ACCOUNT_BASE64 environment variable in Firebase'
            )
            foundServiceAccount = true
          } catch (err) {
            console.error(
              `Error parsing SERVICE_ACCOUNT_BASE64 in Firebase: ${err.message}`
            )
          }
        }
      }

      // If still no service account, let Firebase handle it
      if (!foundServiceAccount) {
        console.log(
          "No explicit service account found, will rely on Firebase's default credentials"
        )
      }
    }
  }
} catch (error) {
  // Only log errors for non-prerendering environments
  if (currentEnvironment !== 'prerender') {
    console.error('Error loading service account file:', error.message)
  }
}

// Mock Firebase Admin services for prerendering
const createMockService = () => ({
  // Add mock methods as needed for prerendering
  collection: () => ({
    doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) }),
  }),
  doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) }),
  getUser: async () => ({ uid: 'mock-uid', email: 'mock@example.com' }),
  verifyIdToken: async () => ({ uid: 'mock-uid' }),
  bucket: () => ({}),
})

// Firebase Admin services
let db, auth, storage

// ✅ Ensure singleton initialization with getApps() check
if (!getApps().length && currentEnvironment !== 'prerender') {
  // Initialize based on environment
  try {
    if (serviceAccount) {
      // Initialize with explicit service account credentials
      initializeApp({
        credential: cert(serviceAccount),
      })
      console.log('Firebase Admin initialized with service account credentials')
      hasInitializedAdmin = true
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_OUR_FBJ) {
      try {
        // Let Firebase handle default credentials
        initializeApp()
        console.log(
          'Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_OUR_FBJ environment variable'
        )
        hasInitializedAdmin = true
      } catch (err) {
        console.error(
          'Failed to initialize with FIREBASE_SERVICE_ACCOUNT_OUR_FBJ:',
          err.message
        )
        // Initialization failed, don't mark as initialized
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // CI/CD environment with GOOGLE_APPLICATION_CREDENTIALS
      initializeApp()
      console.log(
        'Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS'
      )
      hasInitializedAdmin = true
    } else if (currentEnvironment === 'firebase-functions') {
      // Running in Firebase Functions - let Firebase handle credentials
      initializeApp()
      console.log(
        'Firebase Admin initialized in Firebase Functions environment'
      )
      hasInitializedAdmin = true
    } else {
      // Fallback with warning (but only for non-prerender environments)
      if (currentEnvironment !== 'prerender') {
        console.warn(
          '⚠️ Firebase Admin SDK initialized without explicit credentials. Authentication may fail.'
        )
      }
      initializeApp()
      hasInitializedAdmin = true
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message)
    hasInitializedAdmin = false
  }
}

// Initialize services based on whether we've successfully initialized Firebase Admin
if (hasInitializedAdmin) {
  try {
    // Initialize real services
    db = getFirestore()
    auth = getAuth()
    storage = getStorage()
    console.log('Firebase Admin services initialized successfully')
  } catch (error) {
    console.error('Error getting Firebase Admin services:', error.message)
    // Fall back to mock services
    db = createMockService()
    auth = createMockService()
    storage = createMockService()
    console.warn(
      'Using mock Firebase Admin services due to initialization error'
    )
  }
} else if (currentEnvironment === 'prerender') {
  // Use mock services during prerendering without warnings
  db = createMockService()
  auth = createMockService()
  storage = createMockService()
} else if (getApps().length > 0) {
  // Get existing initialized services if Firebase Admin was already initialized
  console.log('Using existing Firebase Admin instance')
  try {
    db = getFirestore()
    auth = getAuth()
    storage = getStorage()
  } catch (error) {
    console.error(
      'Error getting existing Firebase Admin services:',
      error.message
    )
    // Fall back to mock services
    db = createMockService()
    auth = createMockService()
    storage = createMockService()
  }
} else {
  console.warn('No Firebase Admin app available, using mock services')
  // Fall back to mock services if no initialization was possible
  db = createMockService()
  auth = createMockService()
  storage = createMockService()
}

export { db, auth, storage }
