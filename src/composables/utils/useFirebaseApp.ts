import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import firebaseConfig from '~~/config/firebase.config'
import { useNuxtApp } from '#app'

// Track if we've already initialized Firebase
let isInitialized = false
let lastInitializedBy = ''

/**
 * This utility ensures we only initialize Firebase once
 * Works with both direct Firebase usage and VueFire
 *
 * @param shouldInitialize - Whether to initialize Firebase if not already initialized
 * @returns Firebase app instances
 */
export function useFirebaseApp(shouldInitialize = true) {
  // Try to get Firebase instances from VueFire if already initialized
  const nuxtApp = useNuxtApp()

  try {
    // First check if we have already initialized firebase via VueFire
    if (nuxtApp.$vuefire?.app) {
      if (!isInitialized) {
        isInitialized = true
        lastInitializedBy = 'vuefire'
        // Log only in development
        if (process.dev) {
          console.log('Using Firebase instances from VueFire')
        }
      }

      // Always return VueFire instances if they exist
      return {
        app: nuxtApp.$vuefire.app,
        auth: nuxtApp.$vuefire.auth,
        firestore: nuxtApp.$vuefire.firestore,
        storage: nuxtApp.$vuefire.storage || getStorage(nuxtApp.$vuefire.app),
        config: firebaseConfig,
        _initializedBy: 'vuefire',
      }
    }
  } catch (error) {
    if (shouldInitialize && process.dev) {
      console.warn(
        'VueFire not initialized yet, checking for direct Firebase instances'
      )
    }
  }

  // Check for existing Firebase instances (without initializing)
  const hasExistingApp = getApps().length > 0

  // If we shouldn't initialize and there are no existing apps...
  if (!shouldInitialize && !hasExistingApp) {
    // In SSR context, provide mock objects to avoid errors
    if (process.server) {
      console.log('Providing mock Firebase services for SSR context')
      // Return mock Firebase services for SSR
      return {
        app: {} as any,
        auth: {} as any,
        firestore: {} as any,
        storage: {} as any,
        _initializedBy: 'mock',
        config: firebaseConfig,
      }
    }

    // In client context, throw an error if we can't initialize
    throw new Error(
      'No Firebase instances available and initialization is disabled'
    )
  }

  // Get or initialize Firebase if needed
  let app
  if (hasExistingApp) {
    app = getApp()
    if (!isInitialized) {
      isInitialized = true
      lastInitializedBy = 'existing'
      if (process.dev) {
        console.log('Using existing Firebase app instance')
      }
    }
  } else if (shouldInitialize && !isInitialized) {
    // Only initialize if explicitly told to do so and not already initialized
    app = initializeApp(firebaseConfig)
    isInitialized = true
    lastInitializedBy = 'direct'

    // Log only in development
    if (process.dev) {
      console.log('Initializing Firebase directly via useFirebaseApp')
    }
  } else {
    app = getApp() // Will throw an error if no app exists
  }

  // Get services safely with error handling
  let auth = {} as any
  let firestore = {} as any
  let storage = {} as any

  try {
    auth = getAuth(app)
  } catch (error) {
    console.error('Error getting Auth service:', error)
  }

  try {
    firestore = getFirestore(app)
  } catch (error) {
    console.error('Error getting Firestore service:', error)
  }

  try {
    storage = getStorage(app)
  } catch (error) {
    console.error('Error getting Storage service:', error)
  }

  return {
    app,
    auth,
    firestore,
    storage,
    config: firebaseConfig,
    _initializedBy: lastInitializedBy, // For debugging
  }
}
