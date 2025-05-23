import { watch, reactive } from 'vue'
import { defineNuxtPlugin } from '#app'

// Create a reactive theme state that will be globally available
// This is now a simplified compatibility layer over Vuetify's theme system
export const themeState = reactive({
  currentTheme: 'wireframe', // Default to light theme as fallback
  isDark: false,
  isLoading: false,
  toggleTheme: () => {}, // Placeholder, will be replaced with real function
  setTheme: (theme: string) => {}, // Placeholder, will be replaced with real function
})

export default defineNuxtPlugin((nuxtApp: any) => {
  // On app:created, set up the initial state synchronization
  nuxtApp.hook('app:created', () => {
    // Set the initial theme based on Vuetify's theme if available
    if (nuxtApp.$vuetifyTheme?.global?.name?.value) {
      themeState.currentTheme = nuxtApp.$vuetifyTheme.global.name.value
      themeState.isDark =
        nuxtApp.$vuetifyTheme.global.name.value === 'wireframeDark'
    }
  })

  // Complete setup during app:mounted to ensure all is loaded
  nuxtApp.hook('app:mounted', () => {
    // Replace placeholder functions with real implementations
    themeState.toggleTheme = () => {
      nuxtApp.$toggleTheme()
    }

    themeState.setTheme = (theme: string) => {
      nuxtApp.$setTheme(theme)
    }

    // Watch Vuetify's theme system for changes
    if (nuxtApp.$vuetifyTheme?.global?.name) {
      watch(nuxtApp.$vuetifyTheme.global.name, (newTheme) => {
        themeState.currentTheme = newTheme
        themeState.isDark = newTheme === 'wireframeDark'
      })
    }
  })

  return {
    provide: {
      themeState,
    },
  }
})
