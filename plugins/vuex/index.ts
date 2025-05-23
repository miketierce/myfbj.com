import { defineNuxtPlugin } from '#app'
import { createStore } from '~/store'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'

export default defineNuxtPlugin({
  name: 'vuex',
  // Make sure this runs after VueFire initialization
  enforce: 'post',
  setup(nuxtApp) {
    // Log which environment we're in

    try {
      // Get existing Firebase instances without initializing new ones
      const firebaseServices = useFirebaseApp(false)

      // Create or get existing Vuex store with Firebase services
      // Our enhanced singleton pattern will ensure we don't create duplicate stores
      const store = createStore({
        firebaseAuth: firebaseServices.auth,
        firebaseFirestore: firebaseServices.firestore,
        firebaseStorage: firebaseServices.storage,
      })

      // Provide store to app - only if not already provided
      if (!nuxtApp.vueApp.config.globalProperties.$store) {
        nuxtApp.vueApp.config.globalProperties.$store = store
      }

      // Provide via injection API - only if not already provided
      nuxtApp.vueApp.provide('store', store)
      nuxtApp.provide('store', store)

      // Only initialize modules once - check if they're already initialized by looking at state
      if (!store.state.forms || !store.state.forms.initialized) {
        store.dispatch('forms/initialize')
      }

      // For auth-dependent modules, check if auth exists first
      if (
        firebaseServices.auth &&
        Object.keys(firebaseServices.auth).length > 0 &&
        (!store.state.user || !store.state.user.initialized)
      ) {
        console.log('[Vuex Plugin] Initializing user module')
        store.dispatch('user/initialize').catch((err) => {
          console.warn(
            '[Vuex Plugin] Could not initialize user module:',
            err.message
          )
        })
      }

      console.log('[Vuex Plugin] Vuex store setup complete')

      return { store }
    } catch (error) {
      const store = createStore({})
      nuxtApp.vueApp.config.globalProperties.$store = store
      nuxtApp.vueApp.provide('store', store)
      nuxtApp.provide('store', store)

      return { store }
    }
  },
})
