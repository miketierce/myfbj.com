import { watch, reactive } from 'vue'
import { defineNuxtPlugin } from '#app'

// Create a reactive theme state that will be globally available
// and synchronize with theme settings across the application
export const themeState = reactive({
  currentTheme: 'wireframe', // Default to light theme as fallback
  isDark: false,
  isLoading: false,

  // Adding toggle and set methods to the state itself
  // to ensure consistency across the application
  toggleTheme: () => {
    // This will be replaced with the real function in app:mounted
    console.log('Theme toggle not yet initialized')
  },
  setTheme: (theme: string) => {
    // This will be replaced with the real function in app:mounted
    console.log('Theme set not yet initialized')
  },
})

// Make the theme state globally accessible and centralized
export default defineNuxtPlugin((nuxtApp) => {
  // Get SSR theme from context if available (set by server middleware)
  if (process.server) {
    const ssrContext = nuxtApp.ssrContext
    if (ssrContext?.event?.context?.theme) {
      const theme = ssrContext.event.context.theme
      themeState.currentTheme =
        theme === 'wireframeDark' ? 'wireframeDark' : 'wireframe'
      themeState.isDark = theme === 'wireframeDark'
      console.log('SSR theme detected:', themeState.currentTheme)
    }
  }

  // Set up during app:created to be available sooner (important for client-side)
  nuxtApp.hook('app:created', () => {
    // Set default based on localStorage if available
    if (import.meta.client) {
      const storedTheme = localStorage.getItem('preferredTheme')
      if (storedTheme === 'wireframe' || storedTheme === 'wireframeDark') {
        themeState.currentTheme = storedTheme
        themeState.isDark = storedTheme === 'wireframeDark'
      }
    }
  })

  // Complete setup during app:mounted
  nuxtApp.hook('app:mounted', async () => {
    try {
      // Use dynamic ES module import instead of require
      const { useAppTheme } = await import('~/composables/useTheme')
      const { currentTheme, isDark, isLoading, toggleTheme, setTheme } =
        useAppTheme()

      // Initial sync from core theme implementation
      themeState.currentTheme = currentTheme.value
      themeState.isDark = isDark.value
      themeState.isLoading = isLoading.value

      // Replace placeholder methods with real implementations
      themeState.toggleTheme = () => {
        toggleTheme()
      }

      themeState.setTheme = (theme: string) => {
        setTheme(theme)
      }

      // Keep the global state in sync with theme changes
      watch(currentTheme, (newTheme) => {
        themeState.currentTheme = newTheme
        themeState.isDark = newTheme === 'wireframeDark'
      })

      watch(isLoading, (loading) => {
        themeState.isLoading = loading
      })

      // Also listen to direct changes to the themeState
      // and sync them back to the theme composable
      // This is needed when components modify themeState directly
      watch(
        () => themeState.currentTheme,
        (newTheme) => {
          if (newTheme !== currentTheme.value) {
            setTheme(newTheme)
          }
        }
      )
    } catch (error) {
      console.error('Error setting up theme in app:mounted:', error)
    }
  })

  return {
    provide: {
      themeState,
    },
  }
})
