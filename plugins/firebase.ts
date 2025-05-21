import { defineNuxtPlugin } from '#app'
import { setPersistence, browserLocalPersistence } from 'firebase/auth'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'

// Plugin execution order is important. By defining a higher-order plugin,
// we can ensure this plugin runs after VueFire initialization
export default defineNuxtPlugin({
  name: 'firebase-config',
  enforce: 'post', // Ensure this runs after VueFire
  async setup(nuxtApp) {
    // Skip in SSR context
    if (process.server) {
      return
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
