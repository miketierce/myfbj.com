import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { setPersistence, browserLocalPersistence } from 'firebase/auth'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import { initializeApp } from 'firebase/app'

// Plugin execution order is important. By defining a higher-order plugin,
// we can ensure this plugin runs after VueFire initialization
export default defineNuxtPlugin({
  name: 'firebase-config',
  enforce: 'post', // Ensure this runs after VueFire
  async setup(nuxtApp) {
    // Get runtime config with Firebase settings
    const runtimeConfig = useRuntimeConfig()

    // Log runtime configuration info (debug only, no sensitive values)
    if (process.dev) {
      // Only include environment in server-side logs
      // Client-side can only access public config
      console.log('Firebase plugin using runtime config:', {
        environment: process.server ? runtimeConfig.environment : 'client',
        projectId: runtimeConfig.public.firebase?.projectId || 'not-set',
        hasAuthDomain: !!runtimeConfig.public.firebase?.authDomain,
      })
    }

    // Skip in SSR context
    if (process.server) {
      return
    }

    // Check if we have runtime config for Firebase
    if (!runtimeConfig.public.firebase?.apiKey) {
      console.error(
        'Firebase API key missing from runtime config. Authentication will fail.'
      )
    }

    // We only want to configure existing Firebase instances, not create new ones
    try {
      // Get Firebase instances that should be already initialized by VueFire
      // Pass false to avoid initialization if instances don't exist
      const { auth, _initializedBy } = useFirebaseApp(false)

      if (process.dev) {
        console.log(
          `Configuring Firebase auth (initialized by: ${_initializedBy})`
        )
      }

      // Only set persistence if auth is available and we're in the browser
      if (typeof window !== 'undefined' && auth.currentUser !== undefined) {
        try {
          await setPersistence(auth, browserLocalPersistence)
          if (process.dev) {
            console.log('Firebase auth persistence set to local')
          }
        } catch (error) {
          console.error('Error setting auth persistence:', error)
        }
      }
    } catch (error) {
      console.error('Error in firebase plugin:', error)
    }
  },
})
