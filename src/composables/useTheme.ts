import { computed, ref, onMounted } from 'vue'
import { useNuxtApp } from '#app'
import { useAuth } from './useAuth'
import { useFetch } from '#app'

/**
 * Improved theme composable that uses Vuetify's theme system
 * and properly persists theme preferences to Firestore/auth claims
 */
export const useAppTheme = () => {
  const nuxtApp = useNuxtApp()
  const vuetifyTheme = nuxtApp.$vuetifyTheme
  const { user } = useAuth()

  const isLoading = ref(false)
  const themeChangeCount = ref(0)
  const error = ref(null)
  const isHydrated = ref(false)

  // Create a temporary storage for preserving component state during theme changes
  const statePreservationCache = ref(new Map())

  // Get current theme directly from Vuetify
  const currentTheme = computed(() => {
    // Using themeChangeCount as a dependency ensures reactivity
    themeChangeCount.value
    return vuetifyTheme?.global?.name?.value || 'wireframe'
  })

  // Determine if current theme is dark
  const isDark = computed(() => {
    // Using themeChangeCount as a dependency ensures reactivity
    themeChangeCount.value
    return currentTheme.value === 'wireframeDark'
  })

  /**
   * Save theme preference to backend (Firestore + Auth claims)
   * This ensures the theme preference is persisted and available during SSR
   */
  const saveThemePreference = async (isDark: boolean) => {
    // Only save if user is logged in (anonymous or authenticated)
    if (!user.value?.uid) return

    try {
      // Call the server API to update theme in Firestore and auth claims
      const response = await $fetch('/api/set-theme-claim', {
        method: 'POST',
        body: {
          uid: user.value.uid,
          isDark,
          isAnonymous: user.value.isAnonymous,
        },
      })

      if (!response.success) {
        console.error('Error saving theme preference:', response.error)
        error.value = response.error
      }
    } catch (err) {
      console.error('Failed to save theme preference:', err)
      error.value = err.message || 'Failed to save theme preference'
    }
  }

  // Helper method to preserve state during theme changes
  const preserveState = (key: string, state: any) => {
    statePreservationCache.value.set(key, JSON.parse(JSON.stringify(state)))
  }

  // Helper method to retrieve preserved state
  const getPreservedState = (key: string) => {
    return statePreservationCache.value.get(key)
  }

  // Clear the preservation cache
  const clearPreservedState = (key?: string) => {
    if (key) {
      statePreservationCache.value.delete(key)
    } else {
      statePreservationCache.value.clear()
    }
  }

  // Toggle between light and dark themes
  const toggleTheme = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Get current theme state BEFORE toggling
      const wasWireframeDark = currentTheme.value === 'wireframeDark'
      // The new theme will be the opposite
      const willBeDark = !wasWireframeDark
      const newThemeName = willBeDark ? 'wireframeDark' : 'wireframe'

      // Update Vuetify's theme
      nuxtApp.$setTheme(newThemeName)

      // Update reactive state
      themeChangeCount.value++
      // Save theme preference to backend (if user is logged in)
      if (user.value?.uid) {
        await saveThemePreference(willBeDark)
      }

      // Always save to localStorage (for guests and as a fallback)
      if (import.meta.client) {
        localStorage.setItem('preferredTheme', newThemeName)

        // Also set cookie for SSR consistency
        document.cookie = `preferredTheme=${newThemeName}; path=/; max-age=31536000; SameSite=Lax`
      }

      console.log(
        `Theme toggled from ${wasWireframeDark ? 'dark' : 'light'} to ${
          willBeDark ? 'dark' : 'light'
        }`
      )
    } catch (err) {
      console.error('Error toggling theme:', err)
      error.value = err.message || 'Failed to toggle theme'
    } finally {
      // Simulate loading for UI feedback
      setTimeout(() => {
        isLoading.value = false
      }, 300)
    }
  }

  // Set a specific theme
  const setTheme = async (themeName: string) => {
    if (
      themeName !== currentTheme.value &&
      (themeName === 'wireframe' || themeName === 'wireframeDark')
    ) {
      isLoading.value = true
      error.value = null

      try {
        // Directly determine if the theme is dark based on the name
        const newIsDark = themeName === 'wireframeDark'

        // Update Vuetify's theme
        nuxtApp.$setTheme(themeName)

        // Update reactive state
        themeChangeCount.value++

        // Save theme preference to backend (if user is logged in)
        if (user.value?.uid) {
          await saveThemePreference(newIsDark)
        }

        // Always save to localStorage (for guests and as a fallback)
        if (import.meta.client) {
          localStorage.setItem('preferredTheme', themeName)

          // Also set cookie for SSR consistency
          document.cookie = `preferredTheme=${themeName}; path=/; max-age=31536000; SameSite=Lax`
        }

        console.log(
          `Theme set to ${themeName} (${newIsDark ? 'dark' : 'light'})`
        )
      } catch (err) {
        console.error('Error setting theme:', err)
        error.value = err.message || 'Failed to set theme'
      } finally {
        // Simulate loading for UI feedback
        setTimeout(() => {
          isLoading.value = false
        }, 300)
      }
    }
  }

  // Handle hydration concerns by ensuring client state matches server
  if (import.meta.client) {
    onMounted(() => {
      // Wait for hydration to complete before checking for theme mismatches
      setTimeout(() => {
        isHydrated.value = true

        // Try to match stored theme preferences if available
        const storedTheme = localStorage.getItem('preferredTheme')
        if (
          storedTheme &&
          (storedTheme === 'wireframe' || storedTheme === 'wireframeDark') &&
          storedTheme !== currentTheme.value
        ) {
          console.log(
            `Correcting theme after hydration from ${currentTheme.value} to ${storedTheme}`
          )
          nuxtApp.$setTheme(storedTheme)
          themeChangeCount.value++
        }
      }, 100)
    })
  }

  return {
    currentTheme,
    isDark,
    isLoading,
    error,
    isHydrated,
    toggleTheme,
    setTheme,
    // Add the state preservation helpers
    preserveState,
    getPreservedState,
    clearPreservedState,
    // Expose themeChangeCount for reactivity
    themeChangeCount,
    // List available themes for UI selection
    availableThemes: [
      { name: 'wireframe', label: 'Light Theme' },
      { name: 'wireframeDark', label: 'Dark Theme' },
    ],
  }
}
