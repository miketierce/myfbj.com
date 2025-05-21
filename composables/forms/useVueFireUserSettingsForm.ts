import { ref, reactive, computed } from 'vue'
import { useVueFireForm } from './useVueFireForm'
import { createAuthenticatedForm } from './useAuthenticatedForm'
import { DocumentReference } from 'firebase/firestore'

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

/**
 * User settings form composable using VueFire with reliable authentication handling
 */
export function useVueFireUserSettingsForm(
  options: UserSettingsFormOptions = {}
) {
  // Default options
  const {
    initialSync = true,
    syncImmediately = false,
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

  // Function to create a placeholder form when user is not authenticated
  const createPlaceholderForm = () => {
    const formData = reactive<UserSettingsData>({ ...initialState })
    const formErrors = reactive<Record<string, string>>({})

    return {
      formData,
      formErrors,
      isSubmitting: ref(false),
      isValid: ref(true),
      successMessage: ref(''),
      errorMessage: ref('User not authenticated'),
      handleSubmit: async () => false,
      validateField: () => true,
      resetForm: () => {},
      isDirty: ref(false),
      saveToFirestore: async () => false,
      changedFields: [],
    }
  }

  // Function to create a real form when the user is authenticated
  const createRealForm = (docRef: DocumentReference) => {
    return useVueFireForm<UserSettingsData>({
      initialState,
      docRef,
      createIfNotExists: true,
      syncImmediately,
      debounceTime,
      progressiveSave: true,
      excludeFields: ['email'], // Email is managed by Firebase Auth, not Firestore

      // Transform data before saving (remove null/undefined values)
      transformBeforeSave: (data) => {
        const cleaned: Record<string, any> = {}

        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            cleaned[key] = value
          }
        }

        return cleaned
      },

      // Validation rules
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
    })
  }

  // Create form with authentication handling
  const form = createAuthenticatedForm<UserSettingsData>({
    collection: 'users', // Store user settings in the 'users' collection
    initialState,
    createForm: createRealForm,
    createPlaceholder: createPlaceholderForm,
  })

  // Create a function to handle saving settings & updating Firebase profile
  const saveSettings = async () => {
    if (!form.isAuthenticated.value) {
      form.errorMessage.value = 'You must be signed in to save settings'
      return false
    }

    try {
      // Save to Firestore
      const saved = await form.saveToFirestore()

      if (saved) {
        lastSaveTime.value = Date.now()
        form.successMessage.value = 'Settings saved successfully'

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          if (form.successMessage.value === 'Settings saved successfully') {
            form.successMessage.value = ''
          }
        }, 3000)
      }

      return saved
    } catch (error: any) {
      console.error('Error saving settings:', error)
      form.errorMessage.value = `Failed to save: ${error.message}`
      return false
    }
  }

  return {
    ...form,
    saveSettings,
    lastSaveTime,
  }
}
