import { computed } from 'vue'
import { useUnifiedForm } from '../useForm'
import { useValidation } from '../useValidation'
import { useAuth } from '../../useAuth'
import { doc } from 'firebase/firestore'
import { useFirebaseApp } from '../../utils/useFirebaseApp'
import type { FormOptions } from '../types'

export interface ProfileFormData {
  displayName: string
  email: string
  bio?: string
  notificationsEnabled?: boolean
  // Add other profile fields as needed
}

export interface ProfileFormOptions {
  mode?: 'standard' | 'firestore' | 'vuefire' | 'vuex'
  formId?: string
  syncImmediately?: boolean // Whether to sync changes immediately (Firestore modes only)
  debounceTime?: number // Debounce time for Firestore updates (default: 1500ms)
}

/**
 * Profile form composable that supports all form modes (standard, firestore, vuefire, vuex)
 *
 * @example
 * // Standard form
 * const profileForm = useProfileForm()
 *
 * @example
 * // Firestore form
 * const profileForm = useProfileForm({ mode: 'firestore' })
 *
 * @example
 * // VueFire form
 * const profileForm = useProfileForm({ mode: 'vuefire' })
 *
 * @example
 * // Vuex form (legacy)
 * const profileForm = useProfileForm({ mode: 'vuex' })
 */
export const useProfileForm = (options: ProfileFormOptions = {}) => {
  const { user, updateUserProfile, getUserData } = useAuth()
  const { firestore } = useFirebaseApp()
  const userId = computed(() => user.value?.uid)

  // Initial form state
  const initialState: ProfileFormData = {
    displayName: user.value?.displayName || '',
    email: user.value?.email || '',
    bio: '',
    notificationsEnabled: true,
  }

  // Form validation rules
  const { rules } = useValidation()
  const validationRules = {
    displayName: rules.minLength(2),
    email: rules.email,
    bio: rules.maxLength(500),
  }

  // Submit handler to update user profile
  const handleProfileUpdate = async (formData: ProfileFormData) => {
    if (!user.value) return false

    try {
      // Update profile in Firebase Auth
      const result = await updateUserProfile({
        displayName: formData.displayName,
        // Other fields would go to Firestore document
      })

      if (result) {
        return {
          success: true,
          message: 'Profile updated successfully',
        }
      }

      return {
        success: false,
        message: 'Failed to update profile',
      }
    } catch (err: any) {
      console.error('Error updating profile:', err)
      return {
        success: false,
        message: err.message || 'An unexpected error occurred',
      }
    }
  }

  // Create document reference if we're using a Firestore-based mode
  const useFirestoreMode =
    options.mode === 'firestore' || options.mode === 'vuefire'
  const docRef =
    useFirestoreMode && userId.value && firestore
      ? doc(firestore, 'users', userId.value)
      : undefined

  // Build form options
  const formOptions: FormOptions<ProfileFormData> = {
    formId: options.formId || 'profile',
    initialState,
    mode: options.mode,
    validationRules,
    submitHandler: handleProfileUpdate,
    resetAfterSubmit: false,
    docRef,
    createIfNotExists: true,
  }

  // Create the form using our unified system
  const profileForm = useUnifiedForm<ProfileFormData>(formOptions)

  // Load user data for non-Firestore mode (Firestore modes load automatically)
  const loadUserData = async () => {
    if (!user.value || useFirestoreMode) return

    try {
      // Load display name from Firebase Auth
      if (user.value.displayName) {
        profileForm.formData.displayName = user.value.displayName
      }

      // Load email from Firebase Auth
      if (user.value.email) {
        profileForm.formData.email = user.value.email
      }

      // Load additional data from Firestore
      const userData = await getUserData(user.value.uid, user.value.isAnonymous)

      if (userData) {
        // Map Firestore fields to form data
        if (userData.bio) profileForm.formData.bio = userData.bio
        if (userData.notificationsEnabled !== undefined) {
          profileForm.formData.notificationsEnabled =
            userData.notificationsEnabled
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err)
    }
  }

  // Load data immediately for non-Firestore mode
  if (!useFirestoreMode) {
    loadUserData()
  }

  // Return the form with our additional methods
  return {
    ...profileForm,
    loadUserData,
    isFirestoreMode: useFirestoreMode,
  }
}
