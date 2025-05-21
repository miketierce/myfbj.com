import { ref, onMounted, watch, computed } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { useCookie, useNuxtApp } from '#app'

export const useAppTheme = () => {
  const { $firebaseFirestore, $firebaseAuth } = useNuxtApp()
  const vuetifyTheme = ref<any>(null) // Vuetify's theme instance

  const preferredThemeCookie = useCookie<string>('preferredTheme', {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    path: '/',
  })

  // Initialize currentTheme based ONLY on cookie or default, for SSR/hydration consistency
  const initialThemeForHydration = preferredThemeCookie.value || 'wireframe'
  const currentTheme = ref<string>(initialThemeForHydration)

  const isLoading = ref(false)
  const isAuthReady = ref(false)
  const authUser = ref<any>(null)
  const firestoreError = ref(false)

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
            document.documentElement.classList.remove('light-theme')
            // Apply background color directly to body
            document.body.style.backgroundColor = '#121212'
          } else {
            document.documentElement.classList.add('light-theme')
            document.documentElement.classList.remove('dark-theme')
            // Apply background color directly to body
            document.body.style.backgroundColor = '#FFFFFF'
          }
        }
      }
    } catch (err) {
      console.warn('Error setting Vuetify theme name:', err)
    }
  }

  onMounted(() => {
    // At this point, currentTheme.value is the SSR-consistent theme (from cookie or default).
    // Hydration should have passed for elements depending on this initial state.
    vuetifyTheme.value = useVuetifyTheme() // Initialize Vuetify theme instance client-side

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

    // If the client-side determined theme is different from what was used for hydration, update currentTheme.
    // This will trigger the watcher, which handles all side effects (cookie, localStorage, Vuetify, Firestore).
    if (currentTheme.value !== clientPreferredTheme) {
      currentTheme.value = clientPreferredTheme
    } else {
      // If the theme is already correct (i.e., cookie was the source or matched localStorage/system),
      // ensure Vuetify is set and localStorage/cookie are definitely in sync.
      safeSetVuetifyTheme(currentTheme.value)
      if (localStorage.getItem('preferredTheme') !== currentTheme.value) {
        localStorage.setItem('preferredTheme', currentTheme.value)
      }
      // Cookie is already `currentTheme.value` or `null` if `currentTheme.value` is default 'wireframe'
      // If cookie was null and currentTheme is 'wireframe', ensure cookie gets set.
      if (preferredThemeCookie.value !== currentTheme.value) {
        preferredThemeCookie.value = currentTheme.value
      }
    }

    // Auth listener for Firestore preferences
    if ($firebaseAuth) {
      try {
        onAuthStateChanged(
          $firebaseAuth,
          async (user) => {
            authUser.value = user
            isAuthReady.value = true
            if (user && !user.isAnonymous) {
              // Only load for non-anonymous users
              await loadThemePreference(user.uid, false)
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
  })

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

      safeSetVuetifyTheme(newTheme) // Update Vuetify's internal theme

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
  ) // Initial set is handled by ref initialization and onMounted logic.

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
    if (!$firebaseFirestore || !userId) return false
    isLoading.value = true
    try {
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
      return true
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
  }
}
