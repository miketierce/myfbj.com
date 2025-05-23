// filepath: /home/mike/Documents/Code/new-nuxt/composables/forms/useVueFireProfileForm.ts
import { computed } from 'vue'
import { useVueFireForm } from './useVueFireForm'
import { useFirestore } from 'vuefire'
import { useAuth } from '~/composables/useAuth'
import { doc } from 'firebase/firestore'

// Options interface for the profile form
export interface ProfileFormOptions {
  useFirestore?: boolean
  syncImmediately?: boolean
  debounceTime?: number
}

// Profile data interface
export interface ProfileData {
  displayName: string
  email: string
  bio: string
  notificationsEnabled: boolean
  photoURL?: string
  createdAt?: Date | string
  updatedAt?: Date | string
  [key: string]: any
}

/**
 * Specialized composable for managing user profile forms with VueFire
 */
export function useVueFireProfileForm(options: ProfileFormOptions = {}) {
  const {
    useFirestore: useFirestoreMode = true,
    syncImmediately = false,
    debounceTime = 1500,
  } = options

  // Get auth and Firestore from VueFire
  const auth = useAuth()
  const firestore = useFirestore()

  // Current user computed property
  const user = computed(() => auth.currentUser)

  // Document reference for user's profile
  const userProfileRef = computed(() => {
    if (!user.value?.uid) return null
    return doc(firestore, 'userProfiles', user.value.uid)
  })

  // Initial profile state
  const initialState: ProfileData = {
    displayName: '',
    email: '',
    bio: '',
    notificationsEnabled: false,
    photoURL: '',
  }

  // Validation rules for profile fields
  const validationRules = {
    displayName: (value: string) => !!value || 'Display name is required',
    bio: (value: string) =>
      value.length <= 500 || 'Bio must be 500 characters or less',
  }

  // Transform data before saving to ensure proper timestamps
  const transformBeforeSave = (data: Partial<ProfileData>) => {
    return {
      ...data,
      updatedAt: new Date(),
    }
  }

  // Use our VueFire form composable
  const vueFireForm = useVueFireForm({
    initialState,
    docRef: userProfileRef.value,
    validationRules,
    createIfNotExists: true,
    syncImmediately,
    debounceTime,
    transformBeforeSave,
  })

  // Method to synchronize form data with user auth data
  const loadUserData = async () => {
    if (user.value) {
      // Set email from auth
      vueFireForm.formData.email = user.value.email || ''

      // If display name is not set in form but exists in auth, use that
      if (!vueFireForm.formData.displayName && user.value.displayName) {
        vueFireForm.formData.displayName = user.value.displayName
      }

      // Same for photo URL
      if (!vueFireForm.formData.photoURL && user.value.photoURL) {
        vueFireForm.formData.photoURL = user.value.photoURL
      }
    }
  }

  // Flag to indicate if we're in Firestore mode
  const isFirestoreMode = computed(() => !!userProfileRef.value)

  return {
    ...vueFireForm,
    loadUserData,
    isFirestoreMode,
  }
}
