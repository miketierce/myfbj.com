import { computed, ref } from 'vue'
// Use direct import with any type to bypass TypeScript errors
import { useNuxtApp } from '#app'

// Simplified theme composable that uses Vuetify's theme system directly
export const useAppTheme = () => {
  const nuxtApp = useNuxtApp()
  const $vuetifyTheme = nuxtApp.$vuetifyTheme
  const $toggleTheme = nuxtApp.$toggleTheme
  const $setTheme = nuxtApp.$setTheme

  const isLoading = ref(false)

  // Get current theme directly from Vuetify
  const currentTheme = computed(() => {
    return $vuetifyTheme?.global?.name?.value || 'wireframe'
  })

  // Determine if current theme is dark
  const isDark = computed(() => {
    return currentTheme.value === 'wireframeDark'
  })

  // Use the simplified toggle function from the Vuetify plugin
  const toggleTheme = () => {
    isLoading.value = true
    $toggleTheme()
    // Simulate loading for UI feedback
    setTimeout(() => {
      isLoading.value = false
    }, 300)
  }

  // Use the simplified set function from the Vuetify plugin
  const setTheme = (themeName: string) => {
    if (themeName !== currentTheme.value) {
      isLoading.value = true
      $setTheme(themeName)
      // Simulate loading for UI feedback
      setTimeout(() => {
        isLoading.value = false
      }, 300)
    }
  }

  return {
    currentTheme,
    isDark,
    isLoading,
    toggleTheme,
    setTheme,
    // List available themes for UI selection
    availableThemes: [
      { name: 'wireframe', label: 'Light Theme' },
      { name: 'wireframeDark', label: 'Dark Theme' },
    ],
  }
}
