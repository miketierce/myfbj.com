import { computed, ref, watch } from 'vue'
import { doc } from 'firebase/firestore'
import { useUnifiedForm } from '../useForm'
import { useAuth } from '~/composables/useAuth'
import { useFirebaseApp } from '~/composables/utils/useFirebaseApp'
import type { FormOptions, FirestoreFormAPI, FormAPI } from '../types'

export interface UserSettingsData {
  displayName: string
  email: string
  bio: string
  notificationsEnabled: boolean
  theme: string
  uiPreferences: {
    fontSize: string
    compactView: boolean
    sidebarExpanded: boolean
    // Add other UI preferences as needed
  }
  // Add other settings as needed
}

export interface UserSettingsFormOptions {
  mode?: 'standard' | 'firestore' | 'vuefire' | 'vuex'
  formId?: string
  initialSync?: boolean // Whether to sync with Firebase Auth on init
  syncImmediately?: boolean // Whether to sync changes immediately (Firestore modes)
  debounceTime?: number // Debounce time for Firestore updates
}

/**
 * User settings form composable that supports all form modes
 *
 * @example
 * // Standard form
 * const settingsForm = useUserSettingsForm()
 *
 * @example
 * // Firestore form
 * const settingsForm = useUserSettingsForm({ mode: 'firestore' })
 *
 * @example
 * // VueFire form
 * const settingsForm = useUserSettingsForm({ mode: 'vuefire' })
 *
 * @example
 * // Vuex form
 * const settingsForm = useUserSettingsForm({ mode: 'vuex' })
 */
export function useUserSettingsForm(options: UserSettingsFormOptions = {}) {
  // Get authentication state
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // Get Firestore instance
  const { firestore } = useFirebaseApp()

  // Create our own loading state that we control directly
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // Default options
  const {
    mode = 'firestore',
    formId = 'user-settings',
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
    return hasUser && hasFirestore
  })

  // User document reference - handling both authenticated and anonymous users
  const userDocRef = computed(() => {
    if (!user.value?.uid || !firestore) return undefined

    // Use 'users' collection for verified users, 'anonUsers' for anonymous
    const collection = user.value.isAnonymous ? 'anonUsers' : 'users'
    return doc(firestore, collection, user.value.uid)
  })

  // Create a placeholder form for non-authenticated states
  const createPlaceholderForm = () => {
    isLoading.value = false

    const placeholderForm: FormAPI<UserSettingsData> = {
      formData: { ...initialState },
      formErrors: {},
      isSubmitting: ref(false),
      isValid: ref(true),
      successMessage: ref(''),
      errorMessage: ref('User not authenticated'),
      handleSubmit: async () => false,
      resetForm: () => {},
      validateField: () => true,
      validateAllFields: () => true,
      updateField: () => {},
      updateFields: () => {},
      isDirty: computed(() => false),
      changedFields: [],
      cleanup: () => {},
    }

    return placeholderForm
  }

  // Form validation rules
  const validationRules = {
    displayName: (value: any) => {
      if (!value || value.trim() === '') return 'Display name is required'
      return true
    },
    bio: (value: any) => {
      if (value && value.length > 500)
        return 'Bio must be less than 500 characters'
      return true
    },
  }

  // Function to create the form when the user becomes available
  const createForm = () => {
    if (!userDocRef.value) {
      return createPlaceholderForm()
    }

    // Set loading state to true while creating form
    isLoading.value = true

    // Create form options
    const formOptions: FormOptions<UserSettingsData> = {
      formId,
      mode,
      initialState,
      docRef: userDocRef.value,
      validationRules,
      createIfNotExists: true,
      syncImmediately,
      debounceTime,
      transformBeforeSave: (data) => {
        const cleaned: Record<string, any> = {}
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            cleaned[key] = value
          }
        }
        return cleaned
      },
    }

    const form = useUnifiedForm<UserSettingsData>(formOptions)

    // Set loading state based on form initialization
    if ('isLoading' in form) {
      const firestoreForm = form as FirestoreFormAPI<UserSettingsData> & {
        isLoading?: any
      }
      if (firestoreForm.isLoading) {
        watch(
          firestoreForm.isLoading,
          (newVal) => {
            isLoading.value = newVal
          },
          { immediate: true }
        )
      } else {
        // Set loading to false if there's no internal loading state
        setTimeout(() => {
          isLoading.value = false
        }, 1000)
      }
    } else {
      // For standard forms, we control loading directly
      setTimeout(() => {
        isLoading.value = false
      }, 1000)
    }

    return form
  }

  // Create initial form or placeholder based on current user state
  let settingsForm = isUserAvailable.value
    ? createForm()
    : createPlaceholderForm()

  // Check if form is a Firestore-based form
  const isFirestoreForm = computed(
    () =>
      settingsForm &&
      'saveToFirestore' in settingsForm &&
      typeof settingsForm.saveToFirestore === 'function'
  )

  // Sync Firebase Auth display name with Firestore when saved
  const syncWithFirebaseAuth = async () => {
    if (!user.value) return true

    const isDirty =
      isFirestoreForm.value && 'isDirty' in settingsForm
        ? settingsForm.isDirty.value
        : false
    if (!isDirty) return true

    // Check if displayName has changed
    const changedFields =
      isFirestoreForm.value && 'changedFields' in settingsForm
        ? settingsForm.changedFields
        : []

    if (Array.isArray(changedFields) && changedFields.includes('displayName')) {
      try {
        await updateUserProfile({
          displayName: settingsForm.formData.displayName,
        })
        return true
      } catch (error) {
        console.error('Error updating Firebase Auth profile:', error)
        settingsForm.errorMessage.value =
          'Failed to update profile in Firebase Auth'
        return false
      }
    }

    return true
  }

  // Enhance the saveToFirestore method to also update Firebase Auth
  const saveSettings = async () => {
    if (!settingsForm) return false

    // Save to backend
    let success = false

    if (isFirestoreForm.value) {
      try {
        // Use saveToFirestore for Firestore forms
        success = await (
          settingsForm as FirestoreFormAPI<UserSettingsData>
        ).saveToFirestore()
      } catch (e) {
        // Fall back to handleSubmit
        success = await settingsForm.handleSubmit()
      }
    } else {
      // Use standard submit for non-Firestore forms
      success = await settingsForm.handleSubmit()
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
    if (!user.value || !settingsForm) return

    // Set email from Firebase Auth (read-only)
    if (user.value.email) {
      settingsForm.formData.email = user.value.email
    }

    // Set display name from Firebase Auth if not already set
    if (user.value.displayName && !settingsForm.formData.displayName) {
      settingsForm.formData.displayName = user.value.displayName
    }
  }

  // Ensure we're properly tracking authentication changes
  watch(
    user,
    async (newUser, oldUser) => {
      if (newUser?.uid && !newUser.isAnonymous) {
        // Force create new form when user changes from anonymous to authenticated
        if (oldUser?.isAnonymous || !oldUser) {
          settingsForm = createForm()
          if (settingsForm && initialSync) {
            setTimeout(() => {
              initializeFromAuthUser()
            }, 500) // Add delay to ensure form is ready
          }
        }
      } else if (newUser === null) {
        // User signed out, reset to placeholder
        settingsForm = createPlaceholderForm()
      }
    },
    { immediate: true }
  )

  // Ensure loading state is properly set at startup
  if (!isUserAvailable.value) {
    isLoading.value = false
  }

  // Initialize if we have a valid user
  if (isUserAvailable.value && initialSync && settingsForm) {
    initializeFromAuthUser()
  }

  // Fix for when form gets stuck in loading state
  setTimeout(() => {
    // Force loading to end after a few seconds as a fallback
    if (isLoading.value) {
      isLoading.value = false
    }
  }, 5000)

  // Format save time as "2 minutes ago" etc.
  const formatSaveTime = (timestamp: number | null): string => {
    if (!timestamp) return 'never'

    const now = Date.now()
    const diff = now - timestamp

    // Less than a minute
    if (diff < 60 * 1000) {
      return 'just now'
    }

    // Minutes
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    }

    // Hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    }

    // Days
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  // Compute overall loading state
  const isLoading = computed(
    () =>
      authLoading.value ||
      !formReady.value ||
      (form as FirestoreFormAPI<any>).isLoading?.value
  )

  // Create error object for compatibility with template
  const error = computed(() =>
    form.errorMessage.value ? { message: form.errorMessage.value } : null
  )

  // Methods to expose
  const setupForm = () => {
    // Pre-populate with user data when available
    if (user.value && isAuthenticated.value) {
      form.updateFields({
        email: user.value.email || '',
        displayName: user.value.displayName || '',
      })

      // Mark form as ready
      formReady.value = true
    }
  }

  // Return combined form interface
  return {
    ...settingsForm,
    isUserAvailable,
    saveSettings,
    initializeFromAuthUser,
    isLoading,
    loadError,
    lastSaveTime,
    isFirestoreForm: isFirestoreForm.value,
    formatSaveTime,
    error,
    isAuthenticated,
    setupForm,
    formReady,
  }
}
