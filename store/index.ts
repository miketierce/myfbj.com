import { createStore as createVuexStore } from 'vuex'
import { vuexfireMutations } from 'vuexfire'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import type { FirebaseStorage } from 'firebase/storage'

// Import modules
import userModule from './modules/user'
import formsModule from './modules/forms'

// Interface for Firebase services (will be passed to modules)
export interface FirebaseServices {
  firebaseAuth?: Auth
  firebaseFirestore?: Firestore
  firebaseStorage?: FirebaseStorage
}

// Separate store instances for client and server to avoid SSR issues
let clientStoreInstance: ReturnType<typeof createVuexStore> | null = null
let serverStoreInstance: ReturnType<typeof createVuexStore> | null = null

// Store initialization counter (for debugging)
let initCount = 0

/**
 * Create a new Vuex store with optional Firebase services
 * Use enhanced singleton pattern to ensure only one store instance per environment
 */
export function createStore(services?: FirebaseServices) {
  initCount++
  console.log(
    `[Vuex Store] Initialization attempt #${initCount}, environment: ${
      process.client ? 'client' : 'server'
    }`
  )

  // Get the appropriate store instance based on environment
  const storeInstance = process.client
    ? clientStoreInstance
    : serverStoreInstance

  // Return existing instance if already created for this environment
  if (storeInstance) {
    console.log(
      `[Vuex Store] Returning existing ${
        process.client ? 'client' : 'server'
      } store instance`
    )
    return storeInstance
  }

  // Create new store instance
  console.log(
    `[Vuex Store] Creating new ${
      process.client ? 'client' : 'server'
    } store instance`
  )

  // Create store with modules
  const store = createVuexStore({
    // Enable strict mode in development
    strict: false,

    // Setup mutations for VuexFire
    mutations: {
      // This mutation handles all the Firestore binding operations
      ...vuexfireMutations,
    },

    // Register modules with Firebase services
    modules: {
      user: userModule(services),
      forms: formsModule(services),
    },
  })

  // Store reference in the appropriate singleton
  if (process.client) {
    clientStoreInstance = store
  } else {
    serverStoreInstance = store
  }

  // Log success
  console.log(
    `[Vuex Store] Successfully initialized ${
      process.client ? 'client' : 'server'
    } store`
  )

  return store
}

// Helper to get store type for TypeScript
export type Store = ReturnType<typeof createStore>

// Helper to use store in composables with type safety
export function useStore(): Store {
  // This is just for TypeScript - the actual store is injected by the plugin
  const storeInstance = process.client
    ? clientStoreInstance
    : serverStoreInstance

  if (!storeInstance) {
    console.warn(
      `[Vuex Store] No store instance found for ${
        process.client ? 'client' : 'server'
      }, did you forget to call createStore()?`
    )
    throw new Error('Vuex store not initialized')
  }

  return storeInstance
}
