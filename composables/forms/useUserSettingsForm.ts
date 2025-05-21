import { ref, computed, watch } from 'vue'
import { doc, type Firestore } from 'firebase/firestore'
import { useFirestoreForm } from './useFirestoreForm'
import { useAuth } from '../useAuth'
import { useNuxtApp } from '#app'

export interface UserSettingsData {
  displayName: string
  email: string // Read-only from Firebase Auth
  bio: string
  notificationsEnabled: boolean
  theme: string
  avatarUrl?: string
  uiPreferences?: {
    fontSize?: 'small' | 'medium' | 'large'
    compactView?: boolean
    sidebarExpanded?: boolean
  }
  // Add any other user profile fields
}

export interface UserSettingsFormOptions {
  initialSync?: boolean
  syncImmediately?: boolean
  debounceTime?: number
}

// Create an interface for Firestore form return type with the properties we need
interface FirestoreFormType<T> {
  formData: T
  formErrors: Record<string, string>
  isSubmitting: Ref<boolean>
  isValid: Ref<boolean>
  successMessage: Ref<string>
  errorMessage: Ref<string>
  handleSubmit: () => Promise<boolean>
  validateField: (field: string) => boolean
  resetForm: () => void
  isDirty: Ref<boolean>
  // Firestore-specific properties
  saveToFirestore: () => Promise<boolean>
  changedFields: string[]
  isLoading?: Ref<boolean>
}

/**
 * User settings form composable that uses Firestore integration
 * This leverages our consolidated form system
 */
export function useUserSettingsForm(options: UserSettingsFormOptions = {}) {
  const { user, updateUserProfile } = useAuth()
  const nuxtApp = useNuxtApp()

  // Create our own loading state that we control directly
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // Access Firestore directly from nuxtApp with correct typing
  const firestore = nuxtApp.$firebaseFirestore as Firestore | null

  // Default options
  const {
    initialSync = true,
    syncImmediately = true,
    debounceTime = 1500,
  } = options

  // Initialize state for tracking last save time
  const lastSaveTime = ref<number | null>(null)

  // Initial state for user settings
  const initialState: UserSettingsData = {
    displayName: '',
    email: '',
    bio: '',
    notificationsEnabled: true,
    theme: 'auto',
    uiPreferences: {
      fontSize: 'medium',
      compactView: false,
      sidebarExpanded: true,
    },
  }

  // Track if we have a valid user
  const isUserAvailable = computed(() => {
    const hasUser = Boolean(user.value?.uid && !user.value?.isAnonymous)
    const hasFirestore = Boolean(firestore)

    console.log('User status check:', {
      hasUser,
      hasFirestore,
      uid: user.value?.uid,
      isAnonymous: user.value?.isAnonymous,
    })

    return hasUser && hasFirestore
  })

  // User document reference - handling both authenticated and anonymous users
  const userDocRef = computed(() => {
    if (!user.value?.uid || !firestore) return null

    // Use 'users' collection for verified users, 'anonUsers' for anonymous
    const collection = user.value.isAnonymous ? 'anonUsers' : 'users'
    return doc(firestore, collection, user.value.uid)
  })

  // Create a placeholder form for non-authenticated states
  const createPlaceholderForm = () => {
    isLoading.value = false // Ensure loading is false for placeholder
    console.warn(
      'Creating placeholder form - no valid user document reference available'
    )

    return {
      formData: { ...initialState },
      formErrors: {},
      isSubmitting: ref(false),
      isValid: ref(true),
      successMessage: ref(''),
      errorMessage: ref('User not authenticated'),
      handleSubmit: async () => false,
      resetForm: () => {},
      validateField: () => true,
      isDirty: computed(() => false),
      changedFields: [],
      saveToFirestore: async () => false,
      isLoading: ref(false), // Ensure the placeholder form is not in loading state
    } as FirestoreFormType<UserSettingsData>
  }

  // Function to create the form when the user becomes available
  const createForm = () => {
    if (!userDocRef.value) {
      console.warn('Cannot create form - no document reference available')
      return createPlaceholderForm()
    }

    console.log('Creating form with user document:', userDocRef.value.path)

    // Set loading state to true while creating form
    isLoading.value = true

    const form = useFirestoreForm<UserSettingsData>({
      initialState,
      docRef: userDocRef.value,
      createIfNotExists: true,
      syncImmediately,
      debounceTime,
      progressiveSave: true,
      excludeFields: ['email'], // Email is managed by Firebase Auth, not Firestore

      // Transform data before saving to Firestore (remove null/undefined values)
      transformBeforeSave: (data) => {
        const cleaned: Record<string, any> = {}

        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            cleaned[key] = value
          }
        }

        return cleaned
      },

      // Validation rules if needed
      validationRules: {
        displayName: (value) => {
          if (!value || value.trim() === '') return 'Display name is required'
          return true
        },
        bio: (value) => {
          if (value && value.length > 500)
            return 'Bio must be less than 500 characters'
          return true
        },
      },
    }) as unknown as FirestoreFormType<UserSettingsData>

    // Add our custom load handler
    if (form.isLoading) {
      // We're watching the internal form's loading state
      watch(
        form.isLoading,
        (newVal) => {
          isLoading.value = newVal
          if (!newVal) {
            console.log('Form data loaded successfully')
          }
        },
        { immediate: true }
      )
    } else {
      // Set loading to false if there's no internal loading state
      setTimeout(() => {
        isLoading.value = false
      }, 1000)
    }

    return form
  }

  // Create initial form or placeholder based on current user state
  let firestoreForm = isUserAvailable.value
    ? createForm()
    : createPlaceholderForm()

  // Sync Firebase Auth display name with Firestore when saved
  const syncWithFirebaseAuth = async () => {
    if (!user.value || !firestoreForm?.isDirty?.value) return true

    // Check if displayName has changed (using optional chaining for safety)
    const changedFields = firestoreForm.changedFields || []

    if (changedFields.includes('displayName')) {
      try {
        await updateUserProfile({
          displayName: firestoreForm.formData.displayName,
        })
        return true
      } catch (error) {
        console.error('Error updating Firebase Auth profile:', error)
        firestoreForm.errorMessage.value =
          'Failed to update profile in Firebase Auth'
        return false
      }
    }

    return true
  }

  // Enhance the saveToFirestore method to also update Firebase Auth
  const saveSettings = async () => {
    if (!firestoreForm) return false

    // Save to Firestore first
    let success = false

    try {
      // Try to use saveToFirestore if available
      success = await firestoreForm.saveToFirestore()
    } catch (e) {
      // Fall back to handleSubmit if saveToFirestore is not available
      console.warn(
        'saveToFirestore not available, falling back to handleSubmit'
      )
      success = await firestoreForm.handleSubmit()
    }

    if (!success) return false

    // Update last save timestamp
    lastSaveTime.value = Date.now()

    // Then sync with Firebase Auth
    const authSuccess = await syncWithFirebaseAuth()
    return authSuccess
  }

  // Initialize form with user data from Firebase Auth
  const initializeFromAuthUser = () => {
    if (!user.value || !firestoreForm) return

    console.log(
      'Initializing form with auth user data:',
      user.value.displayName
    )

    // Set email from Firebase Auth (read-only)
    if (user.value.email) {
      firestoreForm.formData.email = user.value.email
    }

    // Set display name from Firebase Auth if not already set in Firestore
    if (user.value.displayName && !firestoreForm.formData.displayName) {
      firestoreForm.formData.displayName = user.value.displayName
    }
  }

  // Ensure we're properly tracking authentication changes
  watch(
    user,
    async (newUser, oldUser) => {
      console.log('User changed:', {
        isNew: Boolean(newUser),
        isOld: Boolean(oldUser),
        isAnon: newUser?.isAnonymous,
      })

      if (newUser?.uid && !newUser.isAnonymous) {
        // Force create new form when user changes from anonymous to authenticated
        if (oldUser?.isAnonymous || !oldUser) {
          console.log('User authenticated, creating form')
          firestoreForm = createForm()
          if (firestoreForm && initialSync) {
            setTimeout(() => {
              initializeFromAuthUser()
            }, 500) // Add delay to ensure form is ready
          }
        }
      } else if (newUser === null) {
        // User signed out, reset to placeholder
        firestoreForm = createPlaceholderForm()
      }
    },
    { immediate: true }
  )

  // Ensure loading state is properly set at startup
  if (!isUserAvailable.value) {
    isLoading.value = false
  }

  // Initialize if we have a valid user
  if (isUserAvailable.value && initialSync && firestoreForm) {
    initializeFromAuthUser()
  }

  // Fix for when form gets stuck in loading state
  setTimeout(() => {
    // Force loading to end after a few seconds as a fallback
    if (isLoading.value) {
      console.log('Force ending loading state after timeout')
      isLoading.value = false
    }
  }, 5000)

  // Return combined form interface
  return {
    ...(firestoreForm || createPlaceholderForm()),
    isUserAvailable,
    saveSettings,
    initializeFromAuthUser,
    isLoading,
    loadError,
    lastSaveTime,
  }
}
