import { ref, watch, computed } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { useCookie, useNuxtApp, useHead, useRequestEvent } from '#app'
import { themeState } from '~/plugins/theme-state'

// Single theme composable that uses the global theme state
export const useAppTheme = () => {
  const {
    $firebaseFirestore,
    $firebaseAuth,
    $updateThemeClasses,
    $themeState,
  } = useNuxtApp()
  const event = useRequestEvent()
  const vuetifyTheme = ref<any>(null) // Vuetify's theme instance

  const preferredThemeCookie = useCookie<string>('preferredTheme', {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    path: '/',
  })

  // Check if we have SSR context theme information from auth claims
  const ssrTheme = event?.context?.theme

  // Initialize currentTheme based on SSR context, or cookie, or default
  const initialThemeForHydration =
    ssrTheme || preferredThemeCookie.value || 'wireframe'
  const currentTheme = ref<string>(initialThemeForHydration)

  const isLoading = ref(false)
  const isAuthReady = ref(false)
  const authUser = ref<any>(null)
  const firestoreError = ref(false)

  // Add SSR-compatible head management to ensure theme is applied during SSR
  useHead(() => ({
    htmlAttrs: {
      class:
        currentTheme.value === 'wireframeDark'
          ? ['dark-theme', 'v-theme--wireframeDark']
          : ['light-theme', 'v-theme--wireframe'],
    },
  }))

  const safeSetVuetifyTheme = (themeName: string) => {
    try {
      if (!vuetifyTheme.value && import.meta.client) {
        vuetifyTheme.value = useVuetifyTheme()
      }
      if (vuetifyTheme.value?.global?.name) {
        // Set Vuetify's theme name
        vuetifyTheme.value.global.name = themeName

        // Direct DOM manipulation only on client-side
        if (import.meta.client) {
          if (themeName === 'wireframeDark') {
            document.documentElement.classList.add('dark-theme')
            document.documentElement.classList.add('v-theme--wireframeDark')
            document.documentElement.classList.remove('light-theme')
            document.documentElement.classList.remove('v-theme--wireframe')
            // Apply background color directly to body
            document.body.style.backgroundColor = '#121212'
          } else {
            document.documentElement.classList.add('light-theme')
            document.documentElement.classList.add('v-theme--wireframe')
            document.documentElement.classList.remove('dark-theme')
            document.documentElement.classList.remove('v-theme--wireframeDark')
            // Apply background color directly to body
            document.body.style.backgroundColor = '#FFFFFF'
          }

          // Also use the helper from the Vuetify plugin if available
          if (typeof $updateThemeClasses === 'function') {
            $updateThemeClasses(themeName)
          }
        }
      }
    } catch (err) {
      console.warn('Error setting Vuetify theme name:', err)
    }
  }

  // Use DOM manipulation instead of direct Vuetify theme API
  // This avoids the "useTheme must be called from inside a setup function" error
  const applyThemeClasses = (themeName: string) => {
    if (!import.meta.client) return

    try {
      // Direct DOM manipulation for theme classes
      if (themeName === 'wireframeDark') {
        document.documentElement.classList.add('dark-theme')
        document.documentElement.classList.add('v-theme--wireframeDark')
        document.documentElement.classList.remove('light-theme')
        document.documentElement.classList.remove('v-theme--wireframe')
        // Apply background color directly to body
        document.body.style.backgroundColor = '#121212'
      } else {
        document.documentElement.classList.add('light-theme')
        document.documentElement.classList.add('v-theme--wireframe')
        document.documentElement.classList.remove('dark-theme')
        document.documentElement.classList.remove('v-theme--wireframeDark')
        // Apply background color directly to body
        document.body.style.backgroundColor = '#FFFFFF'
      }

      // Also use the helper from the Vuetify plugin if available
      if (typeof $updateThemeClasses === 'function') {
        $updateThemeClasses(themeName)
      }

      // Set theme on v-app elements via data attribute for reactivity
      const vAppElements = document.querySelectorAll('.v-application')
      vAppElements.forEach((el) => {
        el.setAttribute('data-v-theme', themeName)
      })
    } catch (err) {
      console.warn('Error applying theme classes:', err)
    }
  }

  // Client-side initialization - instead of onMounted, expose this function
  // which will be called from the component's setup function
  const initializeTheme = () => {
    if (!import.meta.client) return

    // Initialize Vuetify theme instance client-side
    vuetifyTheme.value = useVuetifyTheme()

    // Check for server-provided theme from SSR context
    const nuxtApp = useNuxtApp()
    const ssrTheme =
      nuxtApp.payload?.serverRenderedTheme ||
      nuxtApp.payload?.data?.theme ||
      event?.context?.theme

    // If SSR provided a theme, use it directly to prevent hydration mismatch
    if (ssrTheme === 'wireframe' || ssrTheme === 'wireframeDark') {
      console.log(`Using SSR theme: ${ssrTheme}`)
      currentTheme.value = ssrTheme
      safeSetVuetifyTheme(ssrTheme)

      // Also ensure localStorage matches to prevent future conflicts
      if (import.meta.client) {
        localStorage.setItem('preferredTheme', ssrTheme)
      }

      // Wait a tick to ensure components are mounted before proceeding
      setTimeout(() => {
        // After hydration is complete, we can set up normal listeners
        setupClientThemeListeners()
      }, 50)

      return
    }

    // Otherwise, continue with normal client-side theme detection
    let clientPreferredTheme = currentTheme.value // Start with the SSR theme

    const themeFromLocalStorage = localStorage.getItem('preferredTheme')

    if (
      themeFromLocalStorage === 'wireframe' ||
      themeFromLocalStorage === 'wireframeDark'
    ) {
      clientPreferredTheme = themeFromLocalStorage // localStorage takes precedence on client
    } else if (!preferredThemeCookie.value) {
      // No cookie was found, and localStorage was not helpful. Check system preference.
      const prefersDarkMode =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      clientPreferredTheme = prefersDarkMode ? 'wireframeDark' : 'wireframe'
    }

    // Immediately ensure Vuetify theme is in sync with currentTheme before any changes
    safeSetVuetifyTheme(currentTheme.value)

    // If the client-side determined theme is different from what was used for hydration, update currentTheme.
    // This will trigger the watcher, which handles all side effects (cookie, localStorage, Vuetify, Firestore).
    if (currentTheme.value !== clientPreferredTheme) {
      currentTheme.value = clientPreferredTheme
    } else {
      // If the theme is already correct (i.e., cookie was the source or matched localStorage/system),
      // ensure Vuetify is set and localStorage/cookie are definitely in sync.
      if (localStorage.getItem('preferredTheme') !== currentTheme.value) {
        localStorage.setItem('preferredTheme', currentTheme.value)
      }
      // Cookie is already `currentTheme.value` or `null` if `currentTheme.value` is default 'wireframe'
      // If cookie was null and currentTheme is 'wireframe', ensure cookie gets set.
      if (preferredThemeCookie.value !== currentTheme.value) {
        preferredThemeCookie.value = currentTheme.value
      }
    }

    // Set up normal theme listeners
    setupClientThemeListeners()
  }

  // Extract the theme listeners to a separate function for cleaner code
  const setupClientThemeListeners = () => {
    // Auth listener for Firestore preferences
    if ($firebaseAuth) {
      try {
        onAuthStateChanged(
          $firebaseAuth,
          async (user) => {
            authUser.value = user
            isAuthReady.value = true
            if (user) {
              // Load for ALL users, including anonymous users
              const isAnon = user.isAnonymous
              await loadThemePreference(user.uid, isAnon)
            } else if (!user) {
              // User logged out or no user
              // Re-evaluate theme based on localStorage/system if auth state changes to no user
              let nonAuthTheme =
                localStorage.getItem('preferredTheme') ||
                (window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: dark)').matches
                  ? 'wireframeDark'
                  : 'wireframe')
              if (
                nonAuthTheme !== 'wireframe' &&
                nonAuthTheme !== 'wireframeDark'
              )
                nonAuthTheme = 'wireframe'

              if (currentTheme.value !== nonAuthTheme) {
                currentTheme.value = nonAuthTheme
              }
            }
          },
          (error) => {
            console.error('Auth state change error:', error)
            isAuthReady.value = true
            firestoreError.value = true
          }
        )
      } catch (authError) {
        console.error('Error setting up auth listener:', authError)
        isAuthReady.value = true
        firestoreError.value = true
      }
    } else {
      isAuthReady.value = true
    }

    // System preference listener
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const systemThemeChangeHandler = (e?: MediaQueryListEvent) => {
      // Only change if no explicit user preference is stored in localStorage or cookie
      const lsPref = localStorage.getItem('preferredTheme')
      const cookiePref = preferredThemeCookie.value
      if (!lsPref && !cookiePref) {
        const newSystemTheme = (e ? e.matches : darkModeMediaQuery.matches)
          ? 'wireframeDark'
          : 'wireframe'
        if (currentTheme.value !== newSystemTheme) {
          currentTheme.value = newSystemTheme
        }
      }
    }
    darkModeMediaQuery.addEventListener('change', systemThemeChangeHandler)
  }

  // Update the global state whenever currentTheme changes
  if (import.meta.client) {
    watch(
      currentTheme,
      (newTheme) => {
        if ($themeState) {
          $themeState.currentTheme = newTheme
          $themeState.isDark = newTheme === 'wireframeDark'
        } else if (themeState) {
          // Fallback to direct state access if inject not available
          themeState.currentTheme = newTheme
          themeState.isDark = newTheme === 'wireframeDark'
        }
      },
      { immediate: true }
    )

    watch(
      isLoading,
      (loading) => {
        if ($themeState) {
          $themeState.isLoading = loading
        } else if (themeState) {
          themeState.isLoading = loading
        }
      },
      { immediate: true }
    )
  }

  watch(
    currentTheme,
    (newTheme, oldTheme) => {
      if (newTheme !== 'wireframe' && newTheme !== 'wireframeDark') {
        console.warn(
          `Invalid theme: ${newTheme}, falling back to previous or default`
        )
        currentTheme.value = oldTheme || 'wireframe' // Revert or fallback
        return
      }

      // Use our new DOM-based function instead of Vuetify's API
      // which avoids "useTheme must be called from inside a setup function" error
      applyThemeClasses(newTheme)

      // Update cookie
      if (preferredThemeCookie.value !== newTheme) {
        preferredThemeCookie.value = newTheme
      }

      // Update localStorage (client-side only)
      if (import.meta.client) {
        if (localStorage.getItem('preferredTheme') !== newTheme) {
          localStorage.setItem('preferredTheme', newTheme)
        }
        // HTML class is managed by useHead in default.vue
      }

      // Save to Firestore if user is authenticated (including anonymous users)
      if (authUser.value && $firebaseAuth?.currentUser) {
        const isAnon = authUser.value.isAnonymous
        saveThemePreference(newTheme, $firebaseAuth.currentUser.uid, isAnon)
      }
    },
    { immediate: false }
  ) // Initial set is handled by ref initialization and initializeTheme logic.

  const toggleTheme = () => {
    currentTheme.value =
      currentTheme.value === 'wireframe' ? 'wireframeDark' : 'wireframe'
  }

  const setTheme = (theme: string) => {
    if (theme === 'wireframe' || theme === 'wireframeDark') {
      currentTheme.value = theme
    }
  }

  const isDark = computed(() => currentTheme.value === 'wireframeDark')

  const saveThemePreference = async (
    theme: string,
    userId: string,
    isAnon: boolean
  ) => {
    if (!userId) return false

    let firestoreSuccess = true
    let claimSuccess = true
    isLoading.value = true

    // Debug: Log when saveThemePreference is called
    console.log(
      `saveThemePreference called: theme=${theme}, userId=${userId}, isAnon=${isAnon}`
    )

    try {
      // Continue saving to Firestore as before
      if ($firebaseFirestore) {
        // Use the correct collection based on user type
        const collectionName = isAnon ? 'anonUsers' : 'users'
        const userRef = doc($firebaseFirestore, collectionName, userId)

        console.log(
          `Saving theme preference "${theme}" to ${collectionName}/${userId}`
        )

        // Save both the theme name and isDark status
        const themeData = {
          theme: theme,
          isDarkMode: theme === 'wireframeDark',
          themeUpdatedAt: new Date(),
        }

        await updateDoc(userRef, themeData).catch(async (err) => {
          if (err.code === 'not-found') {
            await setDoc(userRef, {
              ...themeData,
              isAnonymous: isAnon,
              uid: userId,
            })
          } else {
            throw err
          }
        })
      }

      // Skip setting auth claims for anonymous users since they don't persist
      if (!isAnon) {
        // Add the theme to Firebase Auth custom claims for SSR
        console.log(`Attempting to call set-theme-claim API for user ${userId}`)
        try {
          const response = await fetch('/api/set-theme-claim', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: userId,
              isDark: theme === 'wireframeDark',
              isAnonymous: isAnon,
            }),
          })

          const result = await response.json()
          console.log(`set-theme-claim API response:`, result)

          if (!result.success) {
            console.warn('Failed to set theme claim:', result.error)
            claimSuccess = false
          }
        } catch (claimError) {
          console.error('Error setting theme claim:', claimError)
          claimSuccess = false
        }
      } else {
        // For anonymous users, also call the API but with isAnonymous flag
        console.log(`Calling set-theme-claim API for anonymous user ${userId}`)
        try {
          const response = await fetch('/api/set-theme-claim', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: userId,
              isDark: theme === 'wireframeDark',
              isAnonymous: true,
            }),
          })

          const result = await response.json()
          console.log(
            `set-theme-claim API response for anonymous user:`,
            result
          )

          if (!result.success) {
            console.warn(
              'Failed to set theme for anonymous user:',
              result.error
            )
            claimSuccess = false
          }
        } catch (claimError) {
          console.error('Error setting theme for anonymous user:', claimError)
          claimSuccess = false
        }
      }
    } catch (error) {
      console.error('Error saving theme preference:', error)
      firestoreError.value = true
      return false
    } finally {
      isLoading.value = false
    }
  }

  const loadThemePreference = async (userId: string, isAnon: boolean) => {
    if (!$firebaseFirestore || !userId) return
    isLoading.value = true
    try {
      // Use the correct collection based on user type
      const collectionName = isAnon ? 'anonUsers' : 'users'
      const userRef = doc($firebaseFirestore, collectionName, userId)

      console.log(`Loading theme preference from ${collectionName}/${userId}`)

      // First get the current value immediately
      const docSnap = await getDoc(userRef)
      if (docSnap.exists()) {
        const userData = docSnap.data()
        if (
          userData?.theme &&
          (userData.theme === 'wireframe' || userData.theme === 'wireframeDark')
        ) {
          console.log(`Found theme preference: ${userData.theme}`)
          if (currentTheme.value !== userData.theme) {
            currentTheme.value = userData.theme // This will trigger watcher
          }
        }
      }

      // Then set up a real-time listener for future changes
      const unsubscribe = onSnapshot(
        userRef,
        (doc) => {
          if (doc.exists()) {
            const userData = doc.data()
            if (
              userData?.theme &&
              (userData.theme === 'wireframe' ||
                userData.theme === 'wireframeDark')
            ) {
              console.log(`Real-time theme update: ${userData.theme}`)
              if (currentTheme.value !== userData.theme) {
                currentTheme.value = userData.theme // This will trigger watcher
              }
            }
          }
        },
        (error) => {
          console.error('Error in theme snapshot listener:', error)
          firestoreError.value = true
        }
      )

      // Store the unsubscribe function to clean up the listener when needed
      if (import.meta.client) {
        // Add to the cleanup list
        if (!window._themeSnapshotUnsubscribe) {
          window._themeSnapshotUnsubscribe = []
        }
        // Clean up any previous listener for this user
        window._themeSnapshotUnsubscribe.forEach((fn) => fn())
        window._themeSnapshotUnsubscribe = [unsubscribe]
      }
    } catch (error) {
      console.error('Error loading theme preference:', error)
      firestoreError.value = true
    } finally {
      isLoading.value = false
    }
  }

  return {
    currentTheme,
    isDark,
    isLoading,
    isAuthReady,
    toggleTheme,
    setTheme,
    initializeTheme, // Export the initialization function
  }
}
