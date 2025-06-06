/**
 * A reusable pattern for creating authenticated forms with VueFire
 * This demonstrates a reliable pattern for handling authentication state
 */
import { ref, computed, watch } from 'vue'
import { doc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { useAuth } from '../useAuth'
import { useUnifiedForm } from './useForm'
import type { FormOptions, FormAPI } from './types'

/**
 * Creates an authenticated form that safely handles auth state changes
 * @param options Configuration options
 * @returns A form instance with proper auth handling
 */
export function createAuthenticatedForm<T>(options: {
  collection: string
  initialState: T
  createForm: (docRef: any) => any
  createPlaceholder: () => any
}) {
  // Get auth and firestore
  const { user } = useAuth() // Changed from currentUser to user to match our custom useAuth
  const firestore = useFirestore()

  // Form state tracking
  const isLoading = ref(true)
  const error = ref<Error | null>(null)
  const formInstance = ref(options.createPlaceholder())

  // Document reference based on authentication
  const docRef = computed(() => {
    if (!user?.value?.uid || user?.value?.isAnonymous) {
      console.log('No authenticated user available for document reference')
      return null
    }

    console.log(
      `Creating document reference for ${options.collection}/${user.value.uid}`
    )
    return doc(firestore, options.collection, user.value.uid)
  })

  // Watch for auth changes and update form accordingly
  watch(
    user,
    (newUser) => {
      console.log('Auth state changed:', {
        uid: newUser?.uid,
        isAnonymous: newUser?.isAnonymous,
      })

      if (newUser?.uid && !newUser.isAnonymous) {
        // User is authenticated, create the real form
        isLoading.value = true

        try {
          // Create document reference
          const userDocRef = doc(firestore, options.collection, newUser.uid)

          // Create the form with the document reference
          formInstance.value = options.createForm(userDocRef)

          console.log('Created authenticated form instance')
        } catch (err: any) {
          console.error('Error creating authenticated form:', err)
          error.value = err
          formInstance.value = options.createPlaceholder()
        } finally {
          // Ensure loading state gets reset after a reasonable timeout
          setTimeout(() => {
            isLoading.value = false
          }, 1000)
        }
      } else {
        // No authenticated user, use placeholder
        console.log('No authenticated user, using placeholder form')
        formInstance.value = options.createPlaceholder()
        isLoading.value = false
      }
    },
    { immediate: true }
  )

  // Safety timeout to prevent infinite loading
  setTimeout(() => {
    if (isLoading.value) {
      console.log('Loading timeout reached, forcibly ending loading state')
      isLoading.value = false
    }
  }, 5000)

  // Return the form instance with added auth-aware properties
  return {
    ...formInstance.value,
    isLoading,
    error,
    isAuthenticated: computed(
      () => !!user?.value?.uid && !user?.value?.isAnonymous
    ),
  }
}

/**
 * Legacy composable for authenticated forms - wraps useUnifiedForm with authentication
 * @deprecated Use useProfileForm or useUserSettingsForm instead
 */
export function useAuthenticatedForm<T extends Record<string, any>>(
  options: FormOptions<T>
): FormAPI<T> {
  // Get authentication state
  const { user, isAuthenticated } = useAuth()

  // Create form instance using unified form system
  const form = useUnifiedForm<T>({
    ...options,
    // Add any auth-specific handling here
  })

  // Return form API with additional auth context
  return {
    ...form,
    // Additional properties can be added here if needed
  }
}
